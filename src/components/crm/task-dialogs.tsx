"use client";

// Task forms for Sales & CRM: create (the drawer's panel), complete, reschedule. Contact tasks
// (call, WhatsApp, SMS, email, payment reminder, course info) need a purpose;
// the backend runs the outreach gate and refuses with its reasons.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Panel, Sel, fromLocalInput, toLocalInput, useBusy } from "@/components/crm/leads/controls";
import { CHANNEL_LABELS, Channel, PURPOSE_LABELS, Purpose, TASK_TYPE_LABELS, crmApi } from "@/lib/crm/api";

const CONTACT_TYPES = ["call", "whatsapp", "sms", "email", "payment_reminder", "send_course_info"];
const CHANNEL_FOR_TYPE: Record<string, string> = { call: "call", whatsapp: "whatsapp", sms: "sms", email: "email" };

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.reasons?.join("; ") || e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

/** New task, drawn as the prototype's "Schedule follow-up" panel (S1b), with our fields. */
export function TaskPanel({ leadId, interests, onCreated, onCancel }: { leadId: string; interests: { _id: string; title: string; status: string }[]; onCreated: () => void; onCancel: () => void }) {
  const [type, setType] = useState("call");
  const [dueAt, setDueAt] = useState(toLocalInput(new Date(Date.now() + 24 * 3600_000)));
  const [priority, setPriority] = useState("normal");
  const [interestId, setInterestId] = useState("none");
  const [purpose, setPurpose] = useState<Purpose>("purchase_assistance");
  const [channel, setChannel] = useState("call");
  const [notes, setNotes] = useState("");
  const { busy, error, run } = useBusy();
  const isContact = CONTACT_TYPES.includes(type);
  const openInterests = interests.filter((i) => i.status === "open");

  const submit = () =>
    run(async () => {
      await crmApi.createTask(leadId, {
        type,
        dueAt: fromLocalInput(dueAt),
        priority,
        notes: notes.trim() || undefined,
        interestId: interestId === "none" ? undefined : interestId,
        ...(isContact ? { purpose, channel: CHANNEL_FOR_TYPE[type] ?? channel } : {}),
      });
      onCreated();
    });

  return (
    <Panel title="Schedule follow-up" onSubmit={submit} submitLabel="Schedule" onCancel={onCancel} busy={busy} error={error} canSubmit={!!dueAt}>
      <div className="crm-form">
        <Field label="Type">
          <Sel value={type} onChange={(e) => setType(e.target.value)} options={Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="Due">
          <input className="crm-input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
        </Field>
        {isContact && (
          <>
            <Field label="Purpose">
              <Sel value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)} options={(Object.keys(PURPOSE_LABELS) as Purpose[]).map((p) => ({ value: p, label: PURPOSE_LABELS[p] }))} />
            </Field>
            {!CHANNEL_FOR_TYPE[type] && (
              <Field label="Channel">
                <Sel value={channel} onChange={(e) => setChannel(e.target.value)} options={["call", "whatsapp", "sms", "email"].map((c) => ({ value: c, label: CHANNEL_LABELS[c as Channel] }))} />
              </Field>
            )}
          </>
        )}
        {openInterests.length > 0 && (
          <Field label="Course">
            <Sel value={interestId} onChange={(e) => setInterestId(e.target.value)} options={[{ value: "none", label: "Not about one course" }, ...openInterests.map((i) => ({ value: i._id, label: i.title }))]} />
          </Field>
        )}
        <Field label="Priority">
          <Sel value={priority} onChange={(e) => setPriority(e.target.value)} options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]} />
        </Field>
        <Field label="Note" full>
          <input className="crm-input" placeholder="e.g. Send demo class link" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      {isContact && <span className="crm-muted crm-small">Contact tasks are checked against do not contact, consent and the follow-up rules.</span>}
    </Panel>
  );
}

export function CompleteTaskDialog({ taskId, onOpenChange, onDone }: { taskId: string | null; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const { busy, error, setError, run } = useSubmit();
  useEffect(() => {
    if (taskId) {
      setOutcome("");
      setNotes("");
      setError(null);
    }
  }, [taskId, setError]);
  return (
    <Dialog open={!!taskId} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="task-outcome">Outcome</Label>
            <Input id="task-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={100} placeholder="e.g. spoke, will pay Friday" />
          </div>
          <div>
            <Label htmlFor="task-complete-notes">Notes (optional)</Label>
            <Textarea id="task-complete-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !outcome.trim()}
            onClick={() =>
              run(async () => {
                await crmApi.completeTask(taskId!, outcome.trim(), notes.trim() || undefined);
                onDone();
                onOpenChange(false);
              })
            }
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RescheduleTaskDialog({ task, onOpenChange, onDone }: { task: { _id: string; dueAt: string } | null; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [dueAt, setDueAt] = useState("");
  const [reason, setReason] = useState("");
  const { busy, error, setError, run } = useSubmit();
  useEffect(() => {
    if (task) {
      setDueAt(toLocalInput(new Date(Math.max(Date.now(), new Date(task.dueAt).getTime()) + 24 * 3600_000)));
      setReason("");
      setError(null);
    }
  }, [task, setError]);
  return (
    <Dialog open={!!task} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule task</DialogTitle>
          <DialogDescription>The previous due date is kept in the task&apos;s history.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="task-new-due">New due date</Label>
            <Input id="task-new-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="task-resched-reason">Reason (optional)</Label>
            <Input id="task-resched-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !dueAt}
            onClick={() =>
              run(async () => {
                await crmApi.rescheduleTask(task!._id, fromLocalInput(dueAt), reason.trim() || undefined, task!.dueAt);
                onDone();
                onOpenChange(false);
              })
            }
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
