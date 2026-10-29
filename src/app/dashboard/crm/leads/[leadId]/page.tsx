"use client";

// Sales & CRM → lead profile. Everything shown and every action is decided by
// the backend (Sales: only while they own the lead; approved student fields
// only). Contacting always goes through the outreach gate (ContactDialog).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, Banknote, CheckCircle2, Loader2, MessageSquarePlus, Phone, Plus, RotateCcw, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState, DoNotContactBadge, InterestStageBadge, LeadStageBadge, LeadStatusBadge, OutcomeBadge, ReasonDialog, TaskStatusBadge } from "@/components/crm/crm-ui";
import { CrmCard, CrmEvent, CrmFacts, CrmPill, CrmTimeline, GOOD_BUTTON } from "@/components/crm/ui";
import { ContactDialog } from "@/components/crm/contact-dialog";
import { CompleteTaskDialog, CreateTaskDialog, RescheduleTaskDialog } from "@/components/crm/task-dialogs";
import { EnrollWithCodeDialog, PaymentsPanel, QuotesPanel } from "@/components/crm/sales-panels";
import { RecordPaymentDialog } from "@/components/crm/bill-dialogs";
import {
  CHANNEL_LABELS,
  Channel,
  INTEREST_STAGE_LABELS,
  Interest,
  InterestStage,
  LEAD_STAGE_LABELS,
  LeadDetail,
  OUTCOME_LABELS,
  PURPOSE_LABELS,
  Rep,
  TASK_TYPE_LABELS,
  crmApi,
  fetchCourseCatalog,
  fmtDateTime,
  rs,
  timeAgo,
} from "@/lib/crm/api";

type ReasonAction = { title: string; description?: string; confirmLabel: string; destructive?: boolean; optional?: boolean; run: (reason: string) => Promise<unknown> } | null;

export default function LeadProfilePage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [courses, setCourses] = useState<{ _id: string; title: string; price?: number }[]>([]);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [contactFor, setContactFor] = useState<{ open: boolean; interest: { _id: string; title: string } | null }>({ open: false, interest: null });
  const [taskOpen, setTaskOpen] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<{ _id: string; dueAt: string } | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [courseAction, setCourseAction] = useState<null | "add" | "assign">(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [paymentsKey, setPaymentsKey] = useState(0);
  // Sales: whether a payment can be recorded on any open opportunity (preview per course).
  const [recordable, setRecordable] = useState<{ ok: boolean; reason: string | null; interestId: string | null } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLead(await crmApi.getLead(leadId));
    } catch (e: any) {
      setError(e?.status === 404 ? "This lead doesn't exist or isn't assigned to you." : e?.message || "Could not load the lead");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const openInterestKey = (lead?.interests || []).filter((i) => i.status === "open").map((i) => i._id).join(",");
  useEffect(() => {
    if (!can("crm.record_payments") || !lead) return;
    const open = lead.interests.filter((i) => i.status === "open");
    if (lead.kind !== "student") return setRecordable({ ok: false, reason: "Payments can be recorded only for a registered student.", interestId: null });
    if (open.length === 0) return setRecordable({ ok: false, reason: "No open course opportunity.", interestId: null });
    let cancelled = false;
    Promise.all(open.map((i) => crmApi.paymentPreview(leadId, i._id).catch((e) => ({ canRecord: false, reason: e?.message || "Can't price this course", interestId: i._id }) as any))).then((previews) => {
      if (cancelled) return;
      const ok = previews.find((p) => p.canRecord);
      setRecordable(ok ? { ok: true, reason: null, interestId: ok.interestId } : { ok: false, reason: previews[0]?.reason || "Recording isn't possible right now.", interestId: null });
    });
    return () => {
      cancelled = true;
    };
  }, [lead?.kind, openInterestKey, leadId, can]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    fetchCourseCatalog().then(setCourses);
    if (can("crm.manage_reps")) crmApi.reps().then((r) => setReps(r.filter((x) => x.status === "active"))).catch(() => setReps([]));
  }, [load, can]);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast({ title: success });
      await load();
    } catch (e: any) {
      toast({ title: "Not done", description: e?.reasons?.join("; ") || e?.message, variant: "destructive" });
    }
  };
  const askReason = (a: NonNullable<ReasonAction>) => setReasonAction(a);

  if (loading || error || !lead) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <CrmCard>
          <DataState loading={loading} error={error} onRetry={load}>
            {null}
          </DataState>
        </CrmCard>
      </div>
    );
  }

  const p = lead.person;
  const openTasks = lead.tasks.filter((t) => t.status === "open");
  const latestByCourse = new Map<string, Interest>();
  for (const i of lead.interests) {
    const prev = latestByCourse.get(i.courseId);
    if (!prev || (prev.status === "closed" && (i.status === "open" || new Date(i.closedAt || 0) > new Date(prev.closedAt || 0)))) latestByCourse.set(i.courseId, i);
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <CrmCard>
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold max-[520px]:text-[19px]">{p?.name || "Unnamed"}</h1>
            <p className="crm-muted crm-small mt-1">{[p?.phone, p?.email].filter(Boolean).join(" · ") || "No contact details"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LeadStatusBadge status={lead.status} />
              <LeadStageBadge stage={lead.stage} />
              {lead.kind === "prospect" && <CrmPill>Prospect</CrmPill>}
              {lead.doNotContact.flag && <DoNotContactBadge />}
              <CrmPill tone={lead.ownerName ? "neutral" : "warn"}>Owner: {lead.ownerName || "Unassigned"}</CrmPill>
            </div>
            {lead.status === "lost" && lead.lostReason && <p className="crm-muted crm-small mt-2">Lost: {lead.lostReason}</p>}
          </div>
          <div className="crm-actions">
            <Button type="button" size="sm" onClick={() => setContactFor({ open: true, interest: null })} disabled={lead.doNotContact.flag}>
              <Phone className="mr-1 h-4 w-4" /> Contact
            </Button>
            {can("crm.assign_leads") && (
              <Button type="button" size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                <UserPlus className="mr-1 h-4 w-4" /> {lead.ownerId ? "Reassign" : "Assign"}
              </Button>
            )}
            {lead.status !== "lost" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  askReason({
                    title: "Mark lead lost",
                    description: "Every open task on this lead is cancelled. Reopening later does not restore them.",
                    confirmLabel: "Mark lost",
                    destructive: true,
                    run: (r) => crmApi.markLost(leadId, r),
                  })
                }
              >
                <XCircle className="mr-1 h-4 w-4" /> Mark lost
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => askReason({ title: "Reopen lead", confirmLabel: "Reopen", optional: true, run: (r) => crmApi.reopenLead(leadId, r || "reopened by hand") })}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reopen
              </Button>
            )}
            {can("crm.record_payments") && (
              <Button type="button" size="sm" variant="outline" onClick={() => setRecordOpen(true)} disabled={!recordable?.ok} title={recordable && !recordable.ok ? recordable.reason ?? undefined : undefined}>
                <Banknote className="mr-1 h-4 w-4" /> Record payment
              </Button>
            )}
            {lead.kind === "student" && can("crm.enroll_with_code") && (
              <Button type="button" size="sm" variant="outline" onClick={() => setCodeOpen(true)}>
                Enroll with code
              </Button>
            )}
            {!lead.doNotContact.flag ? (
              <Button type="button" size="sm" variant="outline" onClick={() => askReason({ title: "Do not contact", description: "Blocks every contact and cancels open contact tasks.", confirmLabel: "Set do not contact", destructive: true, run: (r) => crmApi.setDoNotContact(leadId, true, r) })}>
                <Ban className="mr-1 h-4 w-4" /> Do not contact
              </Button>
            ) : (
              can("crm.clear_do_not_contact") && (
                <Button type="button" size="sm" variant="outline" onClick={() => askReason({ title: "Allow contact again", confirmLabel: "Clear do not contact", run: (r) => crmApi.setDoNotContact(leadId, false, r) })}>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Clear do not contact
                </Button>
              )
            )}
          </div>
        </div>
      </CrmCard>

      <Tabs defaultValue="overview">
        <TabsList className="crm-tabs -mx-0 w-full rounded-none bg-transparent p-0 px-1">
          <TabsTrigger className="crm-tab" value="overview">Overview</TabsTrigger>
          <TabsTrigger className="crm-tab" value="courses">
            Courses<span className="crm-tab-n">{lead.interests.filter((i) => i.status === "open").length}</span>
          </TabsTrigger>
          <TabsTrigger className="crm-tab" value="activity">
            Activity<span className="crm-tab-n">{lead.activities.pagination?.total ?? lead.activities.items.length}</span>
          </TabsTrigger>
          <TabsTrigger className="crm-tab" value="tasks">
            Tasks<span className="crm-tab-n">{openTasks.length}</span>
          </TabsTrigger>
          <TabsTrigger className="crm-tab" value="sales">Quotes &amp; payments</TabsTrigger>
          {isAdmin && (
            <TabsTrigger className="crm-tab" value="history">
              History
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="sales" className="mt-4 space-y-4">
          {can("crm.record_payments") && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => setRecordOpen(true)} disabled={!recordable?.ok}>
                <Banknote className="mr-1 h-4 w-4" /> Record payment
              </Button>
              {recordable && !recordable.ok && <span className="crm-muted crm-small">{recordable.reason}</span>}
            </div>
          )}
          <QuotesPanel leadId={leadId} interests={lead.interests} onChanged={load} />
          <PaymentsPanel leadId={leadId} refreshKey={paymentsKey} />
        </TabsContent>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
          <CrmCard title="Student" aside={lead.kind === "student" ? <span className="crm-muted crm-small">From the student&apos;s own account</span> : undefined} bodyClassName="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <CrmFacts
                  items={[
                    { label: "Phone", value: p?.phone || "—" },
                    { label: "Email", value: p?.email || "—" },
                    { label: "Grade", value: p?.grade ?? "—" },
                    { label: "District", value: p?.district || "—" },
                    { label: "School", value: p?.school || "—" },
                    { label: "Last contact", value: lead.lastContactAt ? timeAgo(lead.lastContactAt) : "Not contacted yet" },
                  ]}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="lead-priority">Priority</Label>
                <Select value={lead.priority} onValueChange={(v) => act(() => crmApi.updateLead(leadId, { priority: v }), "Priority updated")}>
                  <SelectTrigger id="lead-priority" className="mt-1 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="lead-stage">Contact stage</Label>
                <Select value={lead.stage} onValueChange={(v) => act(() => crmApi.updateLead(leadId, { stage: v }), "Stage updated")}>
                  <SelectTrigger id="lead-stage" className="mt-1 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </CrmCard>

          <CrmCard title="Enrollment" bodyClassName="space-y-3">
              <div>
                <div className="crm-facts-label">Enrolled courses</div>
                {lead.enrollment.enrolledCourses.length === 0 ? <p className="crm-muted">None</p> : <ul className="list-disc pl-5">{lead.enrollment.enrolledCourses.map((c) => <li key={c.courseId}>{c.title}</li>)}</ul>}
              </div>
              <div>
                <div className="crm-facts-label">Assigned, payment pending</div>
                {lead.enrollment.pendingCourseAssignments.length === 0 ? (
                  <p className="crm-muted">None</p>
                ) : (
                  <ul className="space-y-1">
                    {lead.enrollment.pendingCourseAssignments.map((a) => (
                      <li key={a._id} className="flex items-center justify-between gap-2">
                        <span>
                          {a.title} <span className="crm-muted">({fmtDateTime(a.assignedAt)})</span>
                        </span>
                        {a.fromThisLead && can("enrollments.cancel_pending") && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => askReason({ title: "Cancel course assignment", confirmLabel: "Cancel assignment", destructive: true, run: (r) => crmApi.cancelCourseAssignment(a._id, r) })}>
                            Cancel
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
          </CrmCard>

          <ContactControls lead={lead} onChanged={load} askReason={askReason} canEnable={can("crm.clear_do_not_contact")} />
        </TabsContent>

        <TabsContent value="courses" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {can("crm.manage_pipeline") && (
              <Button type="button" variant="outline" onClick={() => setCourseAction("add")}>
                <Plus className="mr-2 h-4 w-4" /> Add course opportunity
              </Button>
            )}
            {lead.kind === "student" && can("enrollments.assign_pending") && (
              <Button type="button" variant="outline" onClick={() => setCourseAction("assign")}>
                Assign course (payment pending)
              </Button>
            )}
          </div>
          {lead.interests.length === 0 ? (
            <CrmCard flush>
              <div className="crm-empty">No course opportunities yet.</div>
            </CrmCard>
          ) : (
            lead.interests.map((i) => (
              <CrmCard key={i._id} className={i.status === "closed" ? "opacity-80" : ""} bodyClassName="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{i.title}</span>
                      {i.status === "open" ? <InterestStageBadge stage={i.stage} /> : <OutcomeBadge outcome={i.outcome} lostReason={i.lostReason} />}
                      {i.enrolled && <CrmPill tone="good">Enrolled</CrmPill>}
                      {i.reopenedFromInterestId && <CrmPill>Reopened</CrmPill>}
                    </div>
                    <p className="crm-muted mt-1 text-xs">
                      List price {rs(i.listPrice)} · viewed {timeAgo(i.signals?.lastViewedAt)}
                      {i.signals?.lastCheckoutAt ? ` · checkout ${timeAgo(i.signals.lastCheckoutAt)}` : ""}
                      {i.closedAt ? ` · closed ${fmtDateTime(i.closedAt)}` : ""}
                    </p>
                  </div>
                  {i.status === "open" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" onClick={() => setContactFor({ open: true, interest: { _id: i._id, title: i.title } })} disabled={lead.doNotContact.flag}>
                        <Phone className="mr-1 h-4 w-4" /> Contact
                      </Button>
                      <Select value={i.stage} onValueChange={(v) => act(() => crmApi.setStage(i._id, v as InterestStage, i.stage), "Stage updated")}>
                        <SelectTrigger className="h-9 w-[170px]" aria-label={`Stage of ${i.title}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(INTEREST_STAGE_LABELS) as InterestStage[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {INTEREST_STAGE_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" variant="outline" onClick={() => askReason({ title: `Close ${i.title} as lost`, confirmLabel: "Mark lost", destructive: true, run: (r) => crmApi.interestLost(i._id, r) })}>
                        Lost
                      </Button>
                    </div>
                  ) : (
                    i.outcome === "lost" &&
                    latestByCourse.get(i.courseId)?._id === i._id && (
                      <Button type="button" size="sm" variant="outline" onClick={() => askReason({ title: `Reopen ${i.title}`, description: "A new opportunity is opened; this one stays in history.", confirmLabel: "Reopen", optional: true, run: (r) => crmApi.interestReopen(i._id, r || "reopened by hand") })}>
                        <RotateCcw className="mr-1 h-4 w-4" /> Reopen
                      </Button>
                    )
                  )}
              </CrmCard>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-3">
          <Button type="button" variant="outline" onClick={() => setActivityOpen(true)}>
            <MessageSquarePlus className="mr-1 h-4 w-4" /> Log activity
          </Button>
          <CrmCard title="Activity" aside={<span className="crm-muted crm-small">Newest first</span>}>
              {lead.activities.items.length === 0 ? (
                <div className="crm-empty">No activity yet.</div>
              ) : (
                <CrmTimeline>
                  {lead.activities.items.map((a) => (
                    <CrmEvent key={a._id} tone={activityTone(a)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{activityTitle(a)}</span>
                        {a.policyException && <CrmPill tone="bad">Policy exception</CrmPill>}
                        {a.correctsActivityId && <CrmPill>Correction</CrmPill>}
                      </div>
                      {a.summary && <p className="whitespace-pre-wrap">{a.summary}</p>}
                      {a.basis && <p className="crm-muted crm-small">Because of a {a.basis.signalType.replace(/_/g, " ")} on {fmtDateTime(a.basis.signalAt)}</p>}
                      <span className="crm-muted crm-small">
                        {a.actorName} · {fmtDateTime(a.occurredAt)}
                      </span>
                    </CrmEvent>
                  ))}
                </CrmTimeline>
              )}
          </CrmCard>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-3">
          {lead.status !== "lost" && (
            <Button type="button" variant="outline" onClick={() => setTaskOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New task
            </Button>
          )}
          <CrmCard title="Tasks">
              {lead.tasks.length === 0 ? (
                <div className="crm-empty">No tasks.</div>
              ) : (
                <ul className="crm-list">
                  {lead.tasks.map((t) => {
                    const overdue = t.status === "open" && new Date(t.dueAt) < new Date();
                    return (
                      <li key={t._id} className="crm-li">
                        <div className="crm-who">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{TASK_TYPE_LABELS[t.type] || t.type}</span>
                            {t.purpose && <CrmPill tone="accent">{PURPOSE_LABELS[t.purpose]}</CrmPill>}
                            <TaskStatusBadge status={t.status} overdue={overdue} />
                          </div>
                          <p className={`text-xs ${overdue ? "crm-late" : "crm-muted"}`}>
                            Due {fmtDateTime(t.dueAt)}
                            {overdue ? " (overdue)" : ""} · {t.assigneeName || "Unassigned"}
                            {t.rescheduleHistory && t.rescheduleHistory.length > 0 ? ` · rescheduled ${t.rescheduleHistory.length}×` : ""}
                          </p>
                          {t.notes && <p>{t.notes}</p>}
                          {t.outcome && <p>Outcome: {t.outcome}</p>}
                          {t.cancelReason && <p className="crm-muted">Cancelled: {t.cancelReason}</p>}
                        </div>
                        {t.status === "open" && (
                          <div className="crm-actions">
                            <Button type="button" size="sm" className={GOOD_BUTTON} onClick={() => setCompleteId(t._id)}>
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Done
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setRescheduleTask({ _id: t._id, dueAt: t.dueAt })}>
                              Reschedule
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => askReason({ title: "Cancel task", confirmLabel: "Cancel task", destructive: true, run: (r) => crmApi.cancelTask(t._id, r) })}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
          </CrmCard>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="history" className="mt-4 grid gap-4 lg:grid-cols-2">
            <CrmCard title="Ownership" aside={<span className="crm-muted crm-small">{lead.createdByName ? `Created by ${lead.createdByName}` : `Created from ${lead.source}`} · {fmtDateTime(lead.createdAt)}</span>}>
                {(lead.assignmentHistory || []).length === 0 ? (
                  <p className="crm-muted">Never assigned.</p>
                ) : (
                  <ol className="space-y-2">
                    {lead.assignmentHistory!.map((h, idx) => (
                      <li key={idx}>
                        {h.from || "Unassigned"} → {h.to || "Unassigned"} <span className="crm-muted">by {h.by}, {h.method.replace(/_/g, " ")}, {fmtDateTime(h.at)}</span>
                        {h.reason && <div className="crm-muted">{h.reason}</div>}
                      </li>
                    ))}
                  </ol>
                )}
            </CrmCard>
            <CrmCard title="Status changes">
                {(lead.statusHistory || []).length === 0 ? (
                  <p className="crm-muted">No changes.</p>
                ) : (
                  <ol className="space-y-2">
                    {lead.statusHistory!.map((h, idx) => (
                      <li key={idx}>
                        {h.from} → {h.to} <span className="crm-muted">{fmtDateTime(h.at)}</span>
                        {h.reason && <div className="crm-muted">{h.reason}</div>}
                      </li>
                    ))}
                  </ol>
                )}
            </CrmCard>
          </TabsContent>
        )}
      </Tabs>

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
            await reasonAction.run(r);
            toast({ title: "Done" });
            await load();
          }}
        />
      )}
      <ContactDialog open={contactFor.open} onOpenChange={(v) => setContactFor((s) => ({ ...s, open: v }))} leadId={leadId} interest={contactFor.interest} onDone={load} />
      <CreateTaskDialog open={taskOpen} onOpenChange={setTaskOpen} leadId={leadId} interests={lead.interests} onCreated={() => { toast({ title: "Task created" }); load(); }} />
      <CompleteTaskDialog taskId={completeId} onOpenChange={(v) => !v && setCompleteId(null)} onDone={load} />
      <RescheduleTaskDialog task={rescheduleTask} onOpenChange={(v) => !v && setRescheduleTask(null)} onDone={load} />
      <LogActivityDialog open={activityOpen} onOpenChange={setActivityOpen} leadId={leadId} interests={lead.interests} onDone={load} />
      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        leadId={leadId}
        interests={lead.interests}
        initialInterestId={recordable?.interestId}
        onDone={() => {
          setPaymentsKey((k) => k + 1);
          load();
        }}
      />
      <EnrollWithCodeDialog leadId={leadId} open={codeOpen} onOpenChange={setCodeOpen} onDone={() => { toast({ title: "Enrolled with the code" }); load(); }} />
      <AssignOwnerDialog open={assignOpen} onOpenChange={setAssignOpen} reps={reps} current={lead.ownerId} onSubmit={(ownerId, reason) => act(() => crmApi.assign(leadId, ownerId, reason), ownerId ? "Lead assigned" : "Lead unassigned")} />
      <CourseDialog
        mode={courseAction}
        onClose={() => setCourseAction(null)}
        courses={courses}
        onSubmit={(courseId, note) =>
          courseAction === "assign"
            ? crmApi.assignCourse(leadId, courseId, note).then(() => {
                toast({ title: "Course assigned, payment pending" });
                load();
              })
            : crmApi.addInterest(leadId, courseId).then(() => {
                toast({ title: "Opportunity added" });
                load();
              })
        }
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/crm/leads" className="crm-crumb flex w-fit items-center gap-1 hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Leads &amp; Students
    </Link>
  );
}

function activityTitle(a: LeadDetail["activities"]["items"][number]) {
  if (a.type === "outreach_started") return `${a.channel ? CHANNEL_LABELS[a.channel as Channel] ?? a.channel : "Contact"} started${a.purpose ? ` (${PURPOSE_LABELS[a.purpose]})` : ""}`;
  if (a.type === "outreach_outcome") return `Outcome: ${OUTCOME_LABELS[a.outcome || ""] || a.outcome}`;
  if (a.type === "enquiry") return `Enquiry by ${a.channel}`;
  if (["call", "whatsapp", "sms", "email"].includes(a.type)) return `${CHANNEL_LABELS[a.type as Channel]} (${a.direction})`;
  return a.type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// Timeline dot colour: successful contact green, policy exceptions and losses red,
// system events grey, everything else accent.
function activityTone(a: LeadDetail["activities"]["items"][number]): "good" | "bad" | "muted" | undefined {
  if (a.policyException) return "bad";
  if (a.type === "outreach_outcome") return a.outcome === "connected" || a.outcome === "message_sent" ? "good" : a.outcome === "asked_not_to_contact" || a.outcome === "wrong_number" ? "bad" : "muted";
  if (/lost|invalidated|do_not_contact/.test(a.type)) return "bad";
  if (/won|payment|enrolled/.test(a.type)) return "good";
  if (["note", "call", "whatsapp", "sms", "email", "meeting", "enquiry", "outreach_started"].includes(a.type)) return undefined;
  return "muted";
}

function ContactControls({ lead, onChanged, askReason, canEnable }: { lead: LeadDetail; onChanged: () => void; askReason: (a: NonNullable<ReasonAction>) => void; canEnable: boolean }) {
  const [consentOpen, setConsentOpen] = useState(false);
  return (
    <CrmCard className="lg:col-span-2" title="Contact preferences" bodyClassName="space-y-4">
        <p className="crm-muted crm-small">Turning a channel off blocks it at once and cancels open tasks on it. Only an Admin can turn it back on.</p>
        <div className="flex flex-wrap gap-6">
          {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
            <div key={c} className="flex items-center gap-2">
              <Switch
                id={`ch-${c}`}
                checked={lead.channels?.[c] !== false}
                disabled={lead.channels?.[c] === false && !canEnable}
                onCheckedChange={(v) =>
                  askReason({
                    title: `${v ? "Allow" : "Turn off"} ${CHANNEL_LABELS[c]}`,
                    confirmLabel: v ? "Allow" : "Turn off",
                    destructive: !v,
                    run: async (r) => {
                      await crmApi.setChannel(lead._id, c, v, r);
                      onChanged();
                    },
                  })
                }
              />
              <Label htmlFor={`ch-${c}`}>{CHANNEL_LABELS[c]}</Label>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">Consent records</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setConsentOpen(true)}>
              Record consent
            </Button>
          </div>
          {lead.consent.length === 0 ? (
            <p className="text-muted-foreground">None recorded. Marketing needs consent granted for that channel.</p>
          ) : (
            <ul className="space-y-1">
              {lead.consent
                .slice()
                .reverse()
                .map((c, idx) => (
                  <li key={idx}>
                    {PURPOSE_LABELS[c.purpose as keyof typeof PURPOSE_LABELS] ?? c.purpose} · {CHANNEL_LABELS[c.channel]}: <strong>{c.status}</strong> <span className="text-muted-foreground">({c.source}, {fmtDateTime(c.at)})</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} leadId={lead._id} onDone={onChanged} />
    </CrmCard>
  );
}

function ConsentDialog({ open, onOpenChange, leadId, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; leadId: string; onDone: () => void }) {
  const [purpose, setPurpose] = useState("marketing");
  const [channel, setChannel] = useState<Channel>("call");
  const [status, setStatus] = useState<"granted" | "withdrawn">("granted");
  const [source, setSource] = useState("phone_call");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record consent</DialogTitle>
          <DialogDescription>Only record what the person actually said. A withdrawal cancels matching open contact tasks.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="purchase_assistance">Help with a course</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "granted" | "withdrawn")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="granted">Granted</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="consent-source">How</Label>
            <Input id="consent-source" value={source} onChange={(e) => setSource(e.target.value)} maxLength={100} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await crmApi.recordConsent(leadId, { purpose, channel, status, source });
                onDone();
                onOpenChange(false);
              } catch (e: any) {
                setError(e?.message || "Could not save");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogActivityDialog({ open, onOpenChange, leadId, interests, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; leadId: string; interests: Interest[]; onDone: () => void }) {
  const [type, setType] = useState("note");
  const [direction, setDirection] = useState("inbound");
  const [channel, setChannel] = useState("whatsapp");
  const [summary, setSummary] = useState("");
  const [interestId, setInterestId] = useState("none");
  const [exceptionReason, setExceptionReason] = useState("");
  const [needsException, setNeedsException] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setSummary("");
      setNeedsException(null);
      setExceptionReason("");
      setError(null);
    }
  }, [open]);
  const isContact = ["call", "whatsapp", "sms", "email"].includes(type);
  const submit = async () => {
    setBusy(true);
    setError(null);
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
      onOpenChange(false);
    } catch (e: any) {
      if (e?.code === "POLICY_EXCEPTION_REQUIRED") setNeedsException(e.message);
      else setError(e?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>Record something that already happened. This never contacts anyone; to contact someone, use Contact.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="enquiry">Enquiry from the person</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isContact && (
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">They contacted us</SelectItem>
                  <SelectItem value="outbound">We contacted them</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "enquiry" && (
            <div>
              <Label>How</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="in_person">In person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Course</Label>
            <Select value={interestId} onValueChange={setInterestId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not about one course</SelectItem>
                {interests
                  .filter((i) => i.status === "open")
                  .map((i) => (
                    <SelectItem key={i._id} value={i._id}>
                      {i.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="act-summary">What happened</Label>
            <Textarea id="act-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={2000} />
          </div>
          {needsException && (
            <div className="sm:col-span-2 rounded-md border border-destructive/30 bg-[var(--crm-bad-soft)] p-3">
              <p className="text-sm text-destructive">{needsException}</p>
              <Label htmlFor="act-exception" className="mt-2 block">
                Reason (recorded as a policy exception and audited)
              </Label>
              <Input id="act-exception" value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} maxLength={500} />
            </div>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || (needsException !== null && !exceptionReason.trim())}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignOwnerDialog({ open, onOpenChange, reps, current, onSubmit }: { open: boolean; onOpenChange: (v: boolean) => void; reps: Rep[]; current: string | null; onSubmit: (ownerId: string | null, reason?: string) => Promise<void> }) {
  const [target, setTarget] = useState(current || "none");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) {
      setTarget(current || "none");
      setReason("");
    }
  }, [open, current]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign lead</DialogTitle>
          <DialogDescription>The previous owner loses access at once; open tasks move to the new owner.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger aria-label="Owner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r._id} value={r._id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input aria-label="Reason" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={async () => {
              await onSubmit(target === "none" ? null : target, reason.trim() || undefined);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseDialog({ mode, onClose, courses, onSubmit }: { mode: null | "add" | "assign"; onClose: () => void; courses: { _id: string; title: string; price?: number }[]; onSubmit: (courseId: string, note?: string) => Promise<void> }) {
  const [courseId, setCourseId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (mode) {
      setCourseId("");
      setNote("");
      setError(null);
    }
  }, [mode]);
  return (
    <Dialog open={!!mode} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "assign" ? "Assign course (payment pending)" : "Add course opportunity"}</DialogTitle>
          <DialogDescription>
            {mode === "assign" ? "The student gets no access, and nothing counts as a sale, until their payment is verified." : "Track the student's interest in another course."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger aria-label="Course">
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.title}
                  {c.price ? ` · ${rs(c.price)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === "assign" && <Input aria-label="Note" placeholder="Note (optional), e.g. pays on Friday" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !courseId}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSubmit(courseId, note.trim() || undefined);
                onClose();
              } catch (e: any) {
                setError(e?.message || "Could not save");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "assign" ? "Assign" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
