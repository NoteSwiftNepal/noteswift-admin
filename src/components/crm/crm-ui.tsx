"use client";

// Small shared pieces of the Sales & CRM pages: status badges, an
// error/empty/loading frame, and a dialog that asks for a reason.
import { ReactNode, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { CrmPill, Tone } from "@/components/crm/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INTEREST_STAGE_LABELS, InterestStage, LEAD_STAGE_LABELS, LeadStage, LeadStatus } from "@/lib/crm/api";

// Status → pill tone (docs/crm-prototype/UI_SPEC.md §5). Labels are unchanged.
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <CrmPill tone={status === "lost" ? "bad" : status === "nurture" ? "neutral" : "good"}>{status === "lost" ? "Lost" : status === "nurture" ? "Nurture" : "Active"}</CrmPill>;
}

const LEAD_STAGE_TONE: Record<LeadStage, Tone> = { new: "accent", contact_attempted: "neutral", contacted: "neutral", qualified: "accent" };
export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  return <CrmPill tone={LEAD_STAGE_TONE[stage] ?? "neutral"}>{LEAD_STAGE_LABELS[stage] ?? stage}</CrmPill>;
}

const INTEREST_STAGE_TONE: Record<InterestStage, Tone> = { interested: "neutral", contacted: "neutral", qualified: "accent", quoted: "accent", payment_pending: "warn" };
export function InterestStageBadge({ stage }: { stage: InterestStage }) {
  return <CrmPill tone={INTEREST_STAGE_TONE[stage] ?? "neutral"}>{INTEREST_STAGE_LABELS[stage] ?? stage}</CrmPill>;
}

export function OutcomeBadge({ outcome, lostReason }: { outcome: "won" | "granted" | "lost" | null; lostReason?: string | null }) {
  if (outcome === "won") return <CrmPill tone="good">Won</CrmPill>;
  if (outcome === "lost") return <CrmPill tone="bad">{lostReason ? `Lost: ${lostReason}` : "Lost"}</CrmPill>;
  return <CrmPill>{outcome === "granted" ? "Granted" : "Closed"}</CrmPill>;
}

export function DoNotContactBadge() {
  return <CrmPill tone="bad">Do not contact</CrmPill>;
}

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
