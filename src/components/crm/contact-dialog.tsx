"use client";

// Contacting a lead (CRM_IMPLEMENTATION.md R1, D13). Everything goes through
// the backend's outreach gate: the dialog asks it first and shows its
// reasons; only when the backend starts the contact does it return the
// call / WhatsApp link (and record the attempt with the signal that
// justified it). The outcome is recorded afterwards.
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Phone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANNEL_LABELS, Channel, OUTCOME_LABELS, PURPOSE_LABELS, Purpose, crmApi, fmtDateTime } from "@/lib/crm/api";

export function ContactDialog({
  open,
  onOpenChange,
  leadId,
  interest,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
  interest?: { _id: string; title: string } | null;
  onDone: () => void;
}) {
  const [purpose, setPurpose] = useState<Purpose>(interest ? "purchase_assistance" : "enquiry_response");
  const [channel, setChannel] = useState<Channel>("call");
  const [checking, setChecking] = useState(false);
  const [decision, setDecision] = useState<{ allowed: boolean; reasons: string[]; basis: { signalType: string; signalAt: string } | null } | null>(null);
  const [attempt, setAttempt] = useState<{ attemptId: string; link?: string } | null>(null);
  const [outcome, setOutcome] = useState("connected");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPurpose(interest ? "purchase_assistance" : "enquiry_response");
    setChannel("call");
    setAttempt(null);
    setSummary("");
    setOutcome("connected");
    setError(null);
  }, [open, interest]);

  // Ask the gate whenever the choice changes.
  useEffect(() => {
    if (!open || attempt) return;
    let cancelled = false;
    setChecking(true);
    setDecision(null);
    crmApi
      .outreachCheck(leadId, { purpose, channel, interestId: purpose === "purchase_assistance" ? interest?._id : undefined })
      .then((d) => !cancelled && setDecision(d))
      .catch((e) => !cancelled && setDecision({ allowed: false, reasons: [e?.message || "Could not check"], basis: null }))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [open, leadId, purpose, channel, interest, attempt]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const a = await crmApi.outreachStart(leadId, { purpose, channel, interestId: purpose === "purchase_assistance" ? interest?._id : undefined });
      setAttempt(a);
      if (a.link) window.open(a.link, channel === "whatsapp" ? "_blank" : "_self");
    } catch (e: any) {
      setError(e?.reasons?.join("; ") || e?.message || "Could not start");
    } finally {
      setBusy(false);
    }
  };

  const saveOutcome = async () => {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      await crmApi.outreachOutcome(attempt.attemptId, outcome, summary.trim() || undefined);
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact{interest ? ` about ${interest.title}` : ""}</DialogTitle>
          <DialogDescription>The system checks do-not-contact, consent, channel and follow-up limits before every contact.</DialogDescription>
        </DialogHeader>

        {!attempt ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="crm-purpose">Purpose</Label>
                <Select value={purpose} onValueChange={(v) => setPurpose(v as Purpose)}>
                  <SelectTrigger id="crm-purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PURPOSE_LABELS) as Purpose[])
                      .filter((p) => p !== "purchase_assistance" || interest)
                      .map((p) => (
                        <SelectItem key={p} value={p}>
                          {PURPOSE_LABELS[p]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crm-channel">Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger id="crm-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div aria-live="polite" className="rounded-md border p-3 text-sm">
              {checking || !decision ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                </span>
              ) : decision.allowed ? (
                <span className="flex items-start gap-2 text-green-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Allowed
                    {decision.basis ? ` (because of a ${decision.basis.signalType.replace(/_/g, " ")} on ${fmtDateTime(decision.basis.signalAt)})` : ""}.
                  </span>
                </span>
              ) : (
                <div className="flex items-start gap-2 text-red-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <ul className="list-disc pl-4">
                    {decision.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              Contact started.{" "}
              {attempt.link && (
                <a className="text-blue-700 underline" href={attempt.link} target={channel === "whatsapp" ? "_blank" : undefined} rel="noreferrer">
                  Open {CHANNEL_LABELS[channel]} again
                </a>
              )}
            </p>
            <div>
              <Label htmlFor="crm-outcome">What happened?</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger id="crm-outcome">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {outcome === "asked_not_to_contact" && <p className="mt-1 text-xs text-red-700">This sets do-not-contact on the lead right away.</p>}
            </div>
            <div>
              <Label htmlFor="crm-outcome-notes">Notes</Label>
              <Textarea id="crm-outcome-notes" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={2000} />
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <DialogFooter>
          {!attempt ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Close
              </Button>
              <Button type="button" onClick={start} disabled={busy || checking || !decision?.allowed}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                Start {CHANNEL_LABELS[channel]}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={saveOutcome} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save outcome
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
