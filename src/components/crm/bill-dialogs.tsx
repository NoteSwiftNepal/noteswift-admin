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
import { BILL_STATUS_TONE, Bill, BillRow, Interest, LeadCourse, OFFLINE_METHOD_LABELS, PaymentPreview, crmApi, fetchCourseCatalog, fmtDateTime, rs } from "@/lib/crm/api";

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
                ...(bill.people.creditedTo ? [{ label: "Credited to", value: bill.people.creditedTo }] : bill.status === "waiting" ? [{ label: "Credit goes to", value: bill.people.creditOwner ?? "No salesperson" }] : []),
                ...(bill.courseUnconfirmed ? [{ label: "Course", value: <span className="crm-late">Course not confirmed</span> }] : []),
                ...(bill.amountMismatch ? [{ label: "Amount received", value: <span className="crm-late">{rs(bill.amountReceived)}</span> }] : []),
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

/**
 * Confirm a recorded sale: shows what was recorded and needs the "money
 * arrived" tick (R20). A flagged discount is approved by confirming (R57); a
 * sale without a course, or whose amount received doesn't match the course's
 * total, gets its course set here first (R58).
 */
export function ConfirmPaymentDialog({ row, onOpenChange, onDone }: { row: BillRow | null; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { toast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cur, setCur] = useState<{ amount: number; amountReceived: number | null; courseUnconfirmed: boolean; courseTitle: string; discount: BillRow["discount"] } | null>(null);
  const [courses, setCourses] = useState<{ _id: string; title: string; price?: number; type?: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [discount, setDiscount] = useState("");
  useEffect(() => {
    if (!row) return;
    setChecked(false);
    setError(null);
    setBill(null);
    setCur({ amount: row.amount, amountReceived: row.amountReceived, courseUnconfirmed: row.courseUnconfirmed, courseTitle: row.courseTitle, discount: row.discount });
    setCourseId(row.courseId || "");
    setDiscount("");
    crmApi.bill(row._id).then(setBill, () => setBill(null));
    if (row.courseUnconfirmed || row.amountMismatch) fetchCourseCatalog().then((c) => setCourses(c.filter((x: any) => x.type !== "free" && (x.price ?? 0) > 0)));
  }, [row]);
  const mismatch = !!cur && cur.amountReceived !== null && cur.amountReceived !== cur.amount && !cur.courseUnconfirmed;
  const needsCourse = !!cur && (cur.courseUnconfirmed || mismatch);

  const setCourse = async () => {
    if (!row || !courseId) return;
    setBusy(true);
    setError(null);
    try {
      const p = await crmApi.setPaymentCourse(row._id, courseId, discount === "" ? undefined : Number(discount));
      const title = courses.find((c) => c._id === courseId)?.title || "Course";
      setCur({ amount: p.amount, amountReceived: p.amountReceived, courseUnconfirmed: false, courseTitle: title, discount: p.discount ? { ...p.discount, limitPercent: 0, approved: false } : null });
      toast({ title: "Course set", description: p.amountReceived !== null && p.amountReceived !== p.amount ? "The amount received doesn't match the course's total." : "The sale can be confirmed now." });
      onDone();
    } catch (e: any) {
      setError(e?.message || "Could not set the course");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!row || !cur) return;
    setBusy(true);
    setError(null);
    try {
      await crmApi.confirmPayment(row._id, cur.amount);
      toast({ title: "Sale confirmed", description: "The student has the course and the sale counts." });
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      const msg = e?.code === "AMOUNT_CHANGED" ? "The amount changed meanwhile. Close this and open it again." : e?.message || "Could not confirm";
      setError(msg);
      toast({ title: "Not confirmed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!row} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[calc(100vh-48px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm sale</DialogTitle>
          <DialogDescription>The student gets the course and the sale counts once you confirm.</DialogDescription>
        </DialogHeader>
        {row && cur && (
          <CrmFacts
            items={[
              { label: "Amount", value: <b>{rs(cur.amount)}</b> },
              ...(cur.amountReceived !== null && (cur.courseUnconfirmed || mismatch) ? [{ label: "Amount received", value: <b className={mismatch ? "crm-late" : undefined}>{rs(cur.amountReceived)}</b> }] : []),
              ...(cur.discount && cur.discount.amount > 0
                ? [{ label: "Discount", value: <span style={cur.discount.needsApproval ? { color: "var(--crm-warn)", fontWeight: 600 } : undefined}>{rs(cur.discount.amount)} ({cur.discount.percent}%)</span> }]
                : []),
              { label: "Paid by", value: `${row.methodLabel}${bill?.payment.reference ? ` · ${bill.payment.reference}` : ""}` },
              { label: "Student", value: row.studentName },
              { label: "Course", value: cur.courseUnconfirmed ? <span className="crm-late">Course not confirmed</span> : cur.courseTitle },
              { label: "Money received", value: fmtDateTime(row.receivedAt) },
              { label: "Recorded by", value: row.recordedByName ?? "—" },
              { label: "Credit goes to", value: row.creditOwnerName ?? "No salesperson" },
            ]}
          />
        )}
        {cur?.discount?.needsApproval && cur.discount.amount > 0 && <CrmNote>Needs approval: confirming approves this discount.</CrmNote>}
        {mismatch && cur && (
          <p className="crm-late text-sm">
            {rs(cur.amountReceived)} was received but the course&apos;s total is {rs(cur.amount)}. Reject it, or change the course or discount below.
          </p>
        )}
        {needsCourse && (
          <div className="crm-panel">
            <h3>{cur?.courseUnconfirmed ? "Set the course" : "Change the course"}</h3>
            <div className="crm-form">
              <Field label="Course" full>
                <Sel value={courseId} onChange={(e) => setCourseId(e.target.value)} options={[{ value: "", label: "Choose a course" }, ...courses.map((c) => ({ value: c._id, label: `${c.title}${c.price ? ` · ${rs(c.price)}` : ""}` }))]} />
              </Field>
              <Field label="Discount (Rs, optional)">
                <input className="crm-input" type="number" min={0} step={1} value={discount} placeholder="Public discount" onChange={(e) => setDiscount(e.target.value)} />
              </Field>
            </div>
            <div className="crm-actions">
              <button type="button" className="crm-btn sm primary" disabled={!courseId || busy} onClick={setCourse}>
                Set course
              </button>
            </div>
          </div>
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
          <Button type="button" className="bg-[var(--crm-good)] text-white hover:bg-[var(--crm-good)] hover:brightness-110" onClick={submit} disabled={busy || !checked || needsCourse}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm sale
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

const UNCONFIRMED = "unconfirmed";

/**
 * "Record sale" (S7, R55–R58), the prototype's panel in the lead drawer. The
 * course list holds the lead's Payment pending and Interested courses (S8b),
 * then the other paid courses, then "Course not confirmed yet". The discount starts at the
 * course's public discount; the server prices it (preview) and flags a
 * discount above the limit. Sales on their own leads, Admin and Super Admin
 * on any lead; someone else always confirms.
 */
export function RecordSalePanel({
  leadId,
  interests,
  leadCourses = [],
  courses,
  onDone,
  onCancel,
}: {
  leadId: string;
  interests: Interest[];
  /** The lead's courses (R67); Payment pending and Interested ones come first. */
  leadCourses?: LeadCourse[];
  courses: { _id: string; title: string; price?: number; type?: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const openOnes = useMemo(() => {
    const price = (id: string) => interests.find((i) => i.courseId === id)?.listPrice ?? courses.find((c) => c._id === id)?.price ?? null;
    const fromCourses = leadCourses.filter((c) => c.state === "payment_pending" || c.state === "interested").map((c) => ({ _id: c.courseId, courseId: c.courseId, title: c.title, listPrice: price(c.courseId) }));
    const rest = interests.filter((i) => i.status === "open" && !fromCourses.some((c) => c.courseId === i.courseId)).map((i) => ({ _id: i._id, courseId: i.courseId, title: i.title, listPrice: i.listPrice }));
    return [...fromCourses, ...rest];
  }, [interests, leadCourses, courses]);
  const otherPaid = useMemo(() => courses.filter((c) => c.type !== "free" && (c.price ?? 0) > 0 && !openOnes.some((i) => i.courseId === c._id)), [courses, openOnes]);
  const [courseId, setCourseId] = useState(openOnes[0]?.courseId || otherPaid[0]?._id || UNCONFIRMED);
  const [discount, setDiscount] = useState<string>(""); // "" until the server's public discount arrives
  const [amountReceived, setAmountReceived] = useState("");
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
  const unconfirmed = courseId === UNCONFIRMED;

  // A new course starts from its public discount.
  useEffect(() => {
    setDiscount("");
  }, [courseId]);
  // The server's price for this course and discount (debounced while typing).
  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    const t = setTimeout(() => {
      crmApi
        .paymentPreview(leadId, { courseId, ...(discount !== "" && !unconfirmed ? { discount } : {}) })
        .then((p) => {
          if (cancelled) return;
          setPreview(p);
          if (discount === "" && p.price) setDiscount(String(p.price.discount));
        })
        .catch((e) => !cancelled && setPreview({ canRecord: false, reason: e?.message || "Could not price this course", code: null, courseId, interestId: null, unconfirmed, price: null, needsApproval: false }));
    }, discount === "" ? 0 : 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [leadId, courseId, discount, unconfirmed]);

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) return setFile(null);
    if (!SCREENSHOT_TYPES.includes(f.type)) return setError("The screenshot must be a JPG, PNG, WEBP or PDF file.");
    if (f.size > MAX_SCREENSHOT) return setError("The screenshot is larger than 5 MB.");
    setFile(f);
  };

  const needsReference = method !== "cash" && !file;
  const amountOk = !unconfirmed || (/^\d+$/.test(amountReceived) && Number(amountReceived) > 0);
  const valid = !!preview?.canRecord && amountOk && (!needsReference || reference.trim().length > 0) && received >= minDay && received <= dayInput(today);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("courseId", courseId);
      if (unconfirmed) form.set("amountReceived", amountReceived);
      else form.set("discount", discount || "0");
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
      toast({ title: "Sale recorded", description: "It counts once an Admin confirms it." });
      onDone();
    } catch (e: any) {
      const msg = e?.status === 503 ? "Screenshot upload isn't set up yet. Enter the transaction ID instead." : e?.message || "Could not record the sale";
      setError(msg);
      toast({ title: "Not recorded", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const p = preview?.price;
  return (
    <Panel title="Record sale" onSubmit={submit} submitLabel="Record sale" onCancel={onCancel} busy={busy} error={error} canSubmit={valid}>
      <div className="crm-form">
        <Field label="Course" full>
          <select className="crm-input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {openOnes.length > 0 && (
              <optgroup label="Payment pending and interested">
                {openOnes.map((i) => (
                  <option key={i._id} value={i.courseId}>
                    {i.title}
                    {i.listPrice ? ` · ${rs(i.listPrice)}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {otherPaid.length > 0 && (
              <optgroup label="Other courses">
                {otherPaid.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                    {c.price ? ` · ${rs(c.price)}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            <option value={UNCONFIRMED}>Course not confirmed yet</option>
          </select>
        </Field>
        {unconfirmed ? (
          <Field label="Amount received (Rs)">
            <input className="crm-input" inputMode="numeric" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 4500" required />
          </Field>
        ) : (
          <Field label="Discount (Rs)">
            <input className="crm-input" type="number" min={0} max={p ? p.listPrice - 1 : undefined} step={1} value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
        )}
        <Field label="Paid by">
          <Sel value={method} onChange={(e) => setMethod(e.target.value)} options={Object.entries(OFFLINE_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label={method === "cash" ? "Receipt note (optional)" : "Transaction ID"} full>
          <input className="crm-input" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} placeholder={method === "cash" ? "e.g. Collected at school visit" : "e.g. 7Q4K29XA (or attach a screenshot)"} required={needsReference} />
        </Field>
        <Field label="Money received on">
          <input className="crm-input" type="date" min={minDay} max={dayInput(today)} value={received} onChange={(e) => setReceived(e.target.value)} />
        </Field>
        <Field label="Screenshot (optional)">
          <input className="crm-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="Note (optional)" full>
          <textarea className="crm-input" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!preview ? (
          <span className="crm-muted flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Getting the price…
          </span>
        ) : !preview.canRecord ? (
          <span className="crm-late">{preview.reason}</span>
        ) : unconfirmed ? (
          <span>
            Total <b>{amountOk ? rs(Number(amountReceived)) : "—"}</b> <span className="crm-muted crm-small">· the course is set before it can be confirmed</span>
          </span>
        ) : p ? (
          <>
            <span>
              Total <b>{rs(p.total)}</b>
              <span className="crm-sub">
                {rs(p.listPrice)} − {rs(p.discount)} discount · taxable {rs(p.taxableAmount)} + VAT {p.vatRate}% {rs(p.vatAmount)}
              </span>
            </span>
            {preview.needsApproval && <CrmPill tone="warn">{Math.round(p.discountPercent)}% discount · needs approval</CrmPill>}
          </>
        ) : null}
      </div>
      <CrmNote>The sale counts after an Admin checks the payment. The student gets the course when it&apos;s confirmed.</CrmNote>
    </Panel>
  );
}

export function BillStatusPill({ status, label }: { status: BillRow["status"]; label: string }) {
  return <CrmPill tone={BILL_STATUS_TONE[status]}>{label}</CrmPill>;
}
