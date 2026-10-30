"use client";

// Sales & CRM Phase 4 pieces of the lead drawer: the lead's payments and
// quotes (the "Sales" section), and enrolling the lead with an unlock code. The backend decides
// access (Sales: own leads only), discount approval, which codes may be used
// and which payment fields Sales see.
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { ReasonDialog } from "@/components/crm/crm-ui";
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
 * (receipt number, course, amount where allowed, method, date, status, Bill),
 * then the quotes with Approve / Reject / Cancel as allowed, and "New quote".
 * Sales get status only, plus amounts on their own rows (R26); Admin also
 * amounts and credit. A quote offers only what checkout can charge and never
 * moves money.
 */
export function LeadSalesSection({ leadId, interests, refreshKey = 0, onChanged }: { leadId: string; interests: Interest[]; refreshKey?: number; onChanged: () => void }) {
  const { can } = useAdmin();
  const { toast } = useToast();
  const full = can("crm.view_all_leads");
  const [payments, setPayments] = useState<LeadPayment[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [reason, setReason] = useState<null | { title: string; confirmLabel: string; destructive?: boolean; run: (r: string) => Promise<unknown> }>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, q] = await Promise.all([crmApi.payments(leadId), crmApi.quotes(leadId)]);
      setPayments(p);
      setQuotes(q);
    } catch (e: any) {
      setError(e?.message || "Could not load payments and quotes");
    }
  }, [leadId]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const done = async (title: string) => {
    toast({ title });
    await load();
    onChanged();
  };
  const fail = (e: any) => toast({ title: "Not done", description: e?.message, variant: "destructive" });
  const open = interests.filter((i) => i.status === "open");
  const titleOf = (interestId: string) => interests.find((i) => i._id === interestId)?.title || "Course";
  // The bill exists for rows in Sales & Bills (the backend re-checks).
  const hasBill = (p: LeadPayment) =>
    full ? p.path === "sales_recorded" || (p.status === "completed" && (p.kind === "qualifying" || p.kind === "bulk" || p.invalidated)) : !!(p.recordedByMe || p.creditedToMe);

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h3 className="crm-sec-h">Sales</h3>
        {can("crm.manage_quotes") && open.length > 0 && (
          <button type="button" className="crm-btn sm" onClick={() => setQuoteOpen(true)}>
            New quote
          </button>
        )}
      </div>
      {error ? (
        <div className="crm-note bad flex items-center justify-between gap-2" role="alert">
          {error}
          <button type="button" className="crm-btn sm" onClick={load}>
            Try again
          </button>
        </div>
      ) : !payments || !quotes ? (
        <p className="crm-muted crm-small flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : payments.length === 0 && quotes.length === 0 ? (
        <p className="crm-muted crm-small">No payments or quotes yet.</p>
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
          {quotes.map((q) => (
            <div key={q._id} className="crm-li">
              <div className="crm-who">
                <b>Quote</b> <span className="crm-muted crm-small">· {titleOf(q.interestId)}</span>
                <span className="crm-sub">
                  {rs(q.price.total)} (list {rs(q.price.listPrice)}, {q.discountPercent}% off{q.discountCode ? `, promo code ${q.discountCode}` : q.applyCourseDiscount ? ", course discount" : ""}) · valid until {fmtDate(q.expiresAt)}
                </span>
                {q.approval.required && q.status === "pending_approval" && <span className="crm-sub">The discount needs approval by someone other than its creator.</span>}
                {q.note && <span className="crm-sub">{q.note}</span>}
              </div>
              <div className="crm-actions">
                <CrmPill tone={QUOTE_TONE[q.status] ?? "neutral"}>{QUOTE_STATUS_LABELS[q.status]}</CrmPill>
                {q.status === "pending_approval" && q.canDecide && (
                  <>
                    <button type="button" className="crm-btn sm good" onClick={() => crmApi.decideQuote(q._id, true).then(() => done("Quote approved"), fail)}>
                      Approve
                    </button>
                    <button type="button" className="crm-btn sm" onClick={() => setReason({ title: "Reject quote", confirmLabel: "Reject", destructive: true, run: (r) => crmApi.decideQuote(q._id, false, r).then(() => done("Quote rejected")) })}>
                      Reject
                    </button>
                  </>
                )}
                {(q.status === "active" || q.status === "pending_approval") && can("crm.manage_quotes") && (
                  <button type="button" className="crm-btn sm" onClick={() => setReason({ title: "Cancel quote", confirmLabel: "Cancel quote", destructive: true, run: (r) => crmApi.cancelQuote(q._id, r).then(() => done("Quote cancelled")) })}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <CreateQuoteDialog open={quoteOpen} interests={open} onClose={() => setQuoteOpen(false)} onDone={() => done("Quote created")} />
      <ReasonDialog
        open={!!reason}
        onOpenChange={(v) => !v && setReason(null)}
        title={reason?.title || ""}
        confirmLabel={reason?.confirmLabel || "OK"}
        destructive={reason?.destructive}
        onConfirm={async (r) => {
          await reason!.run(r);
        }}
      />
      <BillDialog paymentId={billId} onOpenChange={(v) => !v && setBillId(null)} />
    </section>
  );
}

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

function CreateQuoteDialog({ open, interests, onClose, onDone }: { open: boolean; interests: Interest[]; onClose: () => void; onDone: () => void }) {
  const [interestId, setInterestId] = useState("");
  const interest = open ? interests.find((i) => i._id === interestId) ?? null : null;
  const [mode, setMode] = useState<"none" | "course" | "code">("none");
  const [code, setCode] = useState("");
  const [validDays, setValidDays] = useState("7");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setInterestId(interests[0]?._id ?? "");
      setMode("none");
      setCode("");
      setNote("");
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!interest) return;
    setBusy(true);
    setError(null);
    try {
      await crmApi.createQuote(interest._id, {
        applyCourseDiscount: mode === "course",
        discountCode: mode === "code" ? code.trim() : undefined,
        validDays: Number(validDays) || undefined,
        note: note.trim() || undefined,
      });
      onClose();
      onDone();
    } catch (e: any) {
      setError(e?.message || "Could not create the quote");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New quote{interest ? `: ${interest.title}` : ""}</DialogTitle>
          <DialogDescription>The price is calculated by the server. A discount above your limit waits for approval. A new quote replaces the current one.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {interests.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="quote-course">Course</Label>
              <Select value={interestId} onValueChange={setInterestId}>
                <SelectTrigger id="quote-course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interests.map((i) => (
                    <SelectItem key={i._id} value={i._id}>
                      {i.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="quote-discount">Discount</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger id="quote-discount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">List price</SelectItem>
                <SelectItem value="course">The course&apos;s own discount</SelectItem>
                <SelectItem value="code">A promo code</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "code" && (
            <div className="space-y-1">
              <Label htmlFor="quote-code">Promo code</Label>
              <Input id="quote-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="quote-days">Valid for (days, 1 to 30)</Label>
            <Input id="quote-days" type="number" min={1} max={30} value={validDays} onChange={(e) => setValidDays(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quote-note">Note (optional)</Label>
            <Textarea id="quote-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || (mode === "code" && !code.trim())}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
