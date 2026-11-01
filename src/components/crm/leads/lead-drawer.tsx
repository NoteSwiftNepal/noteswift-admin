"use client";

// The lead drawer (S8: exactly the prototype's LeadDrawer, R65). Header: the
// stage pill is the stage dropdown (R70, S9; options from the server's
// stageOptions) and the actions Log call · Schedule follow-up · Record sale
// (R64) · WhatsApp · Mark lost (and Assign for Admin); for a Lost lead only
// Reopen. Body: the chosen panel, facts, the Courses block, open follow-ups,
// sales and the activity timeline. The contact gate, Do not contact and
// Admin assignment stay because approved rules need them. Every action keeps
// its backend call and permission; the backend decides what each role sees.
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { ReasonDialog } from "@/components/crm/crm-ui";
import { CrmEvent, CrmFacts, CrmPill, CrmTimeline } from "@/components/crm/ui";
import { ContactPanel } from "@/components/crm/contact-panel";
import { TaskPanel } from "@/components/crm/task-dialogs";
import { PostpaidPaymentPanel, RecordSalePanel } from "@/components/crm/bill-dialogs";
import { LeadSalesSection } from "@/components/crm/sales-panels";
import { Btn, Field, Panel, Sel, useBusy } from "@/components/crm/leads/controls";
import { Activity, BillType, CHANNEL_LABELS, Channel, LEAD_COURSE_STATE, LOST_REASONS, LeadDetail, OUTCOME_LABELS, PURPOSE_LABELS, Rep, STAGE, Stage, TASK_TYPE_LABELS, crmApi, fmtDateTime, relDateTime, sourceLabel } from "@/lib/crm/api";
import { StageMenu } from "@/components/crm/leads/stage-menu";

type Mode =
  | { kind: "contact"; channel: Channel }
  | { kind: "task" }
  | { kind: "contactStage"; to: "new_lead" | "contacted" }
  | { kind: "interested" }
  | { kind: "sale"; courseId?: string; billType?: BillType }
  | { kind: "postpaidPayment" }
  | { kind: "lost" }
  | { kind: "assign"; ownerId: string }
  | null;
type CatalogCourse = { _id: string; title: string; price?: number; type?: string };
type ReasonAction = { title: string; description?: string; confirmLabel: string; destructive?: boolean; optional?: boolean; success: string; run: (reason: string) => Promise<unknown> } | null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// R64: Record sale shows on registered students in these stages (Payment
// pending only when no sale is waiting: an assignment waits for its payment).
const SALE_STAGES = ["new_lead", "contacted", "interested", "enrolled", "payment_pending"];

export function LeadDrawer({ leadId, reps, courses, onClose, onChanged }: { leadId: string; reps: Rep[]; courses: { _id: string; title: string; price?: number; type?: string }[]; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const canAssign = can("crm.assign_leads") || can("crm.reassign_leads");
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setModeRaw] = useState<Mode>(null);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [salesKey, setSalesKey] = useState(0);
  const [activities, setActivities] = useState<{ items: Activity[]; page: number; total: number } | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // A panel opens at the top of the body, one at a time.
  const setMode = (m: Mode) => {
    setModeRaw(m);
    if (m) bodyRef.current?.scrollTo({ top: 0 });
  };
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
  const lost = lead?.status === "lost";
  const dnc = !!lead?.doNotContact.flag;
  const registered = lead?.kind === "student";
  // R64: hidden (not greyed) on Lost, on prospects, and while a sale waits for confirmation.
  const showSale = !!lead && can("crm.record_payments") && registered && !lost && SALE_STAGES.includes(lead.stage) && !lead.saleWaiting;
  const st = lead ? STAGE[lead.stage] : null;
  const lostOption = lead?.stageOptions?.find((o) => o.to === "lost");
  // R75: one open follow-up per lead; the button edits it.
  const openTask = lead?.tasks.find((t) => t.status === "open") ?? null;
  // R70: each dropdown option opens its panel at the top of the body.
  const pickStage = (to: Stage) => {
    if (to === "new_lead" || to === "contacted") setMode({ kind: "contactStage", to });
    else if (to === "interested") setMode({ kind: "interested" });
    else if (to === "payment_pending") setMode({ kind: "sale", courseId: lead ? firstOpenCourse(lead) : undefined, billType: "postpaid" });
    else if (to === "lost") setMode({ kind: "lost" });
  };

  return (
    <aside ref={drawerRef} className="crm-drawer" role="dialog" aria-modal="true" aria-label={lead ? `Lead ${name}` : "Lead"} onKeyDown={onKeyDown} tabIndex={-1}>
      <div className="crm-drawer-h">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <h1 className="truncate">{lead ? name : "Lead"}</h1>
            {lead && <span className="crm-muted crm-small">{[p?.grade ? `Grade ${p.grade}` : null, lead.courseTitle].filter(Boolean).join(" · ") || "No course yet"}</span>}
          </div>
          <button ref={closeRef} type="button" className="crm-btn sm" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {lead && st && (
          <>
            <div className="crm-actions">
              {lost || !can("crm.edit_leads") ? <CrmPill tone={st.tone}>{st.label}</CrmPill> : <StageMenu stage={lead.stage} options={lead.stageOptions} onPick={pickStage} />}
              {lead.frozen && <CrmPill tone="neutral">Frozen</CrmPill>}
              {lost && lead.lostReason && <span className="crm-muted crm-small">{lead.lostReason}</span>}
              {dnc && <CrmPill tone="bad">Do not contact</CrmPill>}
            </div>
            {lost ? (
              can("crm.edit_leads") && (
                <div className="crm-actions">
                  <Btn sm onClick={() => setReasonAction({ title: "Reopen lead", confirmLabel: "Reopen", optional: true, success: "Lead reopened", run: (r) => crmApi.reopenLead(leadId, r || "reopened by hand") })}>
                    Reopen lead
                  </Btn>
                </div>
              )
            ) : (
              <div className="crm-actions">
                <Btn sm tone="primary" onClick={() => setMode({ kind: "contact", channel: "call" })}>
                  Log call
                </Btn>
                {can("crm.manage_tasks") && (
                  <Btn sm onClick={() => setMode({ kind: "task" })}>
                    {openTask ? "Edit follow-up" : "Schedule follow-up"}
                  </Btn>
                )}
                {showSale && (
                  <Btn sm onClick={() => setMode(lead.unpaidBill ? { kind: "postpaidPayment" } : { kind: "sale", courseId: firstOpenCourse(lead) })}>
                    Record sale
                  </Btn>
                )}
                <Btn sm onClick={() => setMode({ kind: "contact", channel: "whatsapp" })}>
                  WhatsApp
                </Btn>
                {can("crm.edit_leads") && (
                  <Btn sm tone="danger" disabledReason={lostOption && !lostOption.allowed ? lostOption.reason : null} onClick={() => setMode({ kind: "lost" })}>
                    Mark lost
                  </Btn>
                )}
                {canAssign && (
                  <Btn sm onClick={() => setMode({ kind: "assign", ownerId: lead.ownerId || "none" })}>
                    Assign
                  </Btn>
                )}
              </div>
            )}
            {!registered && <span className="crm-muted crm-small">Not registered yet. The student must sign up before a sale can be recorded.</span>}
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
            {mode?.kind === "contact" && <ContactPanel key={mode.channel} leadId={leadId} phone={p?.phone ?? null} channel={mode.channel} openTask={openTask} onDone={panelDone()} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "task" && <TaskPanel key={openTask?._id ?? "new"} leadId={leadId} task={openTask} onCreated={panelDone(openTask ? "Follow-up updated" : "Follow-up scheduled")} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "contactStage" && <ContactStagePanel key={mode.to} lead={lead} to={mode.to} onDone={(m) => panelDone(m)()} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "interested" && <InterestedPanel lead={lead} courses={courses} onDone={(m) => panelDone(m)()} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "sale" && <RecordSalePanel key={`${mode.courseId || "sale"}-${mode.billType || "prepaid"}`} initialBillType={mode.billType} leadId={leadId} interests={lead.interests} leadCourses={lead.courses} courses={courses} initialCourseId={mode.courseId} onDone={panelDone()} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "postpaidPayment" && lead.unpaidBill && (
              <PostpaidPaymentPanel bill={lead.unpaidBill} courseTitle={lead.courses?.find((c) => c.courseId === lead.unpaidBill?.courseId)?.title} onDone={panelDone()} onCancel={() => setModeRaw(null)} />
            )}
            {mode?.kind === "lost" && <LostPanel leadId={leadId} onDone={panelDone("Lead marked lost")} onCancel={() => setModeRaw(null)} />}
            {mode?.kind === "assign" && <AssignPanel lead={lead} reps={reps} initialOwnerId={mode.ownerId} onDone={panelDone()} onCancel={() => setModeRaw(null)} />}

            <CrmFacts
              items={[
                { label: "Student phone", value: p?.phone || "—" },
                { label: "Guardian", value: guardianText(lead) },
                { label: "School", value: p?.school || "—" },
                { label: "District", value: p?.district || "—" },
                ...(isAdmin ? [{ label: "Source", value: sourceLabel(lead) }, { label: "Added", value: fmtDateTime(lead.createdAt) }] : []),
                { label: "Last contact", value: lead.lastContactAt ? relDateTime(lead.lastContactAt) : "Not contacted yet" },
                {
                  label: "Owner",
                  value: canAssign ? (
                    <select className="crm-input" aria-label="Owner" value={lead.ownerId || "none"} onChange={(e) => e.target.value !== (lead.ownerId || "none") && setMode({ kind: "assign", ownerId: e.target.value })}>
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
            <DoNotContactLink lead={lead} canSet={can("crm.set_do_not_contact")} canClear={can("crm.clear_do_not_contact")} ask={setReasonAction} />

            <LeadCourses
              lead={lead}
              onCancel={(c) => setReasonAction({ title: `Cancel ${c.title}`, description: "The course is no longer waiting for payment; the student stays Interested in it.", confirmLabel: "Cancel assignment", destructive: true, success: "Assignment cancelled", run: (r) => crmApi.cancelLeadCourse(lead._id, c.assignmentId!, r) })}
              onFreeze={(c) => setReasonAction({ title: `Freeze ${c.title}`, description: "The student loses access to this course everywhere until it is unfrozen. Nothing is deleted.", confirmLabel: "Freeze", destructive: true, optional: true, success: "Course frozen", run: (r) => crmApi.freezeTemporary(lead._id, c.enrollmentId!, r || undefined) })}
              onUnfreeze={(c) => setReasonAction({ title: `Unfreeze ${c.title}`, description: "The student gets access to this course again.", confirmLabel: "Unfreeze", optional: true, success: "Course unfrozen", run: () => crmApi.unfreezeTemporary(lead._id, c.enrollmentId!) })}
            />

            <FollowUps lead={lead} act={act} />

            <LeadSalesSection leadId={leadId} refreshKey={salesKey} />

            <section>
              <h3 className="crm-sec-h" style={{ marginBottom: 10 }}>
                Activity
              </h3>
              {!activities || activities.items.length === 0 ? (
                <p className="crm-muted crm-small">No activity yet.</p>
              ) : (
                <>
                  <CrmTimeline>
                    {activities.items.map((a) => (
                      <CrmEvent key={a._id} tone={activityTone(a)}>
                        <div>{activityText(a)}</div>
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
    </aside>
  );
}

function guardianText(lead: LeadDetail) {
  const p = lead.person;
  // R40: a linked parent account is shown instead of the guardian fields.
  const parents = p?.linkedParents?.length ? p.linkedParents : p?.linkedParent ? [p.linkedParent] : null;
  if (parents) return parents.map((x) => [x.name, x.phone].filter(Boolean).join(" · ")).join("; ") || "—";
  return [p?.guardianName, p?.guardianPhone].filter(Boolean).join(" · ") || "—";
}

/** The single Do not contact link at the bottom of the facts (set by those allowed; cleared by Admin only). */
function DoNotContactLink({ lead, canSet, canClear, ask }: { lead: LeadDetail; canSet: boolean; canClear: boolean; ask: (a: ReasonAction) => void }) {
  if (lead.doNotContact.flag) {
    return (
      <p className="crm-small" style={{ margin: 0 }}>
        <span className="crm-late">Do not contact{lead.doNotContact.reason ? `: ${lead.doNotContact.reason}` : ""}</span>
        {canClear && (
          <>
            {" · "}
            <button type="button" className="crm-link" onClick={() => ask({ title: "Allow contact again", confirmLabel: "Clear do not contact", success: "Do not contact cleared", run: (r) => crmApi.setDoNotContact(lead._id, false, r) })}>
              Clear
            </button>
          </>
        )}
      </p>
    );
  }
  if (!canSet) return null;
  return (
    <p className="crm-small" style={{ margin: 0 }}>
      <button
        type="button"
        className="crm-link"
        onClick={() => ask({ title: "Do not contact", description: "Blocks every contact and cancels open contact follow-ups.", confirmLabel: "Set do not contact", destructive: true, success: "Do not contact set", run: (r) => crmApi.setDoNotContact(lead._id, true, r) })}
      >
        Do not contact
      </button>
    </p>
  );
}

/**
 * The Courses block (R67; S8c / S9 layout): its own section under the facts,
 * one row per course, the title on the left (wraps), the state pill and,
 * where allowed, Cancel on the right.
 */
type CourseRow = LeadDetail["courses"][number];
function LeadCourses({ lead, onCancel, onFreeze, onUnfreeze }: { lead: LeadDetail; onCancel: (c: CourseRow) => void; onFreeze: (c: CourseRow) => void; onUnfreeze: (c: CourseRow) => void }) {
  const list = lead.courses ?? [];
  return (
    <section>
      <h3 className="crm-sec-h">Courses</h3>
      {list.length === 0 ? (
        <p className="crm-muted crm-small" style={{ margin: 0 }}>
          None yet
        </p>
      ) : (
        <div className="crm-list">
          {list.map((c) => (
            <div key={c.courseId} className="crm-li">
              <span className="crm-course-title">{c.title}</span>
              <span className="crm-actions">
                <CrmPill tone={LEAD_COURSE_STATE[c.state].tone}>{LEAD_COURSE_STATE[c.state].label}</CrmPill>
                {c.state === "payment_pending" && c.canCancel && c.assignmentId && (
                  <button type="button" className="crm-link crm-small" onClick={() => onCancel(c)} aria-label={`Cancel ${c.title}`}>
                    Cancel
                  </button>
                )}
                {c.state === "temporary" && c.canFreeze && c.enrollmentId && (
                  <button type="button" className="crm-link crm-small" onClick={() => onFreeze(c)} aria-label={`Freeze ${c.title}`}>
                    Freeze
                  </button>
                )}
                {c.state === "temporary_frozen" && c.canUnfreeze && c.enrollmentId && (
                  <button type="button" className="crm-link crm-small" onClick={() => onUnfreeze(c)} aria-label={`Unfreeze ${c.title}`}>
                    Unfreeze
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** The course to prefill for Payment pending and Record sale: a temporary one first (R72), then Interested, then held. */
function firstOpenCourse(lead: LeadDetail) {
  for (const st of ["temporary", "temporary_frozen", "interested", "payment_pending", "visited"]) {
    const c = lead.courses?.find((x) => x.state === st);
    if (c) return c.courseId;
  }
  return undefined;
}

/** Courses the student doesn't already have (not enrolled, not held, not already interested unless `keepInterested`). */
function assignable(lead: LeadDetail, courses: CatalogCourse[], keepInterested: boolean) {
  const stateOf = (id: string) => lead.courses?.find((c) => c.courseId === id)?.state;
  return courses.filter((c) => {
    const st = stateOf(c._id);
    return !st || st === "trial" || st === "visited" || (keepInterested && st === "interested");
  });
}

const stageToast = (r: { stage: Stage; changed: boolean; opportunitiesClosed?: number }, fallback: string) =>
  !r.changed ? `Already ${STAGE[r.stage].label}` : r.opportunitiesClosed ? `${fallback}; ${r.opportunitiesClosed} course(s) closed` : fallback;

/** R70: New lead / Contacted. From Interested the open courses close as "No longer interested". */
function ContactStagePanel({ lead, to, onDone, onCancel }: { lead: LeadDetail; to: "new_lead" | "contacted"; onDone: (msg: string) => void; onCancel: () => void }) {
  const { busy, error, run } = useBusy();
  const label = STAGE[to].label;
  return (
    <Panel title={`Move to ${label}`} submitLabel="Save" onCancel={onCancel} busy={busy} error={error} onSubmit={() => run(async () => onDone(stageToast(await crmApi.moveStage(lead._id, { to }), `Moved to ${label}`)))}>
      <span className="crm-muted crm-small">
        {lead.stage === "interested" ? "The open course(s) on this lead close as “No longer interested”." : `The lead moves to ${label}.`}
      </span>
    </Panel>
  );
}

/** R70: Interested. Pick a course the student doesn't have; an open one is just shown. */
function InterestedPanel({ lead, courses, onDone, onCancel }: { lead: LeadDetail; courses: CatalogCourse[]; onDone: (msg: string) => void; onCancel: () => void }) {
  const [courseId, setCourseId] = useState("");
  const { busy, error, run } = useBusy();
  // R75: any course; the ones the student visited come first.
  const visited = new Set((lead.courses ?? []).filter((c) => c.state === "visited").map((c) => c.courseId));
  const options = assignable(lead, courses, false).sort((a, b) => Number(visited.has(b._id)) - Number(visited.has(a._id)));
  return (
    <Panel
      title="Interested"
      submitLabel="Save"
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={!!courseId}
      onSubmit={() => run(async () => onDone(stageToast(await crmApi.moveStage(lead._id, { to: "interested", courseId }), "Course added · Interested")))}
    >
      <div className="crm-form">
        <Field label="Course" full>
          <Sel value={courseId} onChange={(e) => setCourseId(e.target.value)} options={[{ value: "", label: options.length ? "Choose the confirmed course" : "No course left to add" }, ...options.map((c) => ({ value: c._id, label: c.title + (visited.has(c._id) ? " (visited)" : "") }))]} />
        </Field>
      </div>
    </Panel>
  );
}

function FollowUps({ lead, act }: { lead: LeadDetail; act: (fn: () => Promise<unknown>, success: string) => Promise<void> }) {
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
        {open.map((t) => (
          <div key={t._id} className="crm-li">
            <div className="crm-who">
              <b>{TASK_TYPE_LABELS[t.type] || t.type}</b>
              {t.notes && <span className="crm-muted crm-small"> · {t.notes}</span>}
              <span className={`crm-sub ${new Date(t.dueAt) < new Date() ? "crm-late" : ""}`}>{relDateTime(t.dueAt)}</span>
            </div>
            {manage &&
              (doneId === t._id ? (
                <form
                  className="crm-actions"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (outcome.trim()) act(() => crmApi.completeTask(t._id, outcome.trim()), "Follow-up done").then(() => setDoneId(null));
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
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function LostPanel({ leadId, onDone, onCancel }: { leadId: string; onDone: () => void; onCancel: () => void }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const { busy, error, run } = useBusy();
  return (
    <Panel title="Mark as lost" submitLabel="Mark lost" onCancel={onCancel} busy={busy} error={error} onSubmit={() => run(async () => { await crmApi.markLost(leadId, reason); onDone(); })}>
      <div className="crm-form">
        <Field label="Reason" full>
          <Sel value={reason} onChange={(e) => setReason(e.target.value)} options={LOST_REASONS.map((r) => ({ value: r, label: r }))} />
        </Field>
      </div>
      <span className="crm-muted crm-small">Open courses and follow-ups on this lead are closed too.</span>
    </Panel>
  );
}

function AssignPanel({ lead, reps, initialOwnerId, onDone, onCancel }: { lead: LeadDetail; reps: Rep[]; initialOwnerId: string; onDone: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [target, setTarget] = useState(initialOwnerId);
  const [reason, setReason] = useState("");
  const { busy, error, run } = useBusy();
  return (
    <Panel
      title="Assign"
      submitLabel="Assign"
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={target !== (lead.ownerId || "none")}
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
    </Panel>
  );
}

// The timeline line for an activity: its summary, or a short label.
function activityText(a: Activity) {
  if (a.type === "outreach_started") return `${a.channel ? CHANNEL_LABELS[a.channel as Channel] ?? a.channel : "Contact"} started${a.purpose ? ` (${PURPOSE_LABELS[a.purpose].toLowerCase()})` : ""}`;
  if (a.type === "outreach_outcome") return `${OUTCOME_LABELS[a.outcome || ""] || a.outcome}${a.summary ? `: ${a.summary}` : ""}`;
  return a.summary || a.type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// Timeline dot colour (S1): successful contact green, losses and policy
// exceptions red, system events grey, everything else accent.
function activityTone(a: Activity): "good" | "bad" | "muted" | undefined {
  if (a.policyException) return "bad";
  if (a.type === "outreach_outcome") return a.outcome === "connected" || a.outcome === "message_sent" ? "good" : a.outcome === "asked_not_to_contact" || a.outcome === "wrong_number" ? "bad" : "muted";
  if (/lost|invalidated|do_not_contact/.test(a.type)) return "bad";
  if (/won|payment|enrolled/.test(a.type)) return "good";
  if (["note", "call", "whatsapp", "sms", "email", "meeting", "enquiry", "outreach_started"].includes(a.type)) return undefined;
  return "muted";
}
