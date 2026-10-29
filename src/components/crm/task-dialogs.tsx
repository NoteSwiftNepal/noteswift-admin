"use client";

// Task forms for Sales & CRM: create, complete, reschedule. Contact tasks
// (call, WhatsApp, SMS, email, payment reminder, course info) need a purpose;
// the backend runs the outreach gate and refuses with its reasons.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PURPOSE_LABELS, Purpose, TASK_TYPE_LABELS, crmApi } from "@/lib/crm/api";

const CONTACT_TYPES = ["call", "whatsapp", "sms", "email", "payment_reminder", "send_course_info"];
const CHANNEL_FOR_TYPE: Record<string, string> = { call: "call", whatsapp: "whatsapp", sms: "sms", email: "email" };

// <input type="datetime-local"> works in local time; convert both ways.
const toLocalInput = (d: Date) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => new Date(v).toISOString();

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

export function CreateTaskDialog({
  open,
  onOpenChange,
  leadId,
  interests,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
  interests: { _id: string; title: string; status: string }[];
  onCreated: () => void;
}) {
  const [type, setType] = useState("follow_up");
  const [dueAt, setDueAt] = useState(toLocalInput(new Date(Date.now() + 24 * 3600_000)));
  const [priority, setPriority] = useState("normal");
  const [interestId, setInterestId] = useState("none");
  const [purpose, setPurpose] = useState<Purpose>("purchase_assistance");
  const [channel, setChannel] = useState("call");
  const [notes, setNotes] = useState("");
  const { busy, error, setError, run } = useSubmit();
  const isContact = CONTACT_TYPES.includes(type);
  const openInterests = interests.filter((i) => i.status === "open");

  useEffect(() => {
    if (open) {
      setError(null);
      setNotes("");
    }
  }, [open, setError]);

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
      onOpenChange(false);
    });

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Assigned to the lead&apos;s owner. Contact tasks are checked against do-not-contact, consent and follow-up rules.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="task-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="task-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="task-due">Due</Label>
            <Input id="task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="task-interest">Course</Label>
            <Select value={interestId} onValueChange={setInterestId}>
              <SelectTrigger id="task-interest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not about one course</SelectItem>
                {openInterests.map((i) => (
                  <SelectItem key={i._id} value={i._id}>
                    {i.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isContact && (
            <>
              <div>
                <Label htmlFor="task-purpose">Purpose</Label>
                <Select value={purpose} onValueChange={(v) => setPurpose(v as Purpose)}>
                  <SelectTrigger id="task-purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PURPOSE_LABELS) as Purpose[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PURPOSE_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!CHANNEL_FOR_TYPE[type] && (
                <div>
                  <Label htmlFor="task-channel">Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger id="task-channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !dueAt}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
