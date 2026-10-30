"use client";

// The lead drawer (S1b, R53): the prototype's LeadDrawer, with everything the
// old full profile page could do. Every action keeps its backend call, gate
// and permission; the backend decides what each role sees (Sales: only while
// they own the lead, R8; approved student fields only). Contacting always
// goes through the outreach gate (ContactPanel).
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OutcomeBadge, ReasonDialog } from "@/components/crm/crm-ui";
import { CrmEvent, CrmFacts, CrmNote, CrmPill, CrmTimeline } from "@/components/crm/ui";
import { ContactPanel } from "@/components/crm/contact-panel";
import { TaskPanel } from "@/components/crm/task-dialogs";
import { RecordSalePanel } from "@/components/crm/bill-dialogs";
import { EarlierQuotes, EnrollWithCodeDialog, LeadSalesSection } from "@/components/crm/sales-panels";
import { Btn, Collapsible, Field, Panel, Sel, useBusy } from "@/components/crm/leads/controls";
import {
  Activity,
  CHANNEL_LABELS,
  CATEGORY,
  Channel,
  INTEREST_STAGE_LABELS,
  Interest,
  InterestStage,
  LEAD_STAGE_LABELS,
  LOST_REASONS,
  LeadDetail,
  OUTCOME_LABELS,
  PURPOSE_LABELS,
  Rep,
  TASK_TYPE_LABELS,
  crmApi,
  markerLabels,
  fmtDateTime,
  relDateTime,
  rs,
  sourceLabel,
  timeAgo,
} from "@/lib/crm/api";

type Mode =
  | { kind: "contact"; channel: Channel; interest: { _id: string; title: string } | null }
  | { kind: "task" }
  | { kind: "payment" }
  | { kind: "lost" }
  | { kind: "assign"; ownerId: string }
  | { kind: "course"; assign: boolean }
  | { kind: "guardian" }
  | { kind: "activity" }
  | { kind: "consent" }
  | null;
type ReasonAction = { title: string; description?: string; confirmLabel: string; destructive?: boolean; optional?: boolean; success: string; run: (reason: string) => Promise<unknown> } | null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LeadDrawer({ leadId, reps, courses, onClose, onChanged }: { leadId: string; reps: Rep[]; courses: { _id: string; title: string; price?: number; type?: string }[]; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setModeRaw] = useState<Mode>(null);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [salesKey, setSalesKey] = useState(0);
  const [activities, setActivities] = useState<{ items: Activity[]; page: number; total: number } | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const l = await crmApi.getLead(leadId);
      setLead(l);
      setActivities({ items: l.activities.items, page: 1, total: l.activities.pagination?.total ?? l.activities.items.length });
    } catch (e: any) {
      setError(e?.status === 404 ? "This lead doesn't exist or isn't assigned to you." : e?.message || "Could not load the lead");
    }
  }, [leadId]);
  useEffect(() => {
    setLead(null);
    setModeRaw(null);
    load();
  }, [load]);

  // Focus moves into the drawer when it opens (the opener gets it back on close, in LeadsSection).
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // A panel opens at the top of the body, one at a time.
  const setMode = (m: Mode) => {
    setModeRaw(m);
    if (m) bodyRef.current?.scrollTo({ top: 0 });
  };

  /** After any change: the drawer, the payments and quotes, and the list row. */
  const refresh = async () => {
    await load();
    setSalesKey((k) => k + 1);
    onChanged();
  };
  const fail = (e: any) => toast({ title: "Not done", description: e?.reasons?.join("; ") || e?.message, variant: "destructive" });
  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast({ title: success });
      await refresh();
    } catch (e: any) {
      fail(e);
    }
  };
  const panelDone = (success?: string) => async () => {
    setModeRaw(null);
    if (success) toast({ title: success });
    await refresh();
  };

  // Esc and the overlay close the drawer; Tab stays inside it. Dialogs opened
  // from the drawer live in a portal outside it and handle their own keys.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!drawerRef.current?.contains(e.target as Node)) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const p = lead?.person;
  const name = p?.name || "Unnamed";
  const dnc = !!lead?.doNotContact.flag;
  const lost = lead?.status === "lost";
  // R55: Sales, Admin and Super Admin record sales; the panel checks each course with the server.
  const saleBlock = lead?.kind !== "student" ? "Register the student first" : lost ? "Reopen the lead first" : null;
  const contactBlock = (channel: Channel) => (dnc ? "Do not contact is set" : lead?.channels?.[channel] === false ? `${CHANNEL_LABELS[channel]} is turned off for this lead` : !can("crm.add_activities") ? "You can't contact leads" : null);
  const moreItems: { label: string; run: () => void }[] = lead
    ? [
        ...(can("crm.assign_leads") || can("crm.reassign_leads") ? [{ label: lead.ownerId ? "Reassign" : "Assign", run: () => setMode({ kind: "assign", ownerId: lead.ownerId || "none" }) }] : []),
        ...(!dnc && can("crm.set_do_not_contact")
          ? [{ label: "Do not contact", run: () => setReasonAction({ title: "Do not contact", description: "Blocks every contact and cancels open contact tasks.", confirmLabel: "Set do not contact", destructive: true, success: "Do not contact set", run: (r) => crmApi.setDoNotContact(leadId, true, r) }) }]
          : []),
        ...(dnc && can("crm.clear_do_not_contact") ? [{ label: "Clear do not contact", run: () => setReasonAction({ title: "Allow contact again", confirmLabel: "Clear do not contact", success: "Do not contact cleared", run: (r) => crmApi.setDoNotContact(leadId, false, r) }) }] : []),
        ...(lead.kind === "student" && can("crm.enroll_with_code") ? [{ label: "Enroll with code", run: () => setCodeOpen(true) }] : []),
      ]
    : [];

  return (
    <aside ref={drawerRef} className="crm-drawer" role="dialog" aria-modal="true" aria-label={lead ? `Lead ${name}` : "Lead"} onKeyDown={onKeyDown} tabIndex={-1}>
      <div className="crm-drawer-h">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <h1 className="truncate">{lead ? name : "Lead"}</h1>
            {lead && <span className="crm-muted crm-small">{[p?.grade ? `Grade ${p.grade}` : null, lead.displayCourseTitle].filter(Boolean).join(" · ") || "No course yet"}</span>}
          </div>
          <button ref={closeRef} type="button" className="crm-btn sm" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {lead && (
          <>
            <div className="crm-actions">
              <CrmPill tone={CATEGORY[lead.category]?.tone}>{CATEGORY[lead.category]?.label ?? lead.category}</CrmPill>
              {lost && lead.lostReason && <span className="crm-muted crm-small">{lead.lostReason}</span>}
              {markerLabels(lead.markers).map((m) => (
                <CrmPill key={m}>{m}</CrmPill>
              ))}
              {dnc && <CrmPill tone="bad">Do not contact</CrmPill>}
              {lead.kind === "prospect" && <CrmPill>Prospect</CrmPill>}
              <span className="crm-muted crm-small">Contact stage: {LEAD_STAGE_LABELS[lead.stage]}</span>
            </div>
            <div className="crm-actions">
              {lost ? (
                <>
                  {can("crm.edit_leads") && (
                    <Btn sm onClick={() => setReasonAction({ title: "Reopen lead", confirmLabel: "Reopen", optional: true, success: "Lead reopened", run: (r) => crmApi.reopenLead(leadId, r || "reopened by hand") })}>
                      Reopen lead
                    </Btn>
                  )}
                  {can("crm.record_payments") && (
                    <Btn sm disabledReason={saleBlock}>
                      Record sale
                    </Btn>
                  )}
                </>
              ) : (
                <>
                  <Btn sm tone="primary" disabledReason={contactBlock("call")} onClick={() => setMode({ kind: "contact", channel: "call", interest: null })}>
                    Log call
                  </Btn>
                  {can("crm.manage_tasks") && (
                    <Btn sm onClick={() => setMode({ kind: "task" })}>
                      Schedule follow-up
                    </Btn>
                  )}
                  {can("crm.record_payments") && (
                    <Btn sm disabledReason={saleBlock} onClick={() => setMode({ kind: "payment" })}>
                      Record sale
                    </Btn>
                  )}
                  <Btn sm disabledReason={contactBlock("whatsapp")} onClick={() => setMode({ kind: "contact", channel: "whatsapp", interest: null })}>
                    WhatsApp
                  </Btn>
                  {can("crm.edit_leads") && (
                    <Btn sm tone="danger" onClick={() => setMode({ kind: "lost" })}>
                      Mark lost
                    </Btn>
                  )}
                </>
              )}
              {moreItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="crm-btn sm" aria-label="More actions">
                      ⋯ More
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {moreItems.map((m) => (
                      <DropdownMenuItem key={m.label} onSelect={m.run}>
                        {m.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        )}
      </div>

      <div ref={bodyRef} className="crm-drawer-b">
        {error ? (
          <div className="crm-empty flex flex-col items-center gap-3" role="alert">
            <span className="crm-late">{error}</span>
            <button type="button" className="crm-btn sm" onClick={load}>
              Try again
            </button>
          </div>
        ) : !lead ? (
          <div className="crm-empty flex items-center justify-center gap-2" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {mode?.kind === "contact" && <ContactPanel key={`${mode.channel}-${mode.interest?._id ?? ""}`} leadId={leadId} interest={mode.interest} initialChannel={mode.channel} onDone={panelDone()} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "task" && <TaskPanel leadId={leadId} interests={lead.interests} onCreated={panelDone("Follow-up scheduled")} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "payment" && <RecordSalePanel leadId={leadId} interests={lead.interests} courses={courses} onDone={panelDone()} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "lost" && <LostPanel lead={lead} onCoursesClick={() => coursesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} onDone={panelDone("Lead marked lost")} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "assign" && <AssignPanel lead={lead} reps={reps} initialOwnerId={mode.ownerId} onDone={panelDone()} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "course" && <CoursePanel leadId={leadId} assign={mode.assign} courses={courses} onDone={panelDone(mode.assign ? "Course assigned, payment pending" : "Course added")} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "guardian" && <GuardianPanel lead={lead} onDone={panelDone("Guardian saved")} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "activity" && <ActivityPanel leadId={leadId} interests={lead.interests} onDone={panelDone("Activity logged")} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "consent" && <ConsentPanel leadId={leadId} onDone={panelDone("Consent recorded")} onCancel={() => setModeRaw(null)} />}

            <CrmFacts
              items={[
                { label: "Student phone", value: p?.phone || "—" },
                { label: "Guardian", value: <GuardianFact lead={lead} canEdit={can("crm.edit_leads")} onEdit={() => setMode({ kind: "guardian" })} /> },
                { label: "Email", value: p?.email || "—" },
                { label: "School", value: p?.school || "—" },
                { label: "District", value: p?.district || "—" },
                ...(isAdmin ? [{ label: "Source", value: sourceLabel(lead) }, { label: "Added", value: fmtDateTime(lead.createdAt) }] : []),
                { label: "Last contact", value: lead.lastContactAt ? relDateTime(lead.lastContactAt) : "Not contacted yet" },
                {
                  label: "Owner",
                  value:
                    can("crm.assign_leads") || can("crm.reassign_leads") ? (
                      <select
                        className="crm-input"
                        aria-label="Owner"
                        value={lead.ownerId || "none"}
                        onChange={(e) => e.target.value !== (lead.ownerId || "none") && setMode({ kind: "assign", ownerId: e.target.value })}
                      >
                        <option value="none">Unassigned</option>
                        {reps
                          .filter((r) => r.status === "active" || r._id === lead.ownerId)
                          .map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.name}
                            </option>
                          ))}
                        {lead.ownerId && !reps.some((r) => r._id === lead.ownerId) && <option value={lead.ownerId}>{lead.ownerName || "Current owner"}</option>}
                      </select>
                    ) : (
                      lead.ownerName || "Unassigned"
                    ),
                },
              ]}
            />

            {!lost && (
              <div className="crm-form">
                <Field label="Stage">
                  <Sel
                    value={lead.stage}
                    disabled={!can("crm.edit_leads")}
                    onChange={(e) => act(() => crmApi.updateLead(leadId, { stage: e.target.value }), "Stage updated")}
                    options={Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                </Field>
                <Field label="Priority">
                  <Sel
                    value={lead.priority}
                    disabled={!can("crm.edit_leads")}
                    onChange={(e) => act(() => crmApi.updateLead(leadId, { priority: e.target.value }), "Priority updated")}
                    options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]}
                  />
                </Field>
                <span className="crm-muted crm-small crm-full" style={{ fontWeight: 400 }}>
                  Course stages are below. Payment pending and Won are set automatically.
                </span>
              </div>
            )}

            <CoursesSection
              sectionRef={coursesRef}
              lead={lead}
              act={act}
              ask={setReasonAction}
              onContact={(i) => setMode({ kind: "contact", channel: "call", interest: { _id: i._id, title: i.title } })}
              onAdd={(assign) => setMode({ kind: "course", assign })}
              contactBlocked={contactBlock("call")}
            />

            <FollowUps lead={lead} act={act} ask={setReasonAction} />

            <LeadSalesSection leadId={leadId} refreshKey={salesKey} />

            <section>
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h3 className="crm-sec-h" style={{ margin: 0 }}>
                  Activity
                </h3>
                {can("crm.add_activities") && (
                  <button type="button" className="crm-btn sm" onClick={() => setMode({ kind: "activity" })}>
                    Log activity
                  </button>
                )}
              </div>
              {!activities || activities.items.length === 0 ? (
                <p className="crm-muted crm-small">No activity yet.</p>
              ) : (
                <>
                  <CrmTimeline>
                    {activities.items.map((a) => (
                      <CrmEvent key={a._id} tone={activityTone(a)}>
                        <div>
                          {activityTitle(a)}
                          {a.policyException && (
                            <>
                              {" "}
                              <CrmPill tone="bad">Policy exception</CrmPill>
                            </>
                          )}
                          {a.correctsActivityId && (
                            <>
                              {" "}
                              <CrmPill>Correction</CrmPill>
                            </>
                          )}
                        </div>
                        {a.summary && <div className="whitespace-pre-wrap">{a.summary}</div>}
                        {a.basis && <span className="crm-sub">Because of a {a.basis.signalType.replace(/_/g, " ")} on {fmtDateTime(a.basis.signalAt)}</span>}
                        <span className="crm-muted crm-small">
                          {a.actorName} · {relDateTime(a.occurredAt)}
                        </span>
                      </CrmEvent>
                    ))}
                  </CrmTimeline>
                  {activities.items.length < activities.total && (
                    <button
                      type="button"
                      className="crm-btn sm"
                      onClick={() =>
                        crmApi.activities(leadId, activities.page + 1).then(
                          (r) => setActivities((s) => (s ? { items: [...s.items, ...r.items.filter((x) => !s.items.some((y) => y._id === x._id))], page: s.page + 1, total: r.pagination.total } : s)),
                          fail
                        )
                      }
                    >
                      Load more
                    </button>
                  )}
                </>
              )}
            </section>

            <Collapsible title="Enrollment">
              <EnrollmentBody lead={lead} canCancel={can("enrollments.cancel_pending")} ask={setReasonAction} />
            </Collapsible>
            <Collapsible
              title="Contact preferences"
              aside={
                can("crm.add_activities") && (
                  <button type="button" className="crm-btn sm" onClick={() => setMode({ kind: "consent" })}>
                    Record consent
                  </button>
                )
              }
            >
              <ContactPreferences lead={lead} canDisable={can("crm.set_do_not_contact")} canEnable={can("crm.clear_do_not_contact")} ask={setReasonAction} />
            </Collapsible>
            <Collapsible title="Past follow-ups">
              <PastFollowUps lead={lead} />
            </Collapsible>
            <EarlierQuotes leadId={leadId} interests={lead.interests}>
              {(list) => <Collapsible title="Earlier quotes (no longer used)">{list}</Collapsible>}
            </EarlierQuotes>
            {isAdmin && (
              <Collapsible title="History">
                <HistoryBody lead={lead} />
              </Collapsible>
            )}
          </>
        )}
      </div>

      {reasonAction && (
        <ReasonDialog
          open={!!reasonAction}
          onOpenChange={(v) => !v && setReasonAction(null)}
          title={reasonAction.title}
          description={reasonAction.description}
          confirmLabel={reasonAction.confirmLabel}
          destructive={reasonAction.destructive}
          optional={reasonAction.optional}
          onConfirm={async (r) => {
            try {
              await reasonAction.run(r);
            } catch (e) {
              fail(e);
              throw e;
            }
            toast({ title: reasonAction.success });
            await refresh();
          }}
        />
      )}
      <EnrollWithCodeDialog leadId={leadId} open={codeOpen} onOpenChange={setCodeOpen} onDone={() => { toast({ title: "Enrolled with the code" }); refresh(); }} />
    </aside>
  );
}

// ---------- facts ----------

function GuardianFact({ lead, canEdit, onEdit }: { lead: LeadDetail; canEdit: boolean; onEdit: () => void }) {
  const p = lead.person;
  // R40: a linked parent account is shown read-only and the guardian fields are hidden.
  if (p?.linkedParents?.length || p?.linkedParent) {
    const parents = p.linkedParents?.length ? p.linkedParents : [p.linkedParent!];
    return (
      <>
        {parents.map((x, i) => (
          <span key={i} className="block">
            {[x.name, x.phone].filter(Boolean).join(" · ") || "—"}
          </span>
        ))}
        <span className="crm-sub">Linked parent account</span>
      </>
    );
  }
  const text = [p?.guardianName, p?.guardianPhone].filter(Boolean).join(" · ");
  return (
    <>
      {text || "—"}{" "}
      {canEdit && lead.status !== "lost" && (
        <button type="button" className="crm-link crm-small" onClick={onEdit}>
          {text ? "Edit" : "Add"}
        </button>
      )}
    </>
  );
}

// ---------- body sections ----------

function CoursesSection({
  sectionRef,
  lead,
  act,
  ask,
  onContact,
  onAdd,
  contactBlocked,
}: {
  sectionRef: React.RefObject<HTMLElement>;
  lead: LeadDetail;
  act: (fn: () => Promise<unknown>, success: string) => Promise<void>;
  ask: (a: ReasonAction) => void;
  onContact: (i: Interest) => void;
  onAdd: (assign: boolean) => void;
  contactBlocked: string | null;
}) {
  const { can } = useAdmin();
  const latestByCourse = new Map<string, Interest>();
  for (const i of lead.interests) {
    const prev = latestByCourse.get(i.courseId);
    if (!prev || (prev.status === "closed" && (i.status === "open" || new Date(i.closedAt || 0) > new Date(prev.closedAt || 0)))) latestByCourse.set(i.courseId, i);
  }
  const managePipeline = can("crm.manage_pipeline");
  return (
    <section ref={sectionRef}>
      <h3 className="crm-sec-h">Courses</h3>
      {lead.interests.length === 0 ? (
        <p className="crm-muted crm-small">No course opportunities yet.</p>
      ) : (
        <div className="crm-list">
          {lead.interests.map((i) => (
            <div key={i._id} className="crm-li" style={i.status === "closed" ? { opacity: 0.85 } : undefined}>
              <div className="crm-who">
                <b>{i.title}</b> {i.status === "open" ? <CrmPill tone={i.stage === "payment_pending" ? "warn" : "accent"}>{INTEREST_STAGE_LABELS[i.stage]}</CrmPill> : <OutcomeBadge outcome={i.outcome} lostReason={i.lostReason} />}
                {i.enrolled && (
                  <>
                    {" "}
                    <CrmPill tone="good">Enrolled</CrmPill>
                  </>
                )}
                {i.reopenedFromInterestId && (
                  <>
                    {" "}
                    <CrmPill>Reopened</CrmPill>
                  </>
                )}
                <span className="crm-sub">
                  List price {rs(i.listPrice)} · viewed {timeAgo(i.signals?.lastViewedAt)}
                  {i.signals?.lastCheckoutAt ? ` · checkout ${timeAgo(i.signals.lastCheckoutAt)}` : ""}
                  {i.closedAt ? ` · closed ${fmtDateTime(i.closedAt)}` : ""}
                </span>
              </div>
              {i.status === "open" ? (
                <div className="crm-actions">
                  {managePipeline && (
                    <select
                      className="crm-input"
                      style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                      aria-label={`Stage of ${i.title}`}
                      value={i.stage}
                      onChange={(e) => act(() => crmApi.setStage(i._id, e.target.value as InterestStage, i.stage), "Course stage updated")}
                    >
                      {(Object.keys(INTEREST_STAGE_LABELS) as InterestStage[])
                        .filter((s) => s !== "quoted" || i.stage === "quoted") // R54: no new moves to quoted
                        .map((s) => (
                          <option key={s} value={s}>
                            {INTEREST_STAGE_LABELS[s]}
                          </option>
                        ))}
                    </select>
                  )}
                  <Btn sm disabledReason={contactBlocked} onClick={() => onContact(i)}>
                    Contact
                  </Btn>
                  {managePipeline && (
                    <Btn sm tone="danger" onClick={() => ask({ title: `Close ${i.title} as lost`, confirmLabel: "Mark lost", destructive: true, success: "Course closed as lost", run: (r) => crmApi.interestLost(i._id, r) })}>
                      Lost
                    </Btn>
                  )}
                </div>
              ) : (
                i.outcome === "lost" &&
                managePipeline &&
                latestByCourse.get(i.courseId)?._id === i._id && (
                  <div className="crm-actions">
                    <Btn sm onClick={() => ask({ title: `Reopen ${i.title}`, description: "A new opportunity is opened; this one stays in history.", confirmLabel: "Reopen", optional: true, success: "Course reopened", run: (r) => crmApi.interestReopen(i._id, r || "reopened by hand") })}>
                      Reopen
                    </Btn>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
      <div className="crm-actions mt-2">
        {managePipeline && (
          <button type="button" className="crm-btn sm" onClick={() => onAdd(false)}>
            + Add course
          </button>
        )}
        {lead.kind === "student" && can("enrollments.assign_pending") && (
          <button type="button" className="crm-btn sm" onClick={() => onAdd(true)}>
            Assign course (payment pending)
          </button>
        )}
      </div>
    </section>
  );
}

function FollowUps({ lead, act, ask }: { lead: LeadDetail; act: (fn: () => Promise<unknown>, success: string) => Promise<void>; ask: (a: ReasonAction) => void }) {
  const { can } = useAdmin();
  const [doneId, setDoneId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");
  const open = lead.tasks.filter((t) => t.status === "open").sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  if (open.length === 0) return null;
  const manage = can("crm.manage_tasks");
  return (
    <section>
      <h3 className="crm-sec-h">Open follow-ups</h3>
      <div className="crm-list">
        {open.map((t) => {
          const overdue = new Date(t.dueAt) < new Date();
          return (
            <div key={t._id} className="crm-li">
              <div className="crm-who">
                <b>{TASK_TYPE_LABELS[t.type] || t.type}</b>
                {t.purpose && <span className="crm-muted crm-small"> · {PURPOSE_LABELS[t.purpose]}</span>}
                {t.notes && <span className="crm-muted crm-small"> · {t.notes}</span>}
                <span className={`crm-sub ${overdue ? "crm-late" : ""}`}>
                  {relDateTime(t.dueAt)}
                  {t.assigneeName && lead.ownerName !== t.assigneeName ? ` · ${t.assigneeName}` : ""}
                </span>
              </div>
              {manage &&
                (doneId === t._id ? (
                  <form
                    className="crm-actions"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!outcome.trim()) return;
                      act(() => crmApi.completeTask(t._id, outcome.trim()), "Follow-up done").then(() => setDoneId(null));
                    }}
                  >
                    <input className="crm-input" style={{ width: 200 }} placeholder="Outcome, e.g. will pay Friday" aria-label="Outcome" value={outcome} maxLength={100} onChange={(e) => setOutcome(e.target.value)} autoFocus required />
                    <Btn sm tone="good" type="submit" disabled={!outcome.trim()}>
                      Save
                    </Btn>
                    <Btn sm onClick={() => setDoneId(null)}>
                      Cancel
                    </Btn>
                  </form>
                ) : (
                  <div className="crm-actions">
                    <Btn
                      sm
                      tone="good"
                      onClick={() => {
                        setDoneId(t._id);
                        setOutcome("");
                      }}
                    >
                      Done
                    </Btn>
                    <Btn sm onClick={() => act(() => crmApi.rescheduleTask(t._id, new Date(Math.max(Date.now(), new Date(t.dueAt).getTime()) + 86_400_000).toISOString(), "Moved by 1 day", t.dueAt), "Moved by 1 day")}>
                      +1 day
                    </Btn>
                    <Btn sm onClick={() => ask({ title: "Cancel follow-up", confirmLabel: "Cancel follow-up", destructive: true, success: "Follow-up cancelled", run: (r) => crmApi.cancelTask(t._id, r) })}>
                      Cancel
                    </Btn>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PastFollowUps({ lead }: { lead: LeadDetail }) {
  const past = lead.tasks.filter((t) => t.status !== "open");
  if (past.length === 0) return <p className="crm-muted crm-small">None yet.</p>;
  return (
    <div className="crm-list">
      {past.map((t) => (
        <div key={t._id} className="crm-li">
          <div className="crm-who">
            <b>{TASK_TYPE_LABELS[t.type] || t.type}</b> <CrmPill tone={t.status === "completed" ? "good" : "neutral"}>{t.status === "completed" ? "Done" : "Cancelled"}</CrmPill>
            <span className="crm-sub">
              Due {fmtDateTime(t.dueAt)} · {t.assigneeName || "Unassigned"}
              {t.rescheduleHistory && t.rescheduleHistory.length > 0 ? ` · rescheduled ${t.rescheduleHistory.length}×` : ""}
            </span>
            {t.notes && <span className="crm-sub">{t.notes}</span>}
            {t.outcome && <span className="crm-sub">Outcome: {t.outcome}</span>}
            {t.cancelReason && <span className="crm-sub">Cancelled: {t.cancelReason}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function EnrollmentBody({ lead, canCancel, ask }: { lead: LeadDetail; canCancel: boolean; ask: (a: ReasonAction) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="crm-facts-label">Enrolled courses</div>
        {lead.enrollment.enrolledCourses.length === 0 ? <p className="crm-muted crm-small">None</p> : <div className="crm-list">{lead.enrollment.enrolledCourses.map((c) => <div key={c.courseId} className="crm-li">{c.title}</div>)}</div>}
      </div>
      <div>
        <div className="crm-facts-label">Assigned, payment pending</div>
        {lead.enrollment.pendingCourseAssignments.length === 0 ? (
          <p className="crm-muted crm-small">None</p>
        ) : (
          <div className="crm-list">
            {lead.enrollment.pendingCourseAssignments.map((a) => (
              <div key={a._id} className="crm-li">
                <div className="crm-who">
                  {a.title} <span className="crm-sub">Assigned {fmtDateTime(a.assignedAt)}</span>
                </div>
                {a.fromThisLead && canCancel && (
                  <Btn sm onClick={() => ask({ title: "Cancel course assignment", confirmLabel: "Cancel assignment", destructive: true, success: "Course assignment cancelled", run: (r) => crmApi.cancelCourseAssignment(a._id, r) })}>
                    Cancel
                  </Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactPreferences({ lead, canDisable, canEnable, ask }: { lead: LeadDetail; canDisable: boolean; canEnable: boolean; ask: (a: ReasonAction) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="crm-muted crm-small">Turning a channel off blocks it at once and cancels open tasks on it. Only an Admin can turn it back on.</p>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => {
          const on = lead.channels?.[c] !== false;
          return (
            <div key={c} className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={CHANNEL_LABELS[c]}
                className={`crm-switch ${on ? "on" : ""}`}
                disabled={on ? !canDisable : !canEnable}
                onClick={() =>
                  ask({
                    title: `${on ? "Turn off" : "Allow"} ${CHANNEL_LABELS[c]}`,
                    confirmLabel: on ? "Turn off" : "Allow",
                    destructive: on,
                    success: `${CHANNEL_LABELS[c]} ${on ? "turned off" : "allowed"}`,
                    run: (r) => crmApi.setChannel(lead._id, c, !on, r),
                  })
                }
              />
              <span>{CHANNEL_LABELS[c]}</span>
            </div>
          );
        })}
      </div>
      <div>
        <div className="crm-facts-label">Consent records</div>
        {lead.consent.length === 0 ? (
          <p className="crm-muted crm-small">None recorded. Marketing needs consent granted for that channel.</p>
        ) : (
          <div className="crm-list">
            {lead.consent
              .slice()
              .reverse()
              .map((c, idx) => (
                <div key={idx} className="crm-li">
                  <div className="crm-who">
                    {PURPOSE_LABELS[c.purpose as keyof typeof PURPOSE_LABELS] ?? c.purpose} · {CHANNEL_LABELS[c.channel]}: <b>{c.status}</b>
                    <span className="crm-sub">
                      {c.source ? `${c.source} · ` : ""}
                      {fmtDateTime(c.at)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryBody({ lead }: { lead: LeadDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="crm-facts-label">Ownership</div>
        <p className="crm-muted crm-small">
          {lead.createdByName ? `Created by ${lead.createdByName}` : `Created from ${sourceLabel(lead).toLowerCase()}`} · {fmtDateTime(lead.createdAt)}
        </p>
        {(lead.assignmentHistory || []).length === 0 ? (
          <p className="crm-muted crm-small">Never assigned.</p>
        ) : (
          <div className="crm-list">
            {lead.assignmentHistory!.map((h, idx) => (
              <div key={idx} className="crm-li">
                <div className="crm-who">
                  {h.from || "Unassigned"} → {h.to || "Unassigned"}
                  <span className="crm-sub">
                    by {h.by}, {h.method.replace(/_/g, " ")}, {fmtDateTime(h.at)}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="crm-facts-label">Status changes</div>
        {(lead.statusHistory || []).length === 0 ? (
          <p className="crm-muted crm-small">No changes.</p>
        ) : (
          <div className="crm-list">
            {lead.statusHistory!.map((h, idx) => (
              <div key={idx} className="crm-li">
                <div className="crm-who">
                  {h.from} → {h.to}
                  <span className="crm-sub">
                    {fmtDateTime(h.at)}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- panels ----------

function LostPanel({ lead, onCoursesClick, onDone, onCancel }: { lead: LeadDetail; onCoursesClick: () => void; onDone: () => void; onCancel: () => void }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [detail, setDetail] = useState("");
  const { busy, error, run } = useBusy();
  const open = lead.interests.filter((i) => i.status === "open");
  if (open.length > 0) {
    return (
      <Panel title="Mark as lost" onCancel={onCancel}>
        <CrmNote tone="bad">Close its open courses first. Each course needs its own outcome.</CrmNote>
        <div className="crm-list">
          {open.map((i) => (
            <div key={i._id} className="crm-li">
              <div className="crm-who">
                <b>{i.title}</b> <span className="crm-muted crm-small">· {INTEREST_STAGE_LABELS[i.stage]}</span>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="crm-link crm-small self-start" onClick={onCoursesClick}>
          Go to Courses
        </button>
      </Panel>
    );
  }
  const full = reason === "Other" ? detail.trim() : detail.trim() ? `${reason}: ${detail.trim()}` : reason;
  return (
    <Panel title="Mark as lost" submitLabel="Mark lost" onCancel={onCancel} busy={busy} error={error} canSubmit={!!full} onSubmit={() => run(async () => { await crmApi.markLost(lead._id, full); onDone(); })}>
      <div className="crm-form">
        <Field label="Reason" full>
          <Sel value={reason} onChange={(e) => setReason(e.target.value)} options={LOST_REASONS.map((r) => ({ value: r, label: r }))} />
        </Field>
        <Field label={reason === "Other" ? "Reason in your words" : "Details (optional)"} full>
          <input className="crm-input" value={detail} maxLength={400} onChange={(e) => setDetail(e.target.value)} required={reason === "Other"} />
        </Field>
      </div>
      <span className="crm-muted crm-small">Every open follow-up on this lead is cancelled. Reopening later does not restore them.</span>
    </Panel>
  );
}

function AssignPanel({ lead, reps, initialOwnerId, onDone, onCancel }: { lead: LeadDetail; reps: Rep[]; initialOwnerId: string; onDone: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [target, setTarget] = useState(initialOwnerId);
  const [reason, setReason] = useState("");
  const { busy, error, run } = useBusy();
  const changed = target !== (lead.ownerId || "none");
  return (
    <Panel
      title={lead.ownerId ? "Reassign lead" : "Assign lead"}
      submitLabel="Assign"
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={changed}
      onSubmit={() =>
        run(async () => {
          const ownerId = target === "none" ? null : target;
          await crmApi.assign(lead._id, ownerId, reason.trim() || undefined);
          toast({ title: ownerId ? "Lead assigned" : "Lead unassigned" });
          onDone();
        })
      }
    >
      <div className="crm-form">
        <Field label="Owner">
          <Sel value={target} onChange={(e) => setTarget(e.target.value)} options={[{ value: "none", label: "Unassigned" }, ...reps.filter((r) => r.status === "active").map((r) => ({ value: r._id, label: r.name }))]} />
        </Field>
        <Field label="Reason (optional)">
          <input className="crm-input" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <span className="crm-muted crm-small">The previous owner loses access at once; open follow-ups move to the new owner.</span>
    </Panel>
  );
}

function CoursePanel({ leadId, assign, courses, onDone, onCancel }: { leadId: string; assign: boolean; courses: { _id: string; title: string; price?: number }[]; onDone: () => void; onCancel: () => void }) {
  const [courseId, setCourseId] = useState("");
  const [note, setNote] = useState("");
  const { busy, error, run } = useBusy();
  return (
    <Panel
      title={assign ? "Assign course (payment pending)" : "Add course"}
      submitLabel={assign ? "Assign" : "Add course"}
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={!!courseId}
      onSubmit={() =>
        run(async () => {
          if (assign) await crmApi.assignCourse(leadId, courseId, note.trim() || undefined);
          else await crmApi.addInterest(leadId, courseId);
          onDone();
        })
      }
    >
      <div className="crm-form">
        <Field label="Course" full>
          <Sel value={courseId} onChange={(e) => setCourseId(e.target.value)} options={[{ value: "", label: "Choose a course" }, ...courses.map((c) => ({ value: c._id, label: `${c.title}${c.price ? ` · ${rs(c.price)}` : ""}` }))]} />
        </Field>
        {assign && (
          <Field label="Note (optional)" full>
            <input className="crm-input" placeholder="e.g. pays on Friday" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
      </div>
      <span className="crm-muted crm-small">{assign ? "The student gets no access, and nothing counts as a sale, until their payment is verified." : "Track the student's interest in another course."}</span>
    </Panel>
  );
}

function GuardianPanel({ lead, onDone, onCancel }: { lead: LeadDetail; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(lead.person?.guardianName || "");
  const [phone, setPhone] = useState(lead.person?.guardianPhone || "");
  const { busy, error, run } = useBusy();
  return (
    <Panel title="Guardian" submitLabel="Save" onCancel={onCancel} busy={busy} error={error} onSubmit={() => run(async () => { await crmApi.updateLead(lead._id, { guardianName: name.trim() || null, guardianPhone: phone.trim() || null }); onDone(); })}>
      <div className="crm-form">
        <Field label="Guardian name">
          <input className="crm-input" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Guardian phone">
          <input className="crm-input" inputMode="numeric" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
    </Panel>
  );
}

function ActivityPanel({ leadId, interests, onDone, onCancel }: { leadId: string; interests: Interest[]; onDone: () => void; onCancel: () => void }) {
  const [type, setType] = useState("note");
  const [direction, setDirection] = useState("inbound");
  const [channel, setChannel] = useState("whatsapp");
  const [summary, setSummary] = useState("");
  const [interestId, setInterestId] = useState("none");
  const [exceptionReason, setExceptionReason] = useState("");
  const [needsException, setNeedsException] = useState<string | null>(null);
  const { busy, error, setError, run } = useBusy();
  const isContact = ["call", "whatsapp", "sms", "email"].includes(type);
  const open = interests.filter((i) => i.status === "open");
  const submit = () =>
    run(async () => {
      try {
        await crmApi.logActivity(leadId, {
          type,
          summary: summary.trim() || undefined,
          direction: isContact ? direction : undefined,
          channel: type === "enquiry" ? channel : undefined,
          interestId: interestId === "none" ? undefined : interestId,
          policyExceptionReason: needsException ? exceptionReason.trim() : undefined,
        });
        onDone();
      } catch (e: any) {
        if (e?.code === "POLICY_EXCEPTION_REQUIRED") {
          setNeedsException(e.message);
          setError(null);
          return;
        }
        throw e;
      }
    });
  return (
    <Panel title="Log activity" submitLabel="Save" onCancel={onCancel} busy={busy} error={error} canSubmit={needsException === null || !!exceptionReason.trim()} onSubmit={submit}>
      <span className="crm-muted crm-small">Record something that already happened. This never contacts anyone; to contact someone, use Log call or WhatsApp.</span>
      <div className="crm-form">
        <Field label="Type">
          <Sel
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: "note", label: "Note" },
              { value: "enquiry", label: "Enquiry from the person" },
              { value: "call", label: "Call" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "sms", label: "SMS" },
              { value: "email", label: "Email" },
              { value: "meeting", label: "Meeting" },
            ]}
          />
        </Field>
        {isContact && (
          <Field label="Direction">
            <Sel value={direction} onChange={(e) => setDirection(e.target.value)} options={[{ value: "inbound", label: "They contacted us" }, { value: "outbound", label: "We contacted them" }]} />
          </Field>
        )}
        {type === "enquiry" && (
          <Field label="How">
            <Sel
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              options={[
                { value: "call", label: "Call" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "sms", label: "SMS" },
                { value: "email", label: "Email" },
                { value: "in_person", label: "In person" },
              ]}
            />
          </Field>
        )}
        <Field label="Course">
          <Sel value={interestId} onChange={(e) => setInterestId(e.target.value)} options={[{ value: "none", label: "Not about one course" }, ...open.map((i) => ({ value: i._id, label: i.title }))]} />
        </Field>
        <Field label="What happened" full>
          <textarea className="crm-input" value={summary} maxLength={2000} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        {needsException && (
          <div className="crm-full flex flex-col gap-2 rounded-[10px] bg-[var(--crm-bad-soft)] p-3">
            <span className="crm-late crm-small">{needsException}</span>
            <Field label="Reason (recorded as a policy exception and audited)">
              <input className="crm-input" value={exceptionReason} maxLength={500} onChange={(e) => setExceptionReason(e.target.value)} />
            </Field>
          </div>
        )}
      </div>
    </Panel>
  );
}

function ConsentPanel({ leadId, onDone, onCancel }: { leadId: string; onDone: () => void; onCancel: () => void }) {
  const [purpose, setPurpose] = useState("marketing");
  const [channel, setChannel] = useState<Channel>("call");
  const [status, setStatus] = useState<"granted" | "withdrawn">("granted");
  const [source, setSource] = useState("phone_call");
  const { busy, error, run } = useBusy();
  return (
    <Panel title="Record consent" submitLabel="Save" onCancel={onCancel} busy={busy} error={error} onSubmit={() => run(async () => { await crmApi.recordConsent(leadId, { purpose, channel, status, source }); onDone(); })}>
      <span className="crm-muted crm-small">Only record what the person actually said. A withdrawal cancels matching open contact tasks.</span>
      <div className="crm-form">
        <Field label="Purpose">
          <Sel value={purpose} onChange={(e) => setPurpose(e.target.value)} options={[{ value: "marketing", label: "Marketing" }, { value: "purchase_assistance", label: "Help with a course" }]} />
        </Field>
        <Field label="Channel">
          <Sel value={channel} onChange={(e) => setChannel(e.target.value as Channel)} options={(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))} />
        </Field>
        <Field label="Status">
          <Sel value={status} onChange={(e) => setStatus(e.target.value as "granted" | "withdrawn")} options={[{ value: "granted", label: "Granted" }, { value: "withdrawn", label: "Withdrawn" }]} />
        </Field>
        <Field label="How">
          <input className="crm-input" value={source} maxLength={100} onChange={(e) => setSource(e.target.value)} />
        </Field>
      </div>
    </Panel>
  );
}

// ---------- activity helpers ----------

function activityTitle(a: Activity) {
  if (a.type === "outreach_started") return `${a.channel ? CHANNEL_LABELS[a.channel as Channel] ?? a.channel : "Contact"} started${a.purpose ? ` (${PURPOSE_LABELS[a.purpose]})` : ""}`;
  if (a.type === "outreach_outcome") return `Outcome: ${OUTCOME_LABELS[a.outcome || ""] || a.outcome}`;
  if (a.type === "enquiry") return `Enquiry by ${a.channel}`;
  if (["call", "whatsapp", "sms", "email"].includes(a.type)) return `${CHANNEL_LABELS[a.type as Channel]} (${a.direction})`;
  return a.type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// Timeline dot colour (S1): successful contact green, policy exceptions and
// losses red, system events grey, everything else accent.
function activityTone(a: Activity): "good" | "bad" | "muted" | undefined {
  if (a.policyException) return "bad";
  if (a.type === "outreach_outcome") return a.outcome === "connected" || a.outcome === "message_sent" ? "good" : a.outcome === "asked_not_to_contact" || a.outcome === "wrong_number" ? "bad" : "muted";
  if (/lost|invalidated|do_not_contact/.test(a.type)) return "bad";
  if (/won|payment|enrolled/.test(a.type)) return "good";
  if (["note", "call", "whatsapp", "sms", "email", "meeting", "enquiry", "outreach_started"].includes(a.type)) return undefined;
  return "muted";
}
