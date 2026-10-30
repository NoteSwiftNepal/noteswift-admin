"use client";

// Sales & CRM pieces of the lead drawer: the lead's payments (the "Sales"
// section), earlier quotes read-only (R54), and enrolling the lead with an
// unlock code (Super Admin only since R59). The backend decides access
// (Sales: own leads only), which codes may be used and which payment fields
// Sales see.
import { ReactNode, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdmin } from "@/context/admin-context";
import { CrmPill, Tone } from "@/components/crm/ui";
import { CodeRow, Interest, LeadPayment, PAYMENT_METHOD_LABELS, PAYMENT_PATH_LABELS, QUOTE_STATUS_LABELS, Quote, crmApi, rs } from "@/lib/crm/api";
import { BillDialog } from "@/components/crm/bill-dialogs";

const QUOTE_TONE: Record<string, Tone> = { active: "good", pending_approval: "warn" };

const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  completed: { label: "Paid", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
  "pending-gateway": { label: "Pending", tone: "warn" },
  "pending-confirmation": { label: "Waiting confirmation", tone: "warn" },
};
function paymentStatus(p: LeadPayment): { label: string; tone: Tone } {
  if (p.status === "cancelled") return p.rejection ? { label: "Rejected", tone: "bad" } : { label: "Cancelled", tone: "neutral" };
  return PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "warn" };
}

/**
 * The drawer's "Sales" section (S1b, as the prototype): one row per payment
 * (receipt number, course, amount where allowed, method, date, status, Bill).
 * Sales get status only, plus amounts on their own rows (R26); Admin also
 * amounts and credit. Quotes left the sales flow in S7 (R54): earlier ones
 * are listed read-only by EarlierQuotes.
 */
export function LeadSalesSection({ leadId, refreshKey = 0 }: { leadId: string; refreshKey?: number }) {
  const { can } = useAdmin();
  const full = can("crm.view_all_leads");
  const [payments, setPayments] = useState<LeadPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPayments(await crmApi.payments(leadId));
    } catch (e: any) {
      setError(e?.message || "Could not load payments");
    }
  }, [leadId]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // The bill exists for rows in Sales & Bills (the backend re-checks).
  const hasBill = (p: LeadPayment) =>
    full ? p.path === "sales_recorded" || (p.status === "completed" && (p.kind === "qualifying" || p.kind === "bulk" || p.invalidated)) : !!(p.recordedByMe || p.creditedToMe);

  return (
    <section>
      <h3 className="crm-sec-h">Sales</h3>
      {error ? (
        <div className="crm-note bad flex items-center justify-between gap-2" role="alert">
          {error}
          <button type="button" className="crm-btn sm" onClick={load}>
            Try again
          </button>
        </div>
      ) : !payments ? (
        <p className="crm-muted crm-small flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : payments.length === 0 ? (
        <p className="crm-muted crm-small">No sales yet.</p>
      ) : (
        <div className="crm-list">
          {payments.map((p) => {
            const st = paymentStatus(p);
            return (
              <div key={p._id} className="crm-li">
                <div className="crm-who">
                  <b>{p.receiptNumber || "—"}</b> <span className="crm-muted crm-small">· {p.courseTitle || "Course"}</span>
                  <span className="crm-sub">
                    {[p.amount !== undefined ? rs(p.amount) : null, p.paymentMethod ? PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod : PAYMENT_PATH_LABELS[p.path] ?? p.path, fmtDate(p.date)].filter(Boolean).join(" · ")}
                    {full && p.status === "completed" ? ` · credit: ${p.creditedToMe ? "you" : p.creditReason?.replace(/_/g, " ") || "not decided yet"}` : p.creditedToMe ? " · credited to you" : ""}
                  </span>
                  {(p.rejection || p.cancellation) && <span className="crm-sub">{(p.rejection ?? p.cancellation)!.reason}</span>}
                </div>
                <div className="crm-actions">
                  <CrmPill tone={st.tone}>{st.label}</CrmPill>
                  {p.invalidated && <CrmPill tone="bad">Invalid</CrmPill>}
                  {p.kind === "complimentary" && <CrmPill>Free</CrmPill>}
                  {p.duplicatePaymentOf && <CrmPill tone="warn">Paid twice</CrmPill>}
                  {hasBill(p) && (
                    <button type="button" className="crm-btn sm" onClick={() => setBillId(p._id)}>
                      Bill
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <BillDialog paymentId={billId} onOpenChange={(v) => !v && setBillId(null)} />
    </section>
  );
}

/** Quotes made before S7, read-only history (R54). Renders nothing when there are none. */
export function EarlierQuotes({ leadId, interests, children }: { leadId: string; interests: Interest[]; children: (list: ReactNode) => ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  useEffect(() => {
    crmApi.quotes(leadId).then(setQuotes, () => setQuotes([]));
  }, [leadId]);
  if (quotes.length === 0) return null;
  const titleOf = (interestId: string) => interests.find((i) => i._id === interestId)?.title || "Course";
  return (
    <>
      {children(
        <div className="crm-list">
          {quotes.map((q) => (
            <div key={q._id} className="crm-li">
              <div className="crm-who">
                <b>Quote</b> <span className="crm-muted crm-small">· {titleOf(q.interestId)}</span>
                <span className="crm-sub">
                  {rs(q.price.total)} (list {rs(q.price.listPrice)}, {q.discountPercent}% off{q.discountCode ? `, promo code ${q.discountCode}` : q.applyCourseDiscount ? ", course discount" : ""}) · made {fmtDate(q.createdAt)}
                </span>
              </div>
              <CrmPill tone={QUOTE_TONE[q.status] ?? "neutral"}>{QUOTE_STATUS_LABELS[q.status]}</CrmPill>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/**
 * Enroll the lead's student with an unlock code. Sales choose from codes
 * allocated to them; a Super Admin from any usable, unallocated code. The
 * sale is the code's own record; this only uses the code.
 */
export function EnrollWithCodeDialog({ leadId, open, onOpenChange, onDone }: { leadId: string; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { productRole } = useAdmin();
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [codeId, setCodeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setCodeId("");
    setError(null);
    setLoading(true);
    (productRole === "sales" ? crmApi.myCodes() : crmApi.codesForAllocation({}))
      .then(setCodes)
      .catch((e) => setError(e?.message || "Could not load codes"))
      .finally(() => setLoading(false));
  }, [open, productRole]);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await crmApi.enrollWithCode(leadId, codeId);
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      setError(e?.message || "Could not enroll");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll with a code</DialogTitle>
          <DialogDescription>The student gets the code&apos;s course right away and the code is used up. This can&apos;t be undone here.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{productRole === "sales" ? "You have no codes. Ask an Admin to allocate some." : "No usable codes."}</p>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="enroll-code">Code</Label>
            <Select value={codeId} onValueChange={setCodeId}>
              <SelectTrigger id="enroll-code">
                <SelectValue placeholder="Choose a code" />
              </SelectTrigger>
              <SelectContent>
                {codes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.courseTitle || "Course"} · …{c.last4 || "????"} · {c.kind === "prepaid_batch" ? "prepaid batch" : "single sale"}
                    {c.expiresOn ? ` · expires ${new Date(c.expiresOn).toLocaleDateString()}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !codeId}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
