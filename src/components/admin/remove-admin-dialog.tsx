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
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RemoveAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  onConfirm: (adminId: string, reason: string) => Promise<void>;
}

export function RemoveAdminDialog({
  open,
  onOpenChange,
  admin,
  onConfirm,
}: RemoveAdminDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!admin) return;
    
    if (!reason.trim()) {
      setError("Please provide a reason for removing this admin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onConfirm(admin._id, reason);
      onOpenChange(false);
      setReason("");
    } catch (err: any) {
      setError(err.message || "Failed to remove admin. Please try again.");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Remove Administrator</DialogTitle>
          <DialogDescription>
            This action will remove the admin's access to the system and notify them via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {admin && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="font-medium">{admin.name}</div>
              <div className="text-sm text-muted-foreground">{admin.email}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Role: {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </div>
            </div>
          )}

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This admin will lose all access immediately and will receive an email notification about their removal.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Removal *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for removing this administrator..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be included in the notification email sent to the admin.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
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
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Admin"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
