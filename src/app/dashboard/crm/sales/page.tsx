"use client";

// Sales & CRM → Sales & Bills (Phase S3, R19–R26, R36, R37, R46). The backend
// scopes the list (Sales: payments they recorded or are credited with;
// Admin / Super Admin: all), redacts it per role, counts the tabs, sums the
// tiles and says which actions each row allows.
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { CrmCard, CrmKpi, CrmKpis, CrmPageHeader, CrmPill, CrmTable, CrmTabs, GOOD_BUTTON } from "@/components/crm/ui";
import { DataState, ReasonDialog } from "@/components/crm/crm-ui";
import { BillDialog, BillStatusPill, ConfirmPaymentDialog } from "@/components/crm/bill-dialogs";
import { MonthSelect, useTargetMonths } from "@/components/crm/targets";
import { useSearchParams } from "next/navigation";
import { BillRow, BillSummaryItem, BillTab, Pagination, Rep, crmApi, fmtDateTime, rs } from "@/lib/crm/api";

// S8: the prototype's tabs (Cancelled sales are under All).
const TABS: { value: BillTab; label: string }[] = [
  { value: "waiting", label: "Waiting" },
  { value: "confirmed", label: "Confirmed" },
  { value: "tigg", label: "To record in Tigg" },
  { value: "tigg_recorded", label: "Recorded in Tigg" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];
const ANY = "any";

export default function SalesBillsPage() {
  return (
    <Suspense fallback={null}>
      <SalesBillsInner />
    </Suspense>
  );
}

function SalesBillsInner() {
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const [tab, setTab] = useState<BillTab>(isAdmin ? "waiting" : "all");
  const [repId, setRepId] = useState(ANY);
  // Nepali month (S5): default the current month (or ?bsMonth= from a dashboard link).
  const searchParams = useSearchParams();
  const { months } = useTargetMonths();
  const [bsMonth, setBsMonth] = useState<string | null>(searchParams.get("bsMonth"));
  useEffect(() => {
    if (bsMonth === null && months.length) setBsMonth(months[0].key);
  }, [months, bsMonth]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BillRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<BillSummaryItem[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<BillRow | null>(null);
  const [reasonFor, setReasonFor] = useState<{ row: BillRow; kind: "reject" | "cancel" } | null>(null);

  // S8: Salesperson and Month only, as the prototype.
  const filters = { repId: repId === ANY ? undefined : repId, bsMonth: bsMonth || undefined };
  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, c, s] = await Promise.all([crmApi.bills({ ...filters, tab, page, limit: 25 }), crmApi.billCounts(filters), crmApi.billSummary(filters)]);
      setRows(list.items);
      setPagination(list.pagination);
      setCounts(c);
      setSummary(s.items);
    } catch (e: any) {
      setError(e?.message || "Could not load sales");
    } finally {
      setLoading(false);
    }
  }, [tab, page, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (can("crm.manage_reps")) crmApi.reps().then((r) => setReps(r.filter((x) => x.status === "active" || x.status === "inactive")), () => setReps([]));
  }, [can]);

  // R80: the Admin has entered the sale into Tigg by hand (or undoes a mistaken click).
  const setTigg = async (r: BillRow) => {
    try {
      await crmApi.setTiggRecorded(r._id, !r.tiggRecordedAt);
      toast({ title: r.tiggRecordedAt ? "Moved back to To record" : "Recorded in Tigg" });
      await load();
    } catch (e: any) {
      toast({ title: "Not done", description: e?.message, variant: "destructive" });
    }
  };

  const setFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader crumb="Sales & Bills" title="Sales & Bills" subtitle="Manual sales stay pending until an admin confirms the money arrived. App purchases verify automatically." />

      {summary.length > 0 && (
        <CrmKpis>
          {summary.map((s) => (
            <div key={s.key} title={s.includes}>
              <CrmKpi label={s.label} value={s.total !== undefined ? rs(s.total) : s.count} caption={s.total !== undefined ? `${s.count} payment${s.count === 1 ? "" : "s"} · ${s.includes}` : s.includes} tone={s.tone} />
            </div>
          ))}
        </CrmKpis>
      )}

      <CrmCard flush>
        <div className="crm-card-b crm-toolbar">
          {isAdmin && reps.length > 0 && (
            <Select value={repId} onValueChange={(v) => setFilter(() => setRepId(v))}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Salesperson">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any salesperson</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <MonthSelect
            months={months}
            value={bsMonth ?? ""}
            anyLabel="Any month"
            onChange={(v) => setFilter(() => setBsMonth(v))}
          />
        </div>
        <CrmTabs label="Status" value={tab} onChange={(v) => { setTab(v); setPage(1); }} tabs={(can("crm.confirm_payments") ? TABS : TABS.filter((t) => !t.value.startsWith("tigg"))).map((t) => ({ ...t, count: counts[t.value] ?? null }))} />
        <DataState loading={loading} error={error} onRetry={load} empty={rows.length === 0} emptyText={tab === "waiting" ? "Nothing waiting for confirmation." : "No sales here. Try another tab or clear the filters."}>
          <CrmTable>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Type</th>
                <th>Date</th>
                <th>Student</th>
                <th>Course</th>
                <th className="crm-num">Amount</th>
                <th>Paid by</th>
                {isAdmin && <th>Salesperson</th>}
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="whitespace-nowrap font-semibold">
                    {r.invoiceNumber ?? r.receiptNumber ?? <span className="crm-muted">{r.proforma ? "Proforma" : "—"}</span>}
                    {r.invoiceNumber && r.receiptNumber && <span className="crm-sub">{r.receiptNumber}</span>}
                    {r.creditNoteNumber && <span className="crm-sub">{r.creditNoteNumber}</span>}
                    {r.tiggRecordedAt && <span className="crm-sub">In Tigg · {r.tiggRecordedBy}</span>}
                  </td>
                  <td>{r.billType ? <CrmPill tone={r.billType === "prepaid" ? "accent" : "warn"}>{r.billType === "prepaid" ? "Prepaid" : "Postpaid"}</CrmPill> : <span className="crm-muted">—</span>}</td>
                  <td className="whitespace-nowrap">
                    {fmtDateTime(r.date)}
                    {r.receivedAt && r.status === "waiting" && <span className="crm-sub">received {fmtDateTime(r.receivedAt)}</span>}
                  </td>
                  <td>{r.leadId ? <Link href={`/dashboard/crm/leads/${r.leadId}`} className="crm-link">{r.studentName}</Link> : r.studentName}</td>
                  <td>{r.courseUnconfirmed ? <CrmPill tone="warn">Course not confirmed</CrmPill> : r.courseTitle}</td>
                  <td className="crm-num">
                    <b>{rs(r.amount)}</b>
                    {r.pricing && <span className="crm-sub">incl. VAT {rs(r.pricing.vatAmount)}</span>}
                    {r.pricing && r.pricing.totalDiscount > 0 && (
                      <span className="crm-sub" style={r.discount?.needsApproval && !r.discount.approved ? { color: "var(--crm-warn)", fontWeight: 600 } : undefined}>
                        −{rs(r.pricing.totalDiscount)} disc.{r.discount?.needsApproval ? (r.discount.approved ? " (approved)" : " · needs approval") : ""}
                      </span>
                    )}
                    {r.amountMismatch && <span className="crm-sub crm-late">received {rs(r.amountReceived)}</span>}
                  </td>
                  <td>
                    {r.methodLabel}
                    <span className="crm-sub">{r.pathLabel}</span>
                  </td>
                  {isAdmin && (
                    <td>
                      {r.organization ? <span className="crm-muted">Organization</span> : r.creditedToName ?? r.creditOwnerName ?? <span className="crm-muted">No salesperson</span>}
                      {r.recordedByName && r.recordedByName !== (r.creditedToName ?? r.creditOwnerName) && <span className="crm-sub">recorded by {r.recordedByName}</span>}
                    </td>
                  )}
                  <td>
                    <BillStatusPill status={r.status} label={r.statusLabel} />
                    {r.confirmNote && <span className="crm-sub">{r.confirmNote}</span>}
                  </td>
                  <td>
                    <div className="crm-actions flex-nowrap">
                      <Button type="button" size="sm" variant="outline" onClick={() => setBillId(r._id)}>
                        Bill
                      </Button>
                      {r.canRecordTigg && (tab === "tigg" || tab === "tigg_recorded") && (
                        <Button type="button" size="sm" variant={r.tiggRecordedAt ? "ghost" : "default"} onClick={() => setTigg(r)}>
                          {r.tiggRecordedAt ? "Undo" : "Record"}
                        </Button>
                      )}
                      {r.canConfirm && (
                        <Button type="button" size="sm" className={GOOD_BUTTON} onClick={() => setConfirmRow(r)}>
                          Confirm
                        </Button>
                      )}
                      {r.canReject && (
                        <Button type="button" size="sm" variant="outline" className="text-[var(--crm-bad)]" onClick={() => setReasonFor({ row: r, kind: "reject" })}>
                          Reject
                        </Button>
                      )}
                      {r.canCancel && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setReasonFor({ row: r, kind: "cancel" })}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </CrmTable>
        </DataState>
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

      <BillDialog paymentId={billId} onOpenChange={(v) => !v && setBillId(null)} />
      <ConfirmPaymentDialog row={confirmRow} onOpenChange={(v) => !v && setConfirmRow(null)} onDone={load} />
      <ReasonDialog
        open={!!reasonFor}
        onOpenChange={(v) => !v && setReasonFor(null)}
        title={reasonFor?.kind === "reject" ? "Reject payment" : "Cancel payment"}
        description={reasonFor?.kind === "reject" ? "The student doesn't get the course and nothing counts. The salesperson sees your reason." : "Withdraw a payment you recorded by mistake. It never counts."}
        confirmLabel={reasonFor?.kind === "reject" ? "Reject payment" : "Cancel payment"}
        destructive
        onConfirm={async (reason) => {
          const r = reasonFor!;
          try {
            if (r.kind === "reject") await crmApi.rejectPayment(r.row._id, reason);
            else await crmApi.cancelPayment(r.row._id, reason);
          } catch (e: any) {
            toast({ title: r.kind === "reject" ? "Not rejected" : "Not cancelled", description: e?.message, variant: "destructive" });
            throw e;
          }
          toast({ title: r.kind === "reject" ? "Payment rejected" : "Payment cancelled" });
          load();
        }}
      />
    </div>
  );
}
