"use client";

// The lead drawer's "Sales" section: the lead's payments and bills. The
// backend decides access (Sales: own leads only) and which payment fields
// Sales see. (Quotes and the code dialog were removed in S8, R62 / R65.)
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdmin } from "@/context/admin-context";
import { CrmPill, Tone } from "@/components/crm/ui";
import { LeadPayment, PAYMENT_METHOD_LABELS, PAYMENT_PATH_LABELS, crmApi, rs } from "@/lib/crm/api";
import { BillDialog } from "@/components/crm/bill-dialogs";

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
 * amounts and credit.
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

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
