"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ShieldX, Copy, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/context/admin-context";

interface InviteAdminProps {
  schoolId?: string;
  onInvited?: () => void;
}

type InvitableRole = "admin" | "super_admin" | "system_admin";

const ROLE_LABELS: Record<InvitableRole, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
  system_admin: "System Admin",
};

export function InviteAdmin({ schoolId, onInvited }: InviteAdminProps = {}) {
  const { admin, canInviteAdmins, isSystemAdmin } = useAdmin();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("admin");
  const [message, setMessage] = useState("You have been invited to join the NoteSwift admin team. Click the link below to accept the invitation and set up your account.");
  const [loading, setLoading] = useState(false);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const { toast } = useToast();

  const availableRoles: InvitableRole[] = isSystemAdmin
    ? ["admin", "super_admin", "system_admin"]
    : ["admin"];

  // Check if current admin can invite others
  if (!canInviteAdmins) {
    return (
      <div className="text-center py-12">
        <ShieldX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">Access Restricted</h3>
        <p className="text-muted-foreground">
          Only System Administrators and Super Administrators can invite new admins.
        </p>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    if (!email.includes("@")) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setFallbackLink(null);

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.INVITE, createFetchOptions('POST', {
        email: email.trim(),
        role,
        message,
        ...(schoolId ? { schoolId } : {})
      }));

      const data = await response.json();

      if (response.ok) {
        if (data.emailSent === false) {
          toast({
            title: "Invitation created, but email failed to send",
            description: "Share the signup link below with them directly.",
            variant: "destructive",
          });
          setFallbackLink(data.invitationUrl || null);
        } else {
          toast({
            title: "Success",
            description: "Invitation sent successfully!",
          });
        }
        setEmail("");
        setRole("admin");
        setMessage("You have been invited to join the NoteSwift admin team. Click the link below to accept the invitation and set up your account.");
        onInvited?.();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send invitation.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyFallbackLink = async () => {
    if (!fallbackLink) return;
    try {
      await navigator.clipboard.writeText(fallbackLink);
      toast({ title: "Copied", description: "Signup link copied to clipboard." });
    } catch {
      toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleInvite} className="space-y-6">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground mt-1">
          Enter the email address of the person you want to invite as an administrator.
        </p>
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={(value) => setRole(value as InvitableRole)}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">
          {isSystemAdmin
            ? "The account will be created with this role directly."
            : "Only system administrators can invite someone as Super Admin or System Admin."}
        </p>
      </div>

      <div>
        <Label htmlFor="message">Invitation Message</Label>
        <Textarea
          id="message"
          placeholder="Custom invitation message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <p className="text-sm text-muted-foreground mt-1">
          This message will be included in the invitation email.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• An invitation email will be sent to the provided address</li>
          <li>• The recipient can click the acceptance link in the email</li>
          <li>• They'll be redirected to complete their admin registration</li>
          <li>• Once registered, they'll have {ROLE_LABELS[role]} access to the platform</li>
        </ul>
      </div>

      {fallbackLink && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-amber-900 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <h4 className="font-medium">Email failed to send</h4>
          </div>
          <p className="text-sm text-amber-800 mb-2">
            The invitation was created, but we couldn't email it. Copy this link and send it to the invitee directly.
          </p>
          <div className="flex items-center gap-2">
            <Input value={fallbackLink} readOnly className="text-xs" />
            <Button type="button" variant="outline" size="sm" onClick={copyFallbackLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Invitation...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Invitation
          </>
        )}
      </Button>
    </form>
  );
}