"use client";

// Sales & CRM Phase 4 pieces of the lead profile: quotes, the lead's
// payments, and enrolling the lead with an unlock code. The backend decides
// access (Sales: own leads only), discount approval, which codes may be used
// and which payment fields Sales see.
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState, ReasonDialog } from "@/components/crm/crm-ui";
import { CrmPill, GOOD_BUTTON, Tone } from "@/components/crm/ui";
import { CodeRow, Interest, LeadPayment, PAYMENT_METHOD_LABELS, PAYMENT_PATH_LABELS, QUOTE_STATUS_LABELS, Quote, crmApi, fmtDateTime, rs } from "@/lib/crm/api";
import { BillDialog } from "@/components/crm/bill-dialogs";

const QUOTE_TONE: Record<string, Tone> = { active: "good", pending_approval: "warn" };

/** Quotes on the lead's opportunities, with create / approve / reject / cancel. */
export function QuotesPanel({ leadId, interests, onChanged }: { leadId: string; interests: Interest[]; onChanged: () => void }) {
  const { can } = useAdmin();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createFor, setCreateFor] = useState<Interest | null>(null);
  const [reason, setReason] = useState<null | { title: string; confirmLabel: string; destructive?: boolean; run: (r: string) => Promise<unknown> }>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setQuotes(await crmApi.quotes(leadId));
    } catch (e: any) {
      setError(e?.message || "Could not load quotes");
    } finally {
      setLoading(false);
    }
  }, [leadId]);
  useEffect(() => {
    load();
  }, [load]);

  const done = async (title: string) => {
    toast({ title });
    await load();
    onChanged();
  };
  const open = interests.filter((i) => i.status === "open");
  const titleOf = (interestId: string) => interests.find((i) => i._id === interestId)?.title || "Course";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quotes</CardTitle>
        <CardDescription>
          A quote offers only what checkout can charge: the course&apos;s own discount or an existing promo code. The student pays through the normal checkout; a quote never moves money.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {can("crm.manage_quotes") && open.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {open.map((i) => (
              <Button key={i._id} type="button" size="sm" variant="outline" onClick={() => setCreateFor(i)}>
                New quote: {i.title}
              </Button>
            ))}
          </div>
        )}
        <DataState loading={loading} error={error} onRetry={load} empty={quotes.length === 0} emptyText="No quotes yet.">
          <div className="space-y-2">
            {quotes.map((q) => (
              <div key={q._id} className="flex flex-col gap-2 rounded-xl border bg-[var(--crm-surface-2)] p-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{titleOf(q.interestId)}</span>
                    <CrmPill tone={QUOTE_TONE[q.status] ?? "neutral"}>{QUOTE_STATUS_LABELS[q.status]}</CrmPill>
                  </div>
                  <p className="mt-1">
                    {rs(q.price.total)} <span className="text-muted-foreground">(list {rs(q.price.listPrice)}, {q.discountPercent}% off{q.discountCode ? `, promo code ${q.discountCode}` : q.applyCourseDiscount ? ", course discount" : ""})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {fmtDateTime(q.createdAt)} · valid until {fmtDateTime(q.expiresAt)}
                    {q.approval.required ? " · discount needs approval by someone other than its creator" : ""}
                    {q.approval.note ? ` · ${q.approval.note}` : ""}
                  </p>
                  {q.note && <p className="text-xs text-muted-foreground">{q.note}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {q.status === "pending_approval" && q.canDecide && (
                    <>
                      <Button type="button" size="sm" className={GOOD_BUTTON} onClick={() => crmApi.decideQuote(q._id, true).then(() => done("Quote approved"), (e) => toast({ title: "Not done", description: e?.message, variant: "destructive" }))}>
                        Approve
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setReason({ title: "Reject quote", confirmLabel: "Reject", destructive: true, run: (r) => crmApi.decideQuote(q._id, false, r).then(() => done("Quote rejected")) })}>
                        Reject
                      </Button>
                    </>
                  )}
                  {(q.status === "active" || q.status === "pending_approval") && can("crm.manage_quotes") && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setReason({ title: "Cancel quote", confirmLabel: "Cancel quote", destructive: true, run: (r) => crmApi.cancelQuote(q._id, r).then(() => done("Quote cancelled")) })}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DataState>
      </CardContent>
      <CreateQuoteDialog interest={createFor} onClose={() => setCreateFor(null)} onDone={() => done("Quote created")} />
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
    </Card>
  );
}

function CreateQuoteDialog({ interest, onClose, onDone }: { interest: Interest | null; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"none" | "course" | "code">("none");
  const [code, setCode] = useState("");
  const [validDays, setValidDays] = useState("7");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (interest) {
      setMode("none");
      setCode("");
      setNote("");
      setError(null);
    }
  }, [interest]);
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
    <Dialog open={!!interest} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New quote{interest ? `: ${interest.title}` : ""}</DialogTitle>
          <DialogDescription>The price is calculated by the server. A discount above your limit waits for approval. A new quote replaces the current one.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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

/** The lead's payments. Sales get status only; Admin also amounts and credit. */
const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  completed: { label: "completed", tone: "good" },
  failed: { label: "failed", tone: "bad" },
  "pending-gateway": { label: "pending", tone: "warn" },
  "pending-confirmation": { label: "Waiting confirmation", tone: "warn" },
};
function paymentStatus(p: LeadPayment): { label: string; tone: Tone } {
  if (p.status === "cancelled") return p.rejection ? { label: "Rejected", tone: "bad" } : { label: "Cancelled", tone: "neutral" };
  return PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "warn" };
}

/** The lead's payments. Sales get status only, plus amounts on their own rows (R26); Admin also amounts and credit. */
export function PaymentsPanel({ leadId, refreshKey = 0 }: { leadId: string; refreshKey?: number }) {
  const { can } = useAdmin();
  const full = can("crm.view_all_leads");
  const [rows, setRows] = useState<LeadPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await crmApi.payments(leadId));
    } catch (e: any) {
      setError(e?.message || "Could not load payments");
    } finally {
      setLoading(false);
    }
  }, [leadId]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  const showAmount = full || rows.some((r) => r.amount !== undefined);
  // The bill exists for rows in Sales & Bills (the backend re-checks).
  const hasBill = (p: LeadPayment) =>
    full ? p.path === "sales_recorded" || (p.status === "completed" && (p.kind === "qualifying" || p.kind === "bulk" || p.invalidated)) : !!(p.recordedByMe || p.creditedToMe);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payments</CardTitle>
        <CardDescription>
          Only verified payments above Rs 0 count as sales. Free grants and prepaid organization codes never do. A payment recorded by a salesperson counts once an Admin confirms it.
          {full ? " Credit is decided once and never moves." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <DataState loading={loading} error={error} onRetry={load} empty={rows.length === 0} emptyText="No payments.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>How</TableHead>
                  <TableHead>Status</TableHead>
                  {showAmount && <TableHead>Amount</TableHead>}
                  <TableHead>Credit</TableHead>
                  <TableHead>
                    <span className="sr-only">Bill</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const st = paymentStatus(p);
                  return (
                    <TableRow key={p._id}>
                      <TableCell className="whitespace-nowrap">{fmtDateTime(p.date)}</TableCell>
                      <TableCell>{p.courseTitle || "Course"}</TableCell>
                      <TableCell>
                        {PAYMENT_PATH_LABELS[p.path] ?? p.path}
                        {p.paymentMethod && <span className="crm-sub">{PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <CrmPill tone={st.tone}>{st.label}</CrmPill>
                          {p.invalidated && <CrmPill tone="bad">Invalid</CrmPill>}
                          {p.countsAsSale && <CrmPill tone="accent">Sale</CrmPill>}
                          {p.kind === "complimentary" && <CrmPill>Free</CrmPill>}
                          {p.duplicatePaymentOf && <CrmPill tone="warn">Paid twice: refund candidate</CrmPill>}
                        </div>
                        {(p.rejection || p.cancellation) && <span className="crm-sub">{(p.rejection ?? p.cancellation)!.reason}</span>}
                      </TableCell>
                      {showAmount && <TableCell>{p.amount !== undefined ? rs(p.amount) : "—"}</TableCell>}
                      <TableCell className="text-xs">{p.creditedToMe ? "You" : full ? p.creditReason?.replace(/_/g, " ") || "not decided yet" : "—"}</TableCell>
                      <TableCell>
                        {hasBill(p) && (
                          <Button type="button" size="sm" variant="outline" onClick={() => setBillId(p._id)}>
                            Bill
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DataState>
      </CardContent>
      <BillDialog paymentId={billId} onOpenChange={(v) => !v && setBillId(null)} />
    </Card>
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
