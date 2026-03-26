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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RemoveTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  onConfirm: (teacherId: string, reason: string) => Promise<void>;
}

export function RemoveTeacherDialog({
  open,
  onOpenChange,
  teacher,
  onConfirm,
}: RemoveTeacherDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullName = teacher ? `${teacher.firstName} ${teacher.lastName}` : "";
  const isNameMatch = confirmName.trim().toLowerCase() === fullName.toLowerCase();

  const handleConfirm = async () => {
    if (!teacher) return;
    
    if (!reason.trim()) {
      setError("Please provide a reason for removing this teacher.");
      return;
    }

    if (!isNameMatch) {
      setError("The name you entered does not match. Please type the exact name to confirm.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onConfirm(teacher._id, reason);
      onOpenChange(false);
      setReason("");
      setConfirmName("");
    } catch (err: any) {
      setError(err.message || "Failed to remove teacher. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setReason("");
      setConfirmName("");
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Remove Teacher - Permanent Action
          </DialogTitle>
          <DialogDescription>
            This is a permanent action that will remove the teacher's access and notify them via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {teacher && (
            <div className="rounded-lg border-2 border-destructive/20 p-4 bg-destructive/5">
              <div className="font-semibold text-lg">{fullName}</div>
              <div className="text-sm text-muted-foreground">{teacher.email}</div>
            </div>
          )}

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning: This action cannot be undone</AlertTitle>
            <AlertDescription>
              The teacher will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Lose all access to their account immediately</li>
                <li>Be unable to manage their courses</li>
                <li>Receive an email notification with the reason</li>
                <li>Have their account permanently deactivated</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-base font-semibold">
              Reason for Removal *
            </Label>
            <Textarea
              id="reason"
              placeholder="Provide a detailed reason for removing this teacher (e.g., policy violation, poor performance, resignation, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be included in the notification email and audit log.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmName" className="text-base font-semibold">
              Type Teacher's Full Name to Confirm *
            </Label>
            <Input
              id="confirmName"
              placeholder={`Type "${fullName}" to confirm`}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={loading}
              className={confirmName && !isNameMatch ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">
              For security, please type the teacher's full name exactly as shown above.
            </p>
            {confirmName && !isNameMatch && (
              <p className="text-xs text-destructive font-medium">
                ✗ Name does not match
              </p>
            )}
            {confirmName && isNameMatch && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Name confirmed
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason.trim() || !isNameMatch}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing Teacher...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Permanently Remove Teacher
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
