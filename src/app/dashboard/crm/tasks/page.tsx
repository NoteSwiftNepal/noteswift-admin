"use client";

// Sales & CRM → Follow-ups & Tasks. Sales see tasks on leads they currently
// own; Admins see everyone's and can filter by rep. Times are shown in the
// viewer's time zone; "today" is the Kathmandu day (backend).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState, ReasonDialog, TaskStatusBadge } from "@/components/crm/crm-ui";
import { CrmCard, CrmPageHeader, CrmPill, CrmTabs, GOOD_BUTTON } from "@/components/crm/ui";
import { CompleteTaskDialog, RescheduleTaskDialog } from "@/components/crm/task-dialogs";
import { PURPOSE_LABELS, Pagination, Rep, TASK_TYPE_LABELS, Task, crmApi, fmtDateTime } from "@/lib/crm/api";

const VIEWS = [
  { value: "today", label: "Today" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "open", label: "All open" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function TasksPage() {
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const [view, setView] = useState("today");
  const [assigneeId, setAssigneeId] = useState("any");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<{ _id: string; dueAt: string } | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmApi.tasks({ view, page, limit: 50, assigneeId: assigneeId === "any" ? undefined : assigneeId });
      setItems(data.items);
      setPagination(data.pagination);
    } catch (e: any) {
      setError(e?.message || "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [view, page, assigneeId]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (can("crm.manage_reps")) crmApi.reps().then((r) => setReps(r.filter((x) => x.status === "active"))).catch(() => setReps([]));
  }, [can]);

  // Counts per tab (one small request per view, limit 1). Display only.
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      VIEWS.map((v) =>
        crmApi
          .tasks({ view: v.value, page: 1, limit: 1, assigneeId: assigneeId === "any" ? undefined : assigneeId })
          .then((d) => [v.value, d.pagination.total] as const)
          .catch(() => null)
      )
    ).then((res) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const r of res) if (r) next[r[0]] = r[1];
      setCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [assigneeId, items]);

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader
        crumb="Follow-ups & Tasks"
        title="Follow-ups & Tasks"
        subtitle={isAdmin ? "Everyone's follow-ups." : "Follow-ups on your leads."}
        actions={
          isAdmin && reps.length > 0 ? (
            <Select value={assigneeId} onValueChange={(v) => { setAssigneeId(v); setPage(1); }}>
              <SelectTrigger className="w-full bg-[var(--crm-surface)] sm:w-[200px]" aria-label="Assigned to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Everyone</SelectItem>
                <SelectItem value="none">Unassigned</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      <CrmCard flush>
        <CrmTabs label="Tasks" value={view} onChange={(v) => { setView(v); setPage(1); }} tabs={VIEWS.map((v) => ({ value: v.value, label: v.label, count: counts[v.value] ?? null }))} />
        <div className="crm-card-b">
          <DataState loading={loading} error={error} onRetry={load} empty={items.length === 0} emptyText={view === "overdue" ? "No overdue follow-ups. Good work." : "No tasks here."}>
            <ul className="crm-list">
              {items.map((t) => (
                <li key={t._id} className="crm-li">
                  <div className="crm-who">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/crm/leads/${t.leadId}`} className="font-semibold hover:underline">
                        {t.leadName || "Unnamed"}
                      </Link>
                      <span className="crm-muted crm-small">
                        · {TASK_TYPE_LABELS[t.type] || t.type}
                        {t.leadPhone ? ` · ${t.leadPhone}` : ""}
                      </span>
                      {t.purpose && <CrmPill tone="accent">{PURPOSE_LABELS[t.purpose]}</CrmPill>}
                      <TaskStatusBadge status={t.status} overdue={t.overdue} />
                    </div>
                    {t.notes && <span className="block max-w-xl truncate">{t.notes}</span>}
                    <span className={`crm-small block ${t.overdue ? "crm-late" : "crm-muted"}`}>
                      Due {fmtDateTime(t.dueAt)}
                      {t.rescheduleCount ? ` · rescheduled ${t.rescheduleCount}×` : ""}
                      {isAdmin ? ` · ${t.assigneeName || "Unassigned"}` : ""}
                    </span>
                    {t.outcome && <span className="crm-sub">Outcome: {t.outcome}</span>}
                    {t.cancelReason && <span className="crm-sub">Cancelled: {t.cancelReason}</span>}
                  </div>
                  <div className="crm-actions">
                    {t.status === "open" && (
                      <>
                        <Button type="button" size="sm" className={GOOD_BUTTON} onClick={() => setCompleteId(t._id)}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Done
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setRescheduleTask({ _id: t._id, dueAt: t.dueAt })}>
                          Reschedule
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setCancelId(t._id)}>
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/crm/leads/${t.leadId}`}>Open lead</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </DataState>
        </div>
      </CrmCard>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="crm-muted crm-small">
            Page {page} of {pagination.pages}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      <CompleteTaskDialog taskId={completeId} onOpenChange={(v) => !v && setCompleteId(null)} onDone={() => { toast({ title: "Task completed" }); load(); }} />
      <RescheduleTaskDialog task={rescheduleTask} onOpenChange={(v) => !v && setRescheduleTask(null)} onDone={() => { toast({ title: "Task rescheduled" }); load(); }} />
      <ReasonDialog
        open={!!cancelId}
        onOpenChange={(v) => !v && setCancelId(null)}
        title="Cancel task"
        confirmLabel="Cancel task"
        destructive
        onConfirm={async (r) => {
          await crmApi.cancelTask(cancelId!, r);
          toast({ title: "Task cancelled" });
          load();
        }}
      />
    </div>
  );
}
