"use client";

// Team & Targets and "My target" (Phase S5; R27–R31, R43, R47, R49). Every
// figure, status and month label comes from the backend (/crm/targets,
// /crm/targets/:id/sales, salary history, settings); nothing is computed here
// except formatting.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState } from "@/components/crm/crm-ui";
import { CrmBar, CrmCard, CrmKpi, CrmKpis, CrmNote, CrmPill, CrmTable } from "@/components/crm/ui";
import { MonthInfo, SalaryHistory, TARGET_STATUS_TONE, TargetRow, TargetRules, TargetSales, TargetSchedule, TargetsView, crmApi, fmtDateTime, rs } from "@/lib/crm/api";

const pct = (p: number | null) => (p == null ? "—" : `${Math.round(p * 100)}%`);
const barTone = (s: TargetRow["status"]) => (s === "ahead" || s === "target_met" ? "good" : s === "behind" ? "warn" : s === "not_selling" || s === "missed" ? "bad" : undefined);

export function useTargetMonths() {
  const [months, setMonths] = useState<MonthInfo[]>([]);
  const reload = useCallback(() => crmApi.targetMonths().then(setMonths, () => setMonths([])), []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { months, reload };
}

/** BS month picker (newest first). `anyLabel` adds an "any month" option with value "". */
export function MonthSelect({ months, value, onChange, anyLabel, className }: { months: MonthInfo[]; value: string; onChange: (v: string) => void; anyLabel?: string; className?: string }) {
  return (
    <Select value={value || "__any"} onValueChange={(v) => onChange(v === "__any" ? "" : v)}>
      <SelectTrigger className={className ?? "w-full bg-[var(--crm-surface)] sm:w-[180px]"} aria-label="Month">
        <SelectValue placeholder="Month" />
      </SelectTrigger>
      <SelectContent>
        {anyLabel && <SelectItem value="__any">{anyLabel}</SelectItem>}
        {months.map((m) => (
          <SelectItem key={m.key} value={m.key}>
            {m.label}
            {m.closed ? " · closed" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The prototype's "My target" card for one row. */
export function MyTargetCard({ row, schedule, salary }: { row: TargetRow; schedule?: TargetSchedule; salary?: SalaryHistory | null }) {
  const r = row.rules;
  return (
    <CrmCard
      title={`My target · ${row.month.label}`}
      aside={<CrmPill tone={TARGET_STATUS_TONE[row.status]}>{row.statusLabel}</CrmPill>}
      bodyClassName="flex flex-col gap-3"
    >
      {row.target == null ? (
        <CrmNote>No salary is set for this month yet, so there is no target. Ask a Super Admin to set your salary.</CrmNote>
      ) : (
        <>
          <div>
            <span className="crm-display text-[28px] font-bold">{rs(row.achieved)}</span> <span className="crm-muted">of {rs(row.target)} · {pct(row.progress)}</span>
          </div>
          <CrmBar value={row.progress ?? 0} tone={barTone(row.status)} />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              ["Monthly", row.target],
              ["Weekly", row.weeklyTarget],
              ["Daily", row.dailyTarget],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-[10px] border bg-[var(--crm-surface-2)] p-2.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--crm-muted)]">{l}</span>
                <b className="crm-display block text-[15px]">{rs(v as number)}</b>
              </div>
            ))}
          </div>
          <CrmNote>
            {row.month.closed ? (
              <>
                <b>{row.status === "target_met" ? "Target met." : "Target missed."}</b> These figures are frozen.{" "}
              </>
            ) : row.remaining && row.remaining > 0 ? (
              <>
                Sell <b>{rs(row.neededPerDay)}</b> a day for the next {row.daysLeft} day{row.daysLeft === 1 ? "" : "s"} to hit target.{" "}
              </>
            ) : (
              <>
                <b>Target reached.</b> Everything more adds to your bonus.{" "}
              </>
            )}
            {row.bonus > 0 ? (
              <>
                Bonus {row.month.closed ? "for the month" : "earned so far"}: <b>{rs(row.bonus)}</b>.
              </>
            ) : (
              <>
                <b>{rs(row.toBonus)}</b> more to unlock the {r.bonusRatePercent}% bonus.
              </>
            )}
            {row.waiting.count > 0 && !row.month.closed && <> {rs(row.waiting.total)} waiting for confirmation, not counted yet.</>}
          </CrmNote>
          {row.adjustments !== 0 && <p className="crm-muted crm-small">Includes {rs(row.adjustments)} from earlier months (payments marked invalid after their month closed).</p>}
        </>
      )}
      {row.salary != null && (
        <p className="crm-muted crm-small">
          Your salary: {rs(row.salary)} (target = {r.multiplier} × salary)
          {salary?.scheduled ? ` · from ${salary.scheduled.effectiveFrom.label}: ${rs(salary.scheduled.amount)}` : ""}
          {schedule?.scheduled && !row.month.closed ? ` · rules change from ${schedule.scheduled.effectiveFrom.label}` : ""}
        </p>
      )}
    </CrmCard>
  );
}

/** "What counted": the payments and adjustments behind a rep's figure. */
export function WhatCounted({ data }: { data: TargetSales | null }) {
  if (!data) return <div className="crm-empty flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data.payments.length && !data.adjustments.length) return <div className="crm-empty">Nothing counted in {data.month.label} yet.</div>;
  return (
    <div className="crm-list">
      {data.payments.map((p) => (
        <div key={p._id} className="crm-li">
          <div className="crm-who">
            <b>{p.leadId ? <Link className="crm-link" href={`/dashboard/crm/leads/${p.leadId}`}>{p.studentName}</Link> : p.studentName}</b> <span className="crm-muted crm-small">· {p.courseTitle}</span>
            <span className="crm-sub">
              {p.receiptNumber ?? "—"} · {fmtDateTime(p.date)} · {p.pathLabel}
              {p.invalidatedAfterClose ? " · marked invalid after the month closed" : ""}
            </span>
          </div>
          <b>{rs(p.amount)}</b>
        </div>
      ))}
      {data.adjustments.map((a) => (
        <div key={a._id} className="crm-li">
          <div className="crm-who">
            <b>Adjustment</b> <span className="crm-muted crm-small">· {a.reason === "invalidated" ? "a payment from a closed month was marked invalid" : "refund"}</span>
            <span className="crm-sub">{fmtDateTime(a.at)}</span>
          </div>
          <b className="text-[var(--crm-bad)]">{rs(a.amount)}</b>
        </div>
      ))}
    </div>
  );
}

function WhatCountedDialog({ row, month, onOpenChange }: { row: TargetRow | null; month: string; onOpenChange: (v: boolean) => void }) {
  const [data, setData] = useState<TargetSales | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!row) return;
    setData(null);
    setError(null);
    crmApi.targetSales(row.adminId, month).then(setData, (e) => setError(e?.message || "Could not load"));
  }, [row, month]);
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-48px)] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>What counted · {row?.name}</DialogTitle>
          <DialogDescription>Confirmed sales credited to {row?.name} in {row?.month.label}, by the date they were credited, and adjustments applied to this month.</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : <WhatCounted data={data} />}
      </DialogContent>
    </Dialog>
  );
}

/** Salary for a rep (Super Admin edits; R27). */
function SalaryDialog({ row, onOpenChange, onDone }: { row: TargetRow | null; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { toast } = useToast();
  const [h, setH] = useState<SalaryHistory | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    if (!row) return;
    setH(null);
    crmApi.salaryHistory(row.adminId).then(setH, (e) => setError(e?.message || "Could not load the salary history"));
  }, [row]);
  useEffect(() => {
    if (!row) return;
    setAmount("");
    setReason("");
    setError(null);
    load();
  }, [row, load]);
  const valid = /^\d+$/.test(amount) && Number(amount) > 0 && reason.trim().length >= 3 && !!h;
  const submit = async () => {
    if (!row || !h) return;
    setBusy(true);
    setError(null);
    try {
      await crmApi.setSalary(row.adminId, { amount: Number(amount), reason: reason.trim(), expectedCurrentAmount: h.latestAmount });
      toast({ title: "Salary saved", description: `Applies from ${h.appliesFrom.label}.` });
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      const msg = e?.code === "SALARY_CHANGED" ? "The salary was changed by someone else. Reload and try again." : e?.message || "Could not save";
      setError(msg);
      toast({ title: "Not saved", description: msg, variant: "destructive" });
      if (e?.code === "SALARY_CHANGED") load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!row} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[calc(100vh-48px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salary for {row?.name}</DialogTitle>
          <DialogDescription>A salary sets the monthly target ({row?.rules.multiplier} × salary).</DialogDescription>
        </DialogHeader>
        {!h ? (
          <div className="crm-empty flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[10px] border bg-[var(--crm-surface-2)] p-2.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--crm-muted)]">Now</span>
                <b className="crm-display block text-[15px]">{h.current ? rs(h.current.amount) : "Not set"}</b>
              </div>
              <div className="rounded-[10px] border bg-[var(--crm-surface-2)] p-2.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--crm-muted)]">Scheduled</span>
                <b className="crm-display block text-[15px]">{h.scheduled ? `${rs(h.scheduled.amount)} · ${h.scheduled.effectiveFrom.label}` : "—"}</b>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="salary-amount">New monthly salary (Rs, whole rupees)</Label>
              <Input id="salary-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="salary-reason">Reason</Label>
              <Textarea id="salary-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
            </div>
            <CrmNote>
              Applies from <b>{h.appliesFrom.label}</b>
              {h.entries.length === 0 ? " (a first salary applies to the current month)." : " (a change always applies from the next month; the current month keeps its salary)."}
              {h.scheduled ? ` It replaces the change already scheduled for ${h.scheduled.effectiveFrom.label}.` : ""}
            </CrmNote>
            {h.entries.length > 0 && (
              <div>
                <div className="crm-facts-label">History</div>
                <div className="crm-list">
                  {h.entries.map((e) => (
                    <div key={e._id} className="crm-li">
                      <div className="crm-who">
                        <b>{rs(e.amount)}</b> <span className="crm-muted crm-small">from {e.effectiveFrom.label}</span>
                        <span className="crm-sub">
                          {e.setByName} · {fmtDateTime(e.setAt)} · {e.reason}
                          {e.replacesEntryId ? " · replaced an earlier change for that month" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !valid}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save salary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Rules card: current rules, scheduled change, worked example; Super Admin edits (R47). */
function RulesCard({ schedule, onChanged }: { schedule: TargetSchedule; onChanged: () => void }) {
  const { can } = useAdmin();
  const { toast } = useToast();
  const editable = can("crm.manage_settings");
  const base = schedule.scheduled ?? schedule.current;
  const [form, setForm] = useState({ multiplier: String(base.multiplier), bonusThreshold: String(base.bonusThreshold), bonusRatePercent: String(base.bonusRatePercent), onTrackPercent: String(base.onTrackPercent) });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const b = schedule.scheduled ?? schedule.current;
    setForm({ multiplier: String(b.multiplier), bonusThreshold: String(b.bonusThreshold), bonusRatePercent: String(b.bonusRatePercent), onTrackPercent: String(b.onTrackPercent) });
  }, [schedule]);
  const c = schedule.current;
  const example = Math.max(145000, c.bonusThreshold * 1.45);
  const exampleBonus = Math.round((example * c.bonusRatePercent) / 100);
  const save = async () => {
    setBusy(true);
    try {
      const changes: Partial<TargetRules> = {};
      (Object.keys(form) as (keyof TargetRules)[]).forEach((k) => (changes[k] = Number(form[k])));
      await crmApi.updateTargetRules(changes);
      toast({ title: "Rules saved", description: `They apply from ${schedule.nextMonth.label}.` });
      onChanged();
    } catch (e: any) {
      toast({ title: "Not saved", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const field = (k: keyof typeof form, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`rule-${k}`}>{label}</Label>
      <Input id={`rule-${k}`} inputMode="decimal" value={form[k]} disabled={!editable} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );
  return (
    <CrmCard title="Target and bonus rules" aside={<span className="crm-muted crm-small">Apply to every salesperson</span>} bodyClassName="flex flex-col gap-3">
      <p className="crm-small">
        Now ({c.month.label}): target = <b>{c.multiplier} × salary</b>; bonus <b>{c.bonusRatePercent}%</b> of all credited sales once they reach <b>{rs(c.bonusThreshold)}</b>; on track at <b>{c.onTrackPercent}%</b> of the expected figure.
      </p>
      {schedule.scheduled && (
        <CrmNote>
          From <b>{schedule.scheduled.effectiveFrom.label}</b>: target {schedule.scheduled.multiplier} × salary, bonus {schedule.scheduled.bonusRatePercent}% from {rs(schedule.scheduled.bonusThreshold)}, on track at {schedule.scheduled.onTrackPercent}%.
        </CrmNote>
      )}
      <div className="crm-form">
        {field("multiplier", "Target multiplier (× salary)")}
        {field("bonusThreshold", "Bonus starts at (Rs credited in the month)")}
        {field("bonusRatePercent", "Bonus rate (%)")}
        {field("onTrackPercent", "On track at (% of expected)")}
      </div>
      <CrmNote>
        Example with the current rules: {rs(example)} credited → {c.bonusRatePercent}% × {rs(example).replace("Rs. ", "")} = <b>{rs(exampleBonus)}</b> bonus. Below {rs(c.bonusThreshold)} → no bonus.
      </CrmNote>
      {editable ? (
        <div className="crm-actions">
          <Button type="button" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save rules
          </Button>
          <span className="crm-muted crm-small">Applies from {schedule.nextMonth.label}. The current month keeps its rules.</span>
        </div>
      ) : (
        <span className="crm-muted crm-small">Only a Super Admin can change the rules.</span>
      )}
    </CrmCard>
  );
}

/** Admin / Super Admin: the Targets tab of Team & Targets. */
export function TargetsTab() {
  const { can } = useAdmin();
  const { toast } = useToast();
  const { months, reload: reloadMonths } = useTargetMonths();
  const [month, setMonth] = useState("");
  const [view, setView] = useState<TargetsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counted, setCounted] = useState<TargetRow | null>(null);
  const [salaryFor, setSalaryFor] = useState<TargetRow | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const canSalary = can("crm.manage_salaries");
  const canClose = can("crm.close_target_months");

  const load = useCallback(async () => {
    setError(null);
    try {
      setView(await crmApi.targets(month || undefined));
    } catch (e: any) {
      setError(e?.message || "Could not load targets");
    }
  }, [month]);
  useEffect(() => {
    setView(null);
    load();
  }, [load]);

  const m = view?.month;
  const idx = m ? months.findIndex((x) => x.key === m.key) : -1;
  const earlierAllClosed = idx >= 0 && months.slice(idx + 1).every((x) => x.closed);
  const showClose = canClose && m && m.ended && !m.closed && earlierAllClosed;
  const closed = !!m?.closed;

  const doClose = async () => {
    if (!m) return;
    setCloseBusy(true);
    setCloseError(null);
    try {
      await crmApi.closeMonth(m.bsYear, m.bsMonth);
      toast({ title: `${m.label} closed`, description: "The statements are frozen." });
      setClosing(false);
      reloadMonths();
      load();
    } catch (e: any) {
      setCloseError(e?.message || "Could not close the month");
      toast({ title: "Not closed", description: e?.message, variant: "destructive" });
    } finally {
      setCloseBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="crm-toolbar">
        <MonthSelect months={months} value={month || m?.key || ""} onChange={setMonth} />
        {closed && (
          <CrmPill>
            <Lock className="h-3 w-3" /> Closed
          </CrmPill>
        )}
        {m && <span className="crm-muted crm-small">{closed || m.ended ? `${m.days} days` : `${m.elapsed} of ${m.days} days gone`}</span>}
        {showClose && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setCloseError(null); setClosing(true); }}>
            Close month
          </Button>
        )}
      </div>
      <DataState loading={!view && !error} error={error} onRetry={load}>
        {view && (
          <>
            <CrmKpis>
              <CrmKpi label="Team target" value={rs(view.totals?.target ?? 0)} caption={view.month.label} />
              <CrmKpi label="Credited" value={rs(view.totals?.achieved ?? 0)} caption={view.totals?.target ? `${pct((view.totals.achieved || 0) / view.totals.target)} of target · incl. adjustments` : "Confirmed sales credited this month"} tone="good" />
              <CrmKpi label={closed ? "Bonus for the month" : "Bonus payable so far"} value={rs(view.totals?.bonus ?? 0)} caption={`${view.rules.bonusRatePercent}% of all once ${rs(view.rules.bonusThreshold)} is reached`} />
            </CrmKpis>
            <CrmCard title="Salespeople" aside={<span className="crm-muted crm-small">Click a row to see what counted</span>} flush>
              <DataState loading={false} empty={view.rows.length === 0} emptyText="No salesperson has a salary or sales in this month.">
                <CrmTable>
                  <thead>
                    <tr>
                      <th>Salesperson</th>
                      <th className="crm-num">Salary</th>
                      <th className="crm-num">Target</th>
                      <th className="crm-num">Credited</th>
                      <th className="min-w-[140px]">Progress</th>
                      {!closed && <th className="crm-num">Needed / day</th>}
                      <th className="crm-num">Bonus</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((r) => (
                      <tr key={r.adminId} className="crm-click" onClick={() => setCounted(r)} style={{ opacity: r.deactivated ? 0.7 : 1 }}>
                        <td>
                          <b>{r.name}</b> {r.deactivated && <CrmPill>Deactivated</CrmPill>}
                        </td>
                        <td className="crm-num" onClick={(e) => canSalary && e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1">
                            {r.salary == null ? <span className="crm-muted">—</span> : rs(r.salary)}
                            {canSalary && !r.deactivated && (
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Salary for ${r.name}`} onClick={() => setSalaryFor(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </span>
                        </td>
                        <td className="crm-num">{r.target == null ? <span className="crm-muted">—</span> : rs(r.target)}</td>
                        <td className="crm-num">
                          <b>{rs(r.achieved)}</b>
                          <span className="crm-sub">
                            {r.creditedCount} sale{r.creditedCount === 1 ? "" : "s"}
                            {r.adjustments ? ` · ${rs(r.adjustments)} adj.` : ""}
                          </span>
                          {r.waiting.count > 0 && !closed && <span className="crm-sub">{rs(r.waiting.total)} waiting, not counted</span>}
                        </td>
                        <td>
                          {r.progress == null ? (
                            <span className="crm-muted">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <CrmBar value={r.progress} tone={barTone(r.status)} />
                              <span className="crm-muted crm-small">{pct(r.progress)}</span>
                            </div>
                          )}
                        </td>
                        {!closed && <td className="crm-num">{r.target == null ? "—" : r.remaining ? rs(r.neededPerDay) : "Done"}</td>}
                        <td className="crm-num">{r.bonus ? <b>{rs(r.bonus)}</b> : <span className="crm-muted crm-small">{rs(r.toBonus)} to go</span>}</td>
                        <td>
                          <CrmPill tone={TARGET_STATUS_TONE[r.status]}>{r.statusLabel}</CrmPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </CrmTable>
              </DataState>
            </CrmCard>
            <RulesCard schedule={view.schedule} onChanged={load} />
          </>
        )}
      </DataState>

      <WhatCountedDialog row={counted} month={view?.month.key ?? ""} onOpenChange={(v) => !v && setCounted(null)} />
      <SalaryDialog row={salaryFor} onOpenChange={(v) => !v && setSalaryFor(null)} onDone={load} />
      <Dialog open={closing} onOpenChange={(v) => !closeBusy && setClosing(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close {m?.label}?</DialogTitle>
            <DialogDescription>
              Each salesperson&apos;s salary, target, credited sales and bonus for {m?.label} are frozen in a statement that never changes. A payment from this month marked invalid later becomes an adjustment on the next open month. Months are closed in order.
            </DialogDescription>
          </DialogHeader>
          {closeError && <p className="text-sm text-destructive">{closeError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setClosing(false)} disabled={closeBusy}>
              Cancel
            </Button>
            <Button type="button" onClick={doClose} disabled={closeBusy}>
              {closeBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Close month
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Sales: "My target" with the month selector and what counted. */
export function MyTargetView() {
  const { admin } = useAdmin();
  const { months } = useTargetMonths();
  const [month, setMonth] = useState("");
  const [view, setView] = useState<TargetsView | null>(null);
  const [counted, setCounted] = useState<TargetSales | null>(null);
  const [salary, setSalary] = useState<SalaryHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    setView(null);
    setCounted(null);
    try {
      const v = await crmApi.targets(month || undefined);
      setView(v);
      const me = v.rows[0]?.adminId;
      if (me) crmApi.targetSales(me, v.month.key).then(setCounted, () => setCounted(null));
    } catch (e: any) {
      setError(e?.message || "Could not load your target");
    }
  }, [month]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    crmApi.mySalaryHistory().then(setSalary, () => setSalary(null));
  }, [admin?._id]);
  const row = view?.rows[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="crm-toolbar">
        <MonthSelect months={months} value={month || view?.month.key || ""} onChange={setMonth} />
        {view?.month.closed && (
          <CrmPill>
            <Lock className="h-3 w-3" /> Closed
          </CrmPill>
        )}
      </div>
      <DataState loading={!view && !error} error={error} onRetry={load}>
        {row && view && (
          <div className="crm-grid2">
            <MyTargetCard row={row} schedule={view.schedule} salary={salary} />
            <CrmCard title="What counted" aside={<span className="crm-muted crm-small">{view.month.label}</span>}>
              <WhatCounted data={counted} />
            </CrmCard>
          </div>
        )}
      </DataState>
    </div>
  );
}
