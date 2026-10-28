"use client";

// Small shared pieces of the Sales & CRM pages: status badges, an
// error/empty/loading frame, and a dialog that asks for a reason.
import { ReactNode, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INTEREST_STAGE_LABELS, InterestStage, LEAD_STAGE_LABELS, LeadStage, LeadStatus } from "@/lib/crm/api";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const cls = status === "lost" ? "bg-gray-200 text-gray-700 hover:bg-gray-200" : "bg-green-100 text-green-800 hover:bg-green-100";
  return <Badge className={cls}>{status === "lost" ? "Lost" : status === "nurture" ? "Nurture" : "Active"}</Badge>;
}

export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  return (
    <Badge variant="outline" className="whitespace-nowrap">
      {LEAD_STAGE_LABELS[stage] ?? stage}
    </Badge>
  );
}

export function InterestStageBadge({ stage }: { stage: InterestStage }) {
  const cls = stage === "payment_pending" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-blue-100 text-blue-800 hover:bg-blue-100";
  return <Badge className={`${cls} whitespace-nowrap`}>{INTEREST_STAGE_LABELS[stage] ?? stage}</Badge>;
}

export function DoNotContactBadge() {
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 whitespace-nowrap">Do not contact</Badge>;
}

/** Loading / error / empty states around a section. */
export function DataState({ loading, error, empty, emptyText, onRetry, children }: { loading: boolean; error?: string | null; empty?: boolean; emptyText?: string; onRetry?: () => void; children: ReactNode }) {
  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-sm">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  if (empty) return <div className="py-10 text-center text-sm text-muted-foreground">{emptyText || "Nothing here yet."}</div>;
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
          {error && <p className="text-sm text-red-700">{error}</p>}
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
