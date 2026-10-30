"use client";

// Sales & CRM → CRM Dashboard (Phase S5). One request (GET /crm/dashboard),
// one scope: Sales see their own leads and sales, Admin and Super Admin the
// team. Every figure comes from the backend; nothing is computed here.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/context/admin-context";
import { DataState } from "@/components/crm/crm-ui";
import { CrmBar, CrmCard, CrmKpi, CrmKpis, CrmPageHeader, CrmPill } from "@/components/crm/ui";
import { MonthSelect, MyTargetCard, useTargetMonths } from "@/components/crm/targets";
import { AddLeadModal } from "@/components/crm/leads/add-lead-modal";
import { Dashboard, Rep, TARGET_STATUS_TONE, TASK_TYPE_LABELS, crmApi, fetchCourseCatalog, fmtDateTime, rs } from "@/lib/crm/api";

const MONEY_TILES = new Set(["credited", "waiting", "company"]);

export default function CrmDashboardPage() {
  const router = useRouter();
  const { can } = useAdmin();
  const team = can("crm.view_team_reports");
  const { months } = useTargetMonths();
  const [month, setMonth] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prospectOpen, setProspectOpen] = useState(false);
  const [reps, setReps] = useState<Rep[]>([]);
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try {
      setData(await crmApi.dashboard(month || undefined));
    } catch (e: any) {
      setError(e?.message || "Could not load the dashboard");
    }
  }, [month]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (can("crm.manage_reps")) crmApi.reps().then((r) => setReps(r.filter((x) => x.status === "active")), () => setReps([]));
    if (can("crm.create_leads")) fetchCourseCatalog().then(setCourses);
  }, [can]);

  const maxStage = Math.max(1, ...(data?.pipeline.stages.map((s) => s.count) ?? [0]), data?.pipeline.wonThisMonth ?? 0, data?.pipeline.lostThisMonth ?? 0);
  const funnel = data
    ? [
        ...data.pipeline.stages.map((s) => ({ key: s.stage, label: s.label, count: s.count, color: s.stage === "payment_pending" ? "var(--crm-warn)" : "var(--crm-accent)" })),
        { key: "won", label: `Won in ${data.month.label.split(" ")[0]}`, count: data.pipeline.wonThisMonth, color: "var(--crm-good)" },
        { key: "lost", label: `Lost in ${data.month.label.split(" ")[0]}`, count: data.pipeline.lostThisMonth, color: "var(--crm-bad)" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader
        crumb="CRM Dashboard"
        title={team ? "CRM Dashboard" : "My sales"}
        subtitle={data ? `${data.month.label} · sales and targets count confirmed payments only` : "Sales and targets count confirmed payments only"}
        actions={
          <>
            <MonthSelect months={months} value={month || data?.month.key || ""} onChange={setMonth} />
            {can("crm.create_leads") && (
              <Button type="button" onClick={() => setProspectOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add lead
              </Button>
            )}
          </>
        }
      />
      <DataState loading={!data && !error} error={error} onRetry={load}>
        {data && (
          <>
            <CrmKpis>
              {data.tiles.map((t) => (
                <CrmKpi
                  key={t.key}
                  href={t.link}
                  label={t.label}
                  value={MONEY_TILES.has(t.key) ? rs(t.value) : t.value}
                  caption={`${t.count !== undefined ? `${t.count} payment${t.count === 1 ? "" : "s"} · ` : ""}${t.includes}`}
                  tone={t.tone}
                />
              ))}
            </CrmKpis>

            <div className="crm-grid2">
              {team ? (
                <CrmCard
                  title={`Target progress · ${data.month.label}`}
                  aside={
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href="/dashboard/crm/team">Team & Targets</Link>
                    </Button>
                  }
                >
                  {!data.target.rows?.length ? (
                    <div className="crm-empty">No salesperson has a salary or sales in this month yet.</div>
                  ) : (
                    <div className="crm-list">
                      {data.target.rows.map((r) => (
                        <div key={r.adminId} className="crm-li grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">
                          <div className="crm-who">
                            <b>{r.name}</b>{" "}
                            <span className="crm-muted crm-small">
                              {rs(r.achieved)} of {r.target == null ? "no target" : rs(r.target)}
                              {r.deactivated ? " · deactivated" : ""}
                            </span>
                          </div>
                          <CrmPill tone={TARGET_STATUS_TONE[r.status]}>{r.statusLabel}</CrmPill>
                          <div className="col-span-2">
                            <CrmBar value={r.progress ?? 0} tone={r.status === "ahead" || r.status === "target_met" ? "good" : r.status === "behind" ? "warn" : r.status === "not_selling" || r.status === "missed" ? "bad" : undefined} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CrmCard>
              ) : data.target.row ? (
                <MyTargetCard row={data.target.row} />
              ) : (
                <CrmCard title="My target">
                  <div className="crm-empty">No target yet.</div>
                </CrmCard>
              )}

              <CrmCard title="Pipeline" aside={<span className="crm-muted crm-small">Open opportunities by stage</span>}>
                <div className="flex flex-col gap-2.5">
                  {funnel.map((f) => (
                    <div key={f.key} className="grid grid-cols-[120px_minmax(0,1fr)_36px] items-center gap-2.5 text-[13px] max-[520px]:grid-cols-[92px_minmax(0,1fr)_30px]">
                      <span>{f.label}</span>
                      <div className="h-[22px] overflow-hidden rounded-md bg-[var(--crm-accent-soft)]">
                        <i className="block h-full min-w-[4px] rounded-md" style={{ width: `${(f.count / maxStage) * 100}%`, background: f.color }} />
                      </div>
                      <b className="text-right">{f.count}</b>
                    </div>
                  ))}
                </div>
              </CrmCard>
            </div>

            <CrmCard
              title="Needs attention"
              aside={
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="/dashboard/crm/tasks">All follow-ups</Link>
                </Button>
              }
            >
              {data.attention.overdueTasks.length === 0 && !data.attention.uncontactedNewLeads && !data.attention.waitingConfirmation && !data.attention.rejectedThisMonth ? (
                <div className="crm-empty">Nothing urgent. Every lead has a next step.</div>
              ) : (
                <div className="crm-list">
                  {data.attention.overdueTasks.map((t) => (
                    <div key={t._id} className="crm-li">
                      <div className="crm-who">
                        <b>{t.leadName || "Unnamed"}</b>{" "}
                        <span className="crm-muted crm-small">
                          · {TASK_TYPE_LABELS[t.type] || t.type}
                          {t.notes ? ` · ${t.notes}` : ""}
                        </span>
                        <span className="crm-sub crm-late">
                          Overdue since {fmtDateTime(t.dueAt)}
                          {team ? ` · ${t.assigneeName || "Unassigned"}` : ""}
                        </span>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/dashboard/crm/leads/${t.leadId}`)}>
                        Open
                      </Button>
                    </div>
                  ))}
                  {data.attention.overdueTotal > data.attention.overdueTasks.length && <p className="crm-muted crm-small py-2">+{data.attention.overdueTotal - data.attention.overdueTasks.length} more overdue</p>}
                  {data.attention.uncontactedNewLeads > 0 && (
                    <div className="crm-li">
                      <div className="crm-who">
                        <b>
                          {data.attention.uncontactedNewLeads} new lead{data.attention.uncontactedNewLeads === 1 ? "" : "s"} not contacted within 24 hours
                        </b>
                        <span className="crm-sub">Call new registrations quickly. Interest drops fast.</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href="/dashboard/crm/leads?view=new">View</Link>
                      </Button>
                    </div>
                  )}
                  {!!data.attention.waitingConfirmation && (
                    <div className="crm-li">
                      <div className="crm-who">
                        <b>
                          {data.attention.waitingConfirmation} payment{data.attention.waitingConfirmation === 1 ? "" : "s"} waiting for confirmation
                        </b>
                        <span className="crm-sub">Check the money arrived, then confirm so it counts toward targets.</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href="/dashboard/crm/sales">Review</Link>
                      </Button>
                    </div>
                  )}
                  {!!data.attention.rejectedThisMonth && (
                    <div className="crm-li">
                      <div className="crm-who">
                        <b>
                          {data.attention.rejectedThisMonth} of your payments rejected this month
                        </b>
                        <span className="crm-sub">See the reason on the bill, then record the payment again if needed.</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href="/dashboard/crm/sales">See</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CrmCard>
          </>
        )}
      </DataState>
      <AddLeadModal open={prospectOpen} onClose={() => setProspectOpen(false)} reps={team ? reps : []} courses={courses} onCreated={(id) => router.push(`/dashboard/crm/leads/${id}`)} />
    </div>
  );
}
