"use client";

// Sales & CRM → Follow-ups & Tasks. Sales see tasks on leads they currently
// own; Admins see everyone's and can filter by rep. Times are shown in the
// viewer's time zone; "today" is the Kathmandu day (backend).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState, ReasonDialog } from "@/components/crm/crm-ui";
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Follow-ups &amp; Tasks</h1>
        </div>
        <p className="mt-2 text-gray-600">{isAdmin ? "Everyone's follow-ups." : "Follow-ups on your leads."}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => { setView(v); setPage(1); }}>
          <TabsList className="flex h-auto flex-wrap">
            {VIEWS.map((v) => (
              <TabsTrigger key={v.value} value={v.value}>
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {isAdmin && reps.length > 0 && (
          <Select value={assigneeId} onValueChange={(v) => { setAssigneeId(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Assigned to">
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
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <DataState loading={loading} error={error} onRetry={load} empty={items.length === 0} emptyText="No tasks here.">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Due</TableHead>
                    {isAdmin && <TableHead>Assigned to</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell>
                        <Link href={`/dashboard/crm/leads/${t.leadId}`} className="font-medium hover:underline">
                          {TASK_TYPE_LABELS[t.type] || t.type}
                        </Link>
                        {t.purpose && (
                          <Badge variant="outline" className="ml-2">
                            {PURPOSE_LABELS[t.purpose]}
                          </Badge>
                        )}
                        {t.notes && <div className="max-w-md truncate text-xs text-muted-foreground">{t.notes}</div>}
                      </TableCell>
                      <TableCell className={t.overdue ? "font-medium text-red-700" : ""}>
                        {fmtDateTime(t.dueAt)}
                        {t.rescheduleCount ? <div className="text-xs text-muted-foreground">rescheduled {t.rescheduleCount}×</div> : null}
                      </TableCell>
                      {isAdmin && <TableCell>{t.assigneeName || "Unassigned"}</TableCell>}
                      <TableCell>
                        <Badge variant={t.status === "open" ? "default" : "outline"}>{t.overdue ? "overdue" : t.status}</Badge>
                        {t.outcome && <div className="text-xs text-muted-foreground">{t.outcome}</div>}
                        {t.cancelReason && <div className="text-xs text-muted-foreground">{t.cancelReason}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === "open" && (
                          <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" onClick={() => setCompleteId(t._id)}>
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Done
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setRescheduleTask({ _id: t._id, dueAt: t.dueAt })}>
                              Reschedule
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setCancelId(t._id)}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </CardContent>
      </Card>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
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
