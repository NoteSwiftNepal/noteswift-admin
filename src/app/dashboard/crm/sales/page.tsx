"use client";

// Sales & CRM → Sales & Bills (Phase S3, R19–R26, R36, R37, R46). The backend
// scopes the list (Sales: payments they recorded or are credited with;
// Admin / Super Admin: all), redacts it per role, counts the tabs, sums the
// tiles and says which actions each row allows.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { CrmCard, CrmKpi, CrmKpis, CrmPageHeader, CrmTable, CrmTabs, GOOD_BUTTON } from "@/components/crm/ui";
import { DataState, ReasonDialog } from "@/components/crm/crm-ui";
import { BillDialog, BillStatusPill, ConfirmPaymentDialog } from "@/components/crm/bill-dialogs";
import { BillRow, BillSummaryItem, BillTab, Pagination, Rep, crmApi, fmtDateTime, rs } from "@/lib/crm/api";

const TABS: { value: BillTab; label: string }[] = [
  { value: "waiting", label: "Waiting confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];
const METHODS = [
  ["cash", "Cash"],
  ["esewa-personal", "eSewa (personal)"],
  ["bank-transfer", "Bank transfer"],
  ["other", "Other"],
  ["fonepay", "Fonepay"],
  ["esewa-gateway", "eSewa (online)"],
  ["connectips", "connectIPS"],
] as const;
const PATHS = [
  ["sales_recorded", "Recorded by salesperson"],
  ["online", "Online payment"],
  ["single_code", "Code from a recorded sale"],
  ["bulk_codes", "Organization (prepaid codes)"],
  ["direct_grant", "Enrolled by a Super Admin"],
] as const;
const ANY = "any";

export default function SalesBillsPage() {
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const [tab, setTab] = useState<BillTab>(isAdmin ? "waiting" : "all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [repId, setRepId] = useState(ANY);
  const [method, setMethod] = useState(ANY);
  const [path, setPath] = useState(ANY);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = { q: q || undefined, repId: repId === ANY ? undefined : repId, method: method === ANY ? undefined : method, path: path === ANY ? undefined : path, from: from || undefined, to: to || undefined };
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
    if (can("crm.manage_reps")) crmApi.reps().then((r) => setReps(r), () => setReps([]));
  }, [can]);

  const setFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader crumb="Sales & Bills" title="Sales & Bills" subtitle={isAdmin ? "Every sale your team made, and its bill." : "Your sales and their bills."} />

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
          <div className="relative min-w-0 flex-[1_1_220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search by receipt number or student" placeholder="Receipt no. or student" className="pl-8" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
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
          <Select value={method} onValueChange={(v) => setFilter(() => setMethod(v))}>
            <SelectTrigger className="w-full sm:w-[160px]" aria-label="Method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any method</SelectItem>
              {METHODS.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={path} onValueChange={(v) => setFilter(() => setPath(v))}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="How">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any kind</SelectItem>
              {PATHS.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input type="date" aria-label="From" value={from} max={to || undefined} onChange={(e) => setFilter(() => setFrom(e.target.value))} className="w-full sm:w-[150px]" />
            <span className="crm-muted">–</span>
            <Input type="date" aria-label="To" value={to} min={from || undefined} onChange={(e) => setFilter(() => setTo(e.target.value))} className="w-full sm:w-[150px]" />
          </div>
        </div>
        <CrmTabs label="Status" value={tab} onChange={(v) => { setTab(v); setPage(1); }} tabs={TABS.map((t) => ({ ...t, count: counts[t.value] ?? null }))} />
        <DataState loading={loading} error={error} onRetry={load} empty={rows.length === 0} emptyText={tab === "waiting" ? "Nothing waiting for confirmation." : "No sales here. Try another tab or clear the filters."}>
          <CrmTable>
            <thead>
              <tr>
                <th>Receipt no.</th>
                <th>Date</th>
                <th>Student</th>
                <th>Course</th>
                <th>How</th>
                <th className="crm-num">Amount</th>
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
                  <td className="whitespace-nowrap font-semibold">{r.receiptNumber ?? <span className="crm-muted">—</span>}</td>
                  <td className="whitespace-nowrap">
                    {fmtDateTime(r.date)}
                    {r.receivedAt && r.status === "waiting" && <span className="crm-sub">received {fmtDateTime(r.receivedAt)}</span>}
                  </td>
                  <td>{r.leadId ? <Link href={`/dashboard/crm/leads/${r.leadId}`} className="crm-link">{r.studentName}</Link> : r.studentName}</td>
                  <td>{r.courseTitle}</td>
                  <td>
                    {r.pathLabel}
                    <span className="crm-sub">{r.methodLabel}</span>
                  </td>
                  <td className="crm-num">
                    <b>{rs(r.amount)}</b>
                    {r.pricing && <span className="crm-sub">incl. VAT {rs(r.pricing.vatAmount)}</span>}
                    {r.pricing && r.pricing.totalDiscount > 0 && <span className="crm-sub">−{rs(r.pricing.totalDiscount)} disc.</span>}
                  </td>
                  {isAdmin && (
                    <td>
                      {r.organization ? <span className="crm-muted">Organization</span> : r.creditedToName ?? r.recordedByName ?? <span className="crm-muted">—</span>}
                    </td>
                  )}
                  <td>
                    <BillStatusPill status={r.status} label={r.statusLabel} />
                  </td>
                  <td>
                    <div className="crm-actions flex-nowrap">
                      <Button type="button" size="sm" variant="outline" onClick={() => setBillId(r._id)}>
                        Bill
                      </Button>
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
