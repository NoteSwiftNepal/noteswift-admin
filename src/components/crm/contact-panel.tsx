"use client";

// Log call / WhatsApp (S8, the prototype's "Log a call" panel). The person
// picks nothing but the channel: the server chooses the purpose and runs the
// outreach gate (D13, R1). If the gate blocks, the panel shows one red line
// and no form; otherwise a "Call 98XXXXXXXX" / "Open WhatsApp" step starts
// the contact (recorded with its basis), then the outcome form follows, with
// an optional next follow-up (the task API runs the gate again).
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Btn, Field, Panel, Sel, fromLocalInput, toLocalInput, useBusy } from "@/components/crm/leads/controls";
import { Channel, OUTCOME_LABELS, crmApi } from "@/lib/crm/api";

// The prototype's "How" choices for the next follow-up.
export const FOLLOW_UP_TYPES = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "School visit" },
  { value: "payment_reminder", label: "Payment reminder" },
];
// Contact task types without a channel of their own are made by phone.
export const taskChannel = (type: string) => (type === "payment_reminder" ? { channel: "call" } : {});

export function ContactPanel({ leadId, phone, channel, onDone, onCancel }: { leadId: string; phone: string | null; channel: Channel; onDone: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [blocked, setBlocked] = useState<string | null | undefined>(undefined); // undefined while checking
  const [attempt, setAttempt] = useState<{ attemptId: string; link?: string } | null>(null);
  const [outcome, setOutcome] = useState("connected");
  const [note, setNote] = useState("");
  const [followOn, setFollowOn] = useState(true);
  const [followAt, setFollowAt] = useState(toLocalInput(new Date(Date.now() + 24 * 3600_000)));
  const [followType, setFollowType] = useState<string>(channel);
  const { busy, error, run } = useBusy();

  useEffect(() => {
    let cancelled = false;
    crmApi
      .outreachCheck(leadId, { channel })
      .then((d) => !cancelled && setBlocked(d.allowed ? null : d.reasons[0] ?? "Contact isn't allowed right now"))
      .catch((e) => !cancelled && setBlocked(e?.message || "Could not check"));
    return () => {
      cancelled = true;
    };
  }, [leadId, channel]);

  const start = () =>
    run(async () => {
      try {
        const a = await crmApi.outreachStart(leadId, { channel });
        setAttempt(a);
        if (a.link) window.open(a.link, channel === "whatsapp" ? "_blank" : "_self");
      } catch (e: any) {
        setBlocked(e?.reasons?.[0] || e?.message || "Contact isn't allowed right now");
      }
    });

  const noFollowUp = outcome === "wrong_number" || outcome === "asked_not_to_contact";
  const save = () =>
    run(async () => {
      if (!attempt) return;
      await crmApi.outreachOutcome(attempt.attemptId, outcome, note.trim() || undefined);
      if (followOn && !noFollowUp) {
        try {
          await crmApi.createTask(leadId, { type: followType, dueAt: fromLocalInput(followAt), ...taskChannel(followType) });
        } catch (e: any) {
          toast({ title: "Saved, but the follow-up wasn't scheduled", description: e?.reasons?.[0] || e?.message, variant: "destructive" });
          onDone();
          return;
        }
      }
      toast({ title: channel === "call" ? "Call saved" : "Saved" });
      onDone();
    });

  const title = channel === "call" ? "Log a call" : "WhatsApp";
  if (blocked === undefined)
    return (
      <Panel title={title} onCancel={onCancel}>
        <span className="crm-muted flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking…
        </span>
      </Panel>
    );
  if (blocked)
    return (
      <Panel title={title} onCancel={onCancel}>
        <span className="crm-late">{blocked}</span>
      </Panel>
    );
  if (!attempt)
    return (
      <Panel
        title={title}
        onCancel={onCancel}
        error={error}
        extraActions={
          <Btn tone="primary" busy={busy} onClick={start}>
            {channel === "call" ? `Call ${phone || ""}`.trim() : "Open WhatsApp"}
          </Btn>
        }
      >
        <span className="crm-muted crm-small">Then record what happened.</span>
      </Panel>
    );
  return (
    <Panel title={title} onSubmit={save} submitLabel={channel === "call" ? "Save call" : "Save"} onCancel={onCancel} busy={busy} error={error}>
      {attempt.link && (
        <span className="crm-small">
          <a className="crm-link" href={attempt.link} target={channel === "whatsapp" ? "_blank" : undefined} rel="noreferrer">
            {channel === "call" ? `Call ${phone || ""}`.trim() : "Open WhatsApp"}
          </a>{" "}
          <span className="crm-muted">again</span>
        </span>
      )}
      <div className="crm-form">
        <Field label="What happened?" full>
          <Sel value={outcome} onChange={(e) => setOutcome(e.target.value)} options={Object.entries(OUTCOME_LABELS).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Note" full>
          <textarea className="crm-input" placeholder="What did the student or parent say?" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
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
                  <Sel value={followType} onChange={(e) => setFollowType(e.target.value)} options={FOLLOW_UP_TYPES} />
                </Field>
              </>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
