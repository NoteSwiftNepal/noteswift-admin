"use client";

// Task forms for Sales & CRM: create (the drawer's panel), complete,
// reschedule. Contact tasks go through the outreach gate on the server,
// which also chooses their purpose (S8) and refuses with its reasons.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Panel, Sel, fromLocalInput, toLocalInput, useBusy } from "@/components/crm/leads/controls";
import { Task, crmApi } from "@/lib/crm/api";
import { FOLLOW_UP_TYPES, taskChannel } from "@/components/crm/contact-panel";


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

/** "Schedule follow-up" (S8, the prototype's panel): Type · Due · Note. The server chooses the contact purpose and runs the gate. */
export function TaskPanel({ leadId, task, onCreated, onCancel }: { leadId: string; task?: Task | null; onCreated: () => void; onCancel: () => void }) {
  const [type, setType] = useState<string>(task?.type ?? "call");
  const [dueAt, setDueAt] = useState(toLocalInput(task ? new Date(task.dueAt) : new Date(Date.now() + 24 * 3600_000)));
  const [notes, setNotes] = useState(task?.notes ?? "");
  const { busy, error, run } = useBusy();
  const submit = () =>
    run(async () => {
      const body = { type, dueAt: fromLocalInput(dueAt), notes: notes.trim(), ...taskChannel(type) };
      if (task) await crmApi.updateTask(task._id, { ...body, expectedDueAt: task.dueAt });
      else await crmApi.createTask(leadId, { ...body, notes: notes.trim() || undefined });
      onCreated();
    });
  return (
    <Panel title={task ? "Edit follow-up" : "Schedule follow-up"} onSubmit={submit} submitLabel={task ? "Save" : "Schedule"} onCancel={onCancel} busy={busy} error={error} canSubmit={!!dueAt}>
      <div className="crm-form">
        <Field label="Type">
          <Sel value={type} onChange={(e) => setType(e.target.value)} options={FOLLOW_UP_TYPES} />
        </Field>
        <Field label="Due">
          <input className="crm-input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
        </Field>
        <Field label="Note" full>
          <input className="crm-input" placeholder="e.g. Send demo class link" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
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
