"use client";

// Sales & CRM → Follow-ups (S8: the prototype's page). Tabs Overdue · Today ·
// Upcoming · Done. Sales see follow-ups on leads they currently own; Admins
// see everyone's. "Today" is the Kathmandu day (backend).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState } from "@/components/crm/crm-ui";
import { CrmPageHeader } from "@/components/crm/ui";
import { Btn } from "@/components/crm/leads/controls";
import { Pagination, TASK_TYPE_LABELS, Task, crmApi, relDateTime } from "@/lib/crm/api";

const TABS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Done" },
];

export default function FollowUpsPage() {
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const [tab, setTab] = useState("overdue");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [doneId, setDoneId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await crmApi.tasks({ view: tab, page, limit: 50 });
      setItems(data.items);
      setPagination(data.pagination);
    } catch (e: any) {
      setError(e?.message || "Could not load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [tab, page]);
  const loadCounts = useCallback(() => {
    Promise.all(TABS.map((t) => crmApi.tasks({ view: t.value, page: 1, limit: 1 }).then((d) => [t.value, d.pagination.total] as const, () => null))).then((res) => {
      const next: Record<string, number> = {};
      for (const r of res) if (r) next[r[0]] = r[1];
      setCounts(next);
    });
  }, []);
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast({ title: success });
      setDoneId(null);
      load();
      loadCounts();
    } catch (e: any) {
      toast({ title: "Not done", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader crumb="Follow-ups" title="Follow-ups" subtitle="Every open lead should have one next step with a date" />
      <section className="crm-card">
        <div className="crm-tabs" role="tablist" aria-label="Follow-ups">
          {TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} className="crm-tab" onClick={() => { setTab(t.value); setPage(1); }}>
              {t.label}
              <span className="crm-tab-n">{counts[t.value] ?? "–"}</span>
            </button>
          ))}
        </div>
        <div className="crm-card-b">
          <DataState loading={loading} error={error} onRetry={load} empty={items.length === 0} emptyText={tab === "overdue" ? "No overdue follow-ups. Good work." : "Nothing here."}>
            <div className="crm-list">
              {items.map((t) => (
                <div key={t._id} className="crm-li">
                  <div className="crm-who">
                    <b>{t.leadName || "Unnamed"}</b>{" "}
                    <span className="crm-muted crm-small">
                      · {TASK_TYPE_LABELS[t.type] || t.type}
                      {t.leadPhone ? ` · ${t.leadPhone}` : ""}
                    </span>
                    {t.notes && <span className="crm-sub">{t.notes}</span>}
                    <span className={`crm-sub ${tab === "overdue" ? "crm-late" : ""}`}>
                      {tab === "completed" ? `Done${t.outcome ? ` · ${t.outcome}` : ""}` : relDateTime(t.dueAt)}
                      {isAdmin ? ` · ${t.assigneeName || "Unassigned"}` : ""}
                    </span>
                  </div>
                  {doneId === t._id ? (
                    <form
                      className="crm-actions"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (outcome.trim()) act(() => crmApi.completeTask(t._id, outcome.trim()), "Follow-up done");
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
                      {t.status === "open" && (
                        <>
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
                        </>
                      )}
                      <Link href={`/dashboard/crm/leads/${t.leadId}`} className="crm-btn sm">
                        Open lead
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DataState>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="crm-pager">
            <span className="crm-muted crm-small">
              Page {page} of {pagination.pages}
            </span>
            <button type="button" className="crm-btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button type="button" className="crm-btn sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
