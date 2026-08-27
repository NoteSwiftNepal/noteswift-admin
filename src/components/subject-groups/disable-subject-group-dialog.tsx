"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Ban, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DisableSubjectGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    _id: string;
    name: string;
  } | null;
  onConfirm: (groupId: string, reason: string) => Promise<void>;
}

// Modeled on remove-teacher-dialog.tsx, but lighter — disabling a group is
// reversible by its teacher (PATCH /api/teacher/subject-groups/:id can flip
// status back to active) and never touches classes already scheduled, so
// this skips that dialog's "type the name to confirm" step. A required
// reason + one explicit warning is proportionate to the actual stakes here.
export function DisableSubjectGroupDialog({
  open,
  onOpenChange,
  group,
  onConfirm,
}: DisableSubjectGroupDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!group) return;

    if (!reason.trim()) {
      setError("Please provide a reason for disabling this group.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onConfirm(group._id, reason);
      onOpenChange(false);
      setReason("");
    } catch (err: any) {
      setError(err.message || "Failed to disable group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setReason("");
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            Disable Linked Group
          </DialogTitle>
          <DialogDescription>
            {group && (
              <>
                Disable <strong>{group.name}</strong>?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What this does</AlertTitle>
            <AlertDescription>
              Disabling stops future shared scheduling and notifications for this group. It will not affect
              live classes already scheduled or their recordings — those keep working exactly as they are.
              The teacher who created it can re-enable it at any time.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-base font-semibold">
              Reason for Disabling *
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g. courses are not actually the same content, teacher requested it be split, policy concern..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Shown to the teacher and kept with the group's record.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={loading || !reason.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disabling...
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Disable Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
