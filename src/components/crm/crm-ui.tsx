"use client";

// Small shared pieces of the Sales & CRM pages: the task status pill, an
// error/empty/loading frame, and a dialog that asks for a reason.
import { ReactNode, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { CrmPill } from "@/components/crm/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Task status: open (accent), overdue (bad), completed (good), cancelled (neutral). */
export function TaskStatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  if (status === "open" && overdue) return <CrmPill tone="bad">overdue</CrmPill>;
  return <CrmPill tone={status === "open" ? "accent" : status === "completed" ? "good" : "neutral"}>{status}</CrmPill>;
}

/** Loading / error / empty states around a section. */
export function DataState({ loading, error, empty, emptyText, onRetry, children }: { loading: boolean; error?: string | null; empty?: boolean; emptyText?: string; onRetry?: () => void; children: ReactNode }) {
  if (loading)
    return (
      <div className="crm-empty flex items-center justify-center gap-2" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  if (error)
    return (
      <div className="crm-empty flex flex-col items-center gap-3" role="alert">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  if (empty) return <div className="crm-empty">{emptyText || "Nothing here yet."}</div>;
  return <>{children}</>;
}

/** Asks for a (required) reason, then runs `onConfirm`; shows the server's error if it fails. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  optional,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  optional?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { setError(null); onOpenChange(v); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="crm-reason">Reason{optional ? " (optional)" : ""}</Label>
          <Textarea id="crm-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
          {error && <p className="text-sm text-red-700 [.crm-scope_&]:text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} onClick={submit} disabled={busy || (!optional && !reason.trim())}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
