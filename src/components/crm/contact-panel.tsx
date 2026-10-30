"use client";

// Contacting a lead (CRM_IMPLEMENTATION.md R1, D13), drawn as the prototype's
// "Log a call" panel (S1b). Everything goes through the backend's outreach
// gate: the panel asks it first and shows its answer; only when the backend
// starts the contact does it return the call / WhatsApp link (and record the
// attempt with the signal that justified it). The outcome is recorded
// afterwards, and the next follow-up goes through the task API, which runs
// the gate again.
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Btn, Field, Panel, Sel, fromLocalInput, toLocalInput, useBusy } from "@/components/crm/leads/controls";
import { CHANNEL_LABELS, Channel, OUTCOME_LABELS, OutreachDecision, PURPOSE_LABELS, Purpose, TASK_TYPE_LABELS, crmApi, fmtDateTime } from "@/lib/crm/api";

const CONTACT_TASK_TYPES = ["call", "whatsapp", "sms", "email", "payment_reminder", "send_course_info"];
const CHANNEL_FOR_TYPE: Record<string, Channel> = { call: "call", whatsapp: "whatsapp", sms: "sms", email: "email" };

export function ContactPanel({
  leadId,
  interest,
  initialChannel = "call",
  onDone,
  onCancel,
}: {
  leadId: string;
  interest?: { _id: string; title: string } | null;
  initialChannel?: Channel;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState<Purpose>(interest ? "purchase_assistance" : "enquiry_response");
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [decision, setDecision] = useState<OutreachDecision | null>(null);
  const [attempt, setAttempt] = useState<{ attemptId: string; link?: string } | null>(null);
  const [outcome, setOutcome] = useState("connected");
  const [summary, setSummary] = useState("");
  const [followOn, setFollowOn] = useState(true);
  const [followAt, setFollowAt] = useState(toLocalInput(new Date(Date.now() + 24 * 3600_000)));
  const [followType, setFollowType] = useState("call");
  const { busy, error, setError, run } = useBusy();

  // Ask the gate whenever the choice changes.
  useEffect(() => {
    if (attempt) return;
    let cancelled = false;
    setDecision(null);
    crmApi
      .outreachCheck(leadId, { purpose, channel, interestId: purpose === "purchase_assistance" ? interest?._id : undefined })
      .then((d) => !cancelled && setDecision(d))
      .catch((e) => !cancelled && setDecision({ allowed: false, reasons: [e?.message || "Could not check"], basis: null }));
    return () => {
      cancelled = true;
    };
  }, [leadId, purpose, channel, interest, attempt]);

  const start = () =>
    run(async () => {
      setAttempt(await crmApi.outreachStart(leadId, { purpose, channel, interestId: purpose === "purchase_assistance" ? interest?._id : undefined }));
    });

  const noFollowUp = outcome === "wrong_number" || outcome === "asked_not_to_contact";
  const save = () =>
    run(async () => {
      if (!attempt) return;
      await crmApi.outreachOutcome(attempt.attemptId, outcome, summary.trim() || undefined);
      if (followOn && !noFollowUp) {
        const contact = CONTACT_TASK_TYPES.includes(followType);
        try {
          await crmApi.createTask(leadId, {
            type: followType,
            dueAt: fromLocalInput(followAt),
            interestId: interest?._id,
            ...(contact ? { purpose, channel: CHANNEL_FOR_TYPE[followType] ?? channel } : {}),
          });
        } catch (e: any) {
          // The outcome is saved; only the follow-up was refused (the task API runs the gate).
          toast({ title: "Outcome saved, but the follow-up wasn't created", description: e?.reasons?.join("; ") || e?.message, variant: "destructive" });
          onDone();
          return;
        }
      }
      toast({ title: followOn && !noFollowUp ? "Outcome saved and follow-up scheduled" : "Outcome saved" });
      onDone();
    });

  const label = CHANNEL_LABELS[channel];
  const number = attempt?.link ? decodeURIComponent(attempt.link.replace(/^tel:|^sms:|^mailto:|^https:\/\/wa\.me\//, "").split("?")[0]) : null;

  return (
    <Panel
      title={`${channel === "call" ? "Log a call" : `Contact by ${label}`}${interest ? ` · ${interest.title}` : ""}`}
      onCancel={onCancel}
      busy={busy}
      error={error}
      onSubmit={attempt ? save : start}
      canSubmit={!!attempt || !!decision?.allowed}
      submitLabel={attempt ? (channel === "call" ? "Save call" : "Save") : undefined}
      extraActions={
        !attempt && (
          <Btn tone="primary" onClick={() => { setError(null); start(); }} busy={busy} disabledReason={decision && !decision.allowed ? "The contact rules don't allow this" : null} disabled={!decision}>
            Start {label}
          </Btn>
        )
      }
    >
      {!attempt ? (
        <>
          <div className="crm-form">
            <Field label="Purpose">
              <Sel
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as Purpose)}
                options={(Object.keys(PURPOSE_LABELS) as Purpose[]).filter((p) => p !== "purchase_assistance" || interest).map((p) => ({ value: p, label: PURPOSE_LABELS[p] }))}
              />
            </Field>
            <Field label="Channel">
              <Sel value={channel} onChange={(e) => setChannel(e.target.value as Channel)} options={(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))} />
            </Field>
          </div>
          <div aria-live="polite" className={`crm-gate ${!decision ? "wait" : decision.allowed ? "good" : "bad"}`}>
            {!decision ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking the contact rules…
              </span>
            ) : decision.allowed ? (
              <span className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Allowed{decision.basis ? ` because of a ${decision.basis.signalType.replace(/_/g, " ")} on ${fmtDateTime(decision.basis.signalAt)}` : ""}.
                </span>
              </span>
            ) : (
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <b>Blocked</b>
                  <ul className="list-disc pl-4">
                    {decision.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="crm-gate good">
            {label} started.{" "}
            {number && (
              <>
                Number: <b className="select-all">{number}</b>{" "}
              </>
            )}
            {attempt.link && (
              <a className="crm-link" href={attempt.link} target={channel === "whatsapp" ? "_blank" : undefined} rel="noreferrer">
                {channel === "whatsapp" ? "Open WhatsApp" : channel === "call" ? "Call now" : `Open ${label}`}
              </a>
            )}
          </div>
          <div className="crm-form">
            <Field label="What happened?" full>
              <Sel value={outcome} onChange={(e) => setOutcome(e.target.value)} options={Object.entries(OUTCOME_LABELS).map(([value, l]) => ({ value, label: l }))} />
              {outcome === "asked_not_to_contact" && <span className="crm-late crm-small">This sets do not contact on the lead right away and cancels open contact tasks.</span>}
            </Field>
            <Field label="Note" full>
              <textarea className="crm-input" placeholder="What did the student or parent say?" value={summary} maxLength={2000} onChange={(e) => setSummary(e.target.value)} />
            </Field>
            {!noFollowUp && (
              <>
                <Field label="Schedule next follow-up" full row>
                  <input type="checkbox" checked={followOn} onChange={(e) => setFollowOn(e.target.checked)} />
                </Field>
                {followOn && (
                  <>
                    <Field label="When">
                      <input className="crm-input" type="datetime-local" value={followAt} onChange={(e) => setFollowAt(e.target.value)} required />
                    </Field>
                    <Field label="How">
                      <Sel value={followType} onChange={(e) => setFollowType(e.target.value)} options={Object.entries(TASK_TYPE_LABELS).map(([value, l]) => ({ value, label: l }))} />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
