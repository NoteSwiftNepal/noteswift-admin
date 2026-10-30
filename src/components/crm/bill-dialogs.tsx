"use client";

// Sales & Bills dialogs (Phase S3): the bill, confirming a Sales-recorded
// payment, and recording one from a lead (a panel in the lead drawer, S1b).
// Every rule (price, who may confirm, what is redacted, who gets the PDF) is
// the backend's; these only show what it returns and send what the user chose.
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CrmFacts, CrmNote, CrmPill } from "@/components/crm/ui";
import { Field, Panel, Sel } from "@/components/crm/leads/controls";
import { BILL_STATUS_TONE, Bill, BillRow, Interest, OFFLINE_METHOD_LABELS, PaymentPreview, crmApi, fmtDateTime, rs } from "@/lib/crm/api";

const STAMP_COLOR: Record<string, string> = { good: "var(--crm-good)", warn: "var(--crm-warn)", bad: "var(--crm-bad)", neutral: "var(--crm-muted)" };
const STAMP_TEXT: Record<string, string> = { confirmed: "Paid · Confirmed", waiting: "Pending confirmation", rejected: "Rejected", cancelled: "Cancelled", invalid: "Invalid", other: "—" };

async function openScreenshot(id: string, toast: ReturnType<typeof useToast>["toast"]) {
  // Open the tab first (popup blockers allow it only in the click), then point it at the signed link.
  const win = window.open("", "_blank");
  if (win) win.opener = null;
  try {
    const { url } = await crmApi.screenshotLink(id);
    if (win) win.location.href = url;
    else window.open(url, "_blank", "noopener");
  } catch (e: any) {
    win?.close();
    toast({ title: "Could not open the screenshot", description: e?.message, variant: "destructive" });
  }
}

/** The on-screen bill (prototype layout), redacted by the backend per role. */
export function BillDialog({ paymentId, onOpenChange }: { paymentId: string | null; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    if (!paymentId) return;
    setBill(null);
    setError(null);
    crmApi.bill(paymentId).then(setBill, (e) => setError(e?.message || "Could not load the bill"));
  }, [paymentId]);
  const tone = bill ? BILL_STATUS_TONE[bill.status] : "neutral";
  return (
    <Dialog open={!!paymentId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-48px)] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Bill {bill?.receiptNumber ?? ""}</DialogTitle>
          <DialogDescription className="sr-only">Payment receipt details</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !bill ? (
          <div className="crm-empty flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 rounded-xl border p-[18px]">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0">
                <b className="crm-display text-base">{bill.seller.name}</b>
                <span className="crm-sub">{bill.seller.address}</span>
                <span className="crm-sub">VAT No: {bill.seller.vatNumber}</span>
                <span className="crm-sub">Payment receipt</span>
              </div>
              <span
                className="crm-display self-start rounded-md border-2 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.08em]"
                style={{ color: STAMP_COLOR[tone], borderColor: "currentColor", transform: "rotate(-4deg)" }}
              >
                {STAMP_TEXT[bill.status]}
              </span>
            </div>
            <CrmFacts
              items={[
                { label: "Receipt no.", value: bill.receiptNumber ?? bill.receiptNote ?? "—" },
                { label: "Date", value: fmtDateTime(bill.dates.paidAt ?? bill.dates.recordedAt) },
                { label: "Student", value: bill.student.name },
                ...(bill.student.phone ? [{ label: "Phone", value: bill.student.phone }] : []),
                ...(bill.dates.receivedAt ? [{ label: "Money received", value: fmtDateTime(bill.dates.receivedAt) }] : []),
              ]}
            />
            <div className="crm-tw">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="crm-num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.label}</td>
                      <td className="crm-num">{it.amount < 0 ? `− ${rs(-it.amount)}` : rs(it.amount)}</td>
                    </tr>
                  ))}
                  {bill.totals.taxableAmount != null && (
                    <>
                      <tr>
                        <td className="crm-muted">Taxable amount</td>
                        <td className="crm-num crm-muted">{rs(bill.totals.taxableAmount)}</td>
                      </tr>
                      <tr>
                        <td className="crm-muted">VAT ({bill.totals.vatRate}%)</td>
                        <td className="crm-num crm-muted">{rs(bill.totals.vatAmount)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>
                      <b>Total paid</b>
                      {bill.totals.pricesIncludeVat && <span className="crm-sub">Prices include VAT</span>}
                    </td>
                    <td className="crm-num">
                      <b>{rs(bill.totals.total)}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="crm-small">
              <span className="crm-muted">Amount in words: </span>
              {bill.amountInWords}
            </p>
            <CrmFacts
              items={[
                { label: "Paid by", value: `${bill.payment.methodLabel}${bill.payment.reference ? ` · ${bill.payment.reference}` : ""}` },
                { label: "How", value: bill.payment.pathLabel },
                ...(bill.people.recordedBy ? [{ label: "Recorded by", value: bill.people.recordedBy }] : []),
                ...(bill.people.confirmedBy ? [{ label: "Confirmed by", value: `${bill.people.confirmedBy}${bill.dates.decidedAt ? ` · ${fmtDateTime(bill.dates.decidedAt)}` : ""}` }] : []),
                ...(bill.people.rejectedBy ? [{ label: "Rejected by", value: bill.people.rejectedBy }] : []),
                ...(bill.people.creditedTo ? [{ label: "Credited to", value: bill.people.creditedTo }] : []),
                ...(bill.reason ? [{ label: bill.status === "rejected" ? "Rejected because" : "Cancelled because", value: bill.reason }] : []),
              ]}
            />
            {bill.invalidated && <CrmNote tone="bad">Marked invalid by a Super Admin: this payment no longer counts as a sale.</CrmNote>}
            <p className="crm-muted text-center text-xs">{bill.footer}</p>
          </div>
        )}
        <DialogFooter className="gap-2">
          {bill?.canViewScreenshot && paymentId && (
            <Button type="button" variant="outline" onClick={() => openScreenshot(paymentId, toast)}>
              <ExternalLink className="mr-1 h-4 w-4" /> View screenshot
            </Button>
          )}
          {bill?.canDownloadPdf && paymentId && (
            <Button
              type="button"
              variant="outline"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  await crmApi.downloadReceipt(paymentId);
                } catch (e: any) {
                  toast({ title: "Could not download the receipt", description: e?.message, variant: "destructive" });
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} Download PDF
            </Button>
          )}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirm a Sales-recorded payment: shows what was recorded and needs the "money arrived" tick (R20). */
export function ConfirmPaymentDialog({ row, onOpenChange, onDone }: { row: BillRow | null; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { toast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!row) return;
    setChecked(false);
    setError(null);
    setBill(null);
    crmApi.bill(row._id).then(setBill, () => setBill(null));
  }, [row]);
  const submit = async () => {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await crmApi.confirmPayment(row._id, row.amount);
      toast({ title: "Payment confirmed", description: "The student has the course and the sale counts." });
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      const msg = e?.code === "QUOTE_STALE" ? "The price changed or the promo code is no longer valid. Reject this payment and ask the salesperson to record it again." : e?.message || "Could not confirm";
      setError(msg);
      toast({ title: "Not confirmed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!row} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm payment</DialogTitle>
          <DialogDescription>The student gets the course and the sale counts for the salesperson once you confirm.</DialogDescription>
        </DialogHeader>
        {row && (
          <CrmFacts
            items={[
              { label: "Amount", value: <b>{rs(row.amount)}</b> },
              { label: "Paid by", value: `${row.methodLabel}${bill?.payment.reference ? ` · ${bill.payment.reference}` : ""}` },
              { label: "Student", value: row.studentName },
              { label: "Course", value: row.courseTitle },
              { label: "Money received", value: fmtDateTime(row.receivedAt) },
              { label: "Recorded by", value: row.recordedByName ?? "—" },
            ]}
          />
        )}
        {row?.canViewScreenshot && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => openScreenshot(row._id, toast)}>
            <ExternalLink className="mr-1 h-4 w-4" /> View screenshot
          </Button>
        )}
        <div className="flex items-start gap-2">
          <Checkbox id="confirm-checked" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
          <Label htmlFor="confirm-checked" className="leading-snug">
            I checked the money arrived in the company account
          </Label>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="bg-[var(--crm-good)] text-white hover:bg-[var(--crm-good)] hover:brightness-110" onClick={submit} disabled={busy || !checked}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MAX_SCREENSHOT = 5 * 1024 * 1024;
const SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const dayInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * Record a payment on the lead (Sales, R19–R21), drawn as the prototype's
 * "Record sale" panel in the lead drawer (S1b): the server's price, read-only,
 * never typed.
 */
export function RecordPaymentPanel({ leadId, interests, initialInterestId, onDone, onCancel }: { leadId: string; interests: Interest[]; initialInterestId?: string | null; onDone: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const openOnes = useMemo(() => interests.filter((i) => i.status === "open"), [interests]);
  const [interestId, setInterestId] = useState(initialInterestId || openOnes[0]?._id || "");
  const [preview, setPreview] = useState<PaymentPreview | null>(null);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [received, setReceived] = useState(dayInput(new Date()));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key per opened panel: a double click or a retry sends the same key.
  const [idempotencyKey] = useState(newKey);
  const today = new Date();
  const minDay = dayInput(new Date(today.getTime() - 7 * 86_400_000));

  useEffect(() => {
    if (!interestId) return;
    setPreview(null);
    crmApi.paymentPreview(leadId, interestId).then(setPreview, (e) => setPreview({ canRecord: false, reason: e?.message || "Could not price this course", code: null, interestId, courseId: null, source: null, quoteId: null, price: null }));
  }, [leadId, interestId]);

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) return setFile(null);
    if (!SCREENSHOT_TYPES.includes(f.type)) return setError("The screenshot must be a JPG, PNG, WEBP or PDF file.");
    if (f.size > MAX_SCREENSHOT) return setError("The screenshot is larger than 5 MB.");
    setFile(f);
  };

  const needsReference = method !== "cash" && !file;
  const valid = !!preview?.canRecord && (!needsReference || reference.trim().length > 0) && received >= minDay && received <= dayInput(today);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("interestId", interestId);
      form.set("method", method);
      if (reference.trim()) form.set("reference", reference.trim());
      // The chosen day at the current time of day (or end of an earlier day), never in the future.
      const now = new Date();
      const day = new Date(`${received}T00:00:00`);
      const receivedAt = received === dayInput(now) ? now : new Date(day.getTime() + 18 * 3600_000);
      form.set("receivedAt", receivedAt.toISOString());
      if (note.trim()) form.set("note", note.trim());
      form.set("idempotencyKey", idempotencyKey);
      if (file) form.set("screenshot", file);
      await crmApi.recordPayment(leadId, form);
      toast({ title: "Payment recorded", description: "An Admin confirms it before it counts." });
      onDone();
    } catch (e: any) {
      const msg = e?.status === 503 ? "Screenshot upload isn't set up yet. Enter the transaction ID instead." : e?.message || "Could not record the payment";
      setError(msg);
      toast({ title: "Not recorded", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const p = preview?.price;
  return (
    <Panel title="Record payment" onSubmit={submit} submitLabel="Record payment" onCancel={onCancel} busy={busy} error={error} canSubmit={valid}>
      <div className="crm-form">
        <Field label="Course" full>
          <Sel value={interestId} onChange={(e) => setInterestId(e.target.value)} options={openOnes.map((i) => ({ value: i._id, label: i.title }))} />
        </Field>
        <div className="crm-full rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] p-3 text-[13px]">
          {!preview ? (
            <span className="crm-muted flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Getting the price…
            </span>
          ) : !preview.canRecord ? (
            <span className="crm-late">{preview.reason}</span>
          ) : p ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>List price</span>
                <span>{rs(p.listPrice)}</span>
              </div>
              {p.courseDiscountAmount > 0 && (
                <div className="flex justify-between text-[var(--crm-good)]">
                  <span>Course discount ({p.courseDiscountPercent}%)</span>
                  <span>− {rs(p.courseDiscountAmount)}</span>
                </div>
              )}
              {p.codeDiscountAmount > 0 && (
                <div className="flex justify-between text-[var(--crm-good)]">
                  <span>
                    Promo code {p.discountCode} ({p.codeDiscountPercent}%)
                  </span>
                  <span>− {rs(p.codeDiscountAmount)}</span>
                </div>
              )}
              <div className="crm-muted flex justify-between text-xs">
                <span>Taxable amount · VAT ({p.vatRate}%)</span>
                <span>
                  {rs(p.taxableAmount)} · {rs(p.vatAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--crm-line)] pt-1">
                <span>Total</span>
                <b>{rs(p.total)}</b>
              </div>
              <span className="crm-sub">From the {preview.source === "approved_quote" ? "approved quote" : "list price"}. Prices include VAT.</span>
            </div>
          ) : null}
        </div>
        <Field label="Paid by">
          <Sel value={method} onChange={(e) => setMethod(e.target.value)} options={Object.entries(OFFLINE_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Money received on">
          <input className="crm-input" type="date" min={minDay} max={dayInput(today)} value={received} onChange={(e) => setReceived(e.target.value)} />
        </Field>
        <Field label={method === "cash" ? "Receipt note (optional)" : "Transaction ID"} full>
          <input className="crm-input" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} placeholder={method === "cash" ? "e.g. Collected at school visit" : "e.g. 7Q4K29XA"} />
        </Field>
        <Field label="Screenshot (optional; JPG, PNG, WEBP or PDF, up to 5 MB)" full>
          <input className="crm-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="Note (optional)" full>
          <textarea className="crm-input" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <CrmNote>The bill is created now. An Admin checks the money arrived before the student gets the course, and it counts toward your target only after that.</CrmNote>
    </Panel>
  );
}

export function BillStatusPill({ status, label }: { status: BillRow["status"]; label: string }) {
  return <CrmPill tone={BILL_STATUS_TONE[status]}>{label}</CrmPill>;
}
