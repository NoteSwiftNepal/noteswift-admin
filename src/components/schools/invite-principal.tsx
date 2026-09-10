"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Copy, AlertTriangle } from "lucide-react";

interface InvitePrincipalProps {
  schoolId: string;
  schoolName: string;
  isReinvite?: boolean;
  onInvited?: () => void;
}

// Unlike InviteAdmin (platform-staff accounts with system_admin/super_admin/
// admin roles), a school has exactly one role type — its principal — so
// there's no role picker here, and the invite always expires in 48 hours.
export function InvitePrincipal({ schoolId, schoolName, isReinvite, onInvited }: InvitePrincipalProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`You have been invited to be the School Administrator for ${schoolName} on NoteSwift.`);
  const [loading, setLoading] = useState(false);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !email.includes("@")) {
      toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setFallbackLink(null);

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.SCHOOLS.INVITE_PRINCIPAL(schoolId),
        createFetchOptions('POST', { email: email.trim(), message })
      );
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
          toast({ title: "Success", description: "Invitation sent successfully!" });
        }
        onInvited?.();
      } else {
        toast({ title: "Error", description: data.message || "Failed to send invitation.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
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
      {isReinvite && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
          Sending a new invitation replaces this school's current principal account — the old sign-in will stop working once the new one is completed.
        </div>
      )}

      <div>
        <Label htmlFor="principal-email">Principal's Email Address</Label>
        <Input
          id="principal-email"
          type="email"
          placeholder="principal@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground mt-1">
          This becomes their login for the NoteSwift Schools portal.
        </p>
      </div>

      <div>
        <Label htmlFor="principal-message">Invitation Message</Label>
        <Textarea
          id="principal-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• An invitation email is sent to this address</li>
          <li>• The link expires in 48 hours</li>
          <li>• They set a name, phone number, and password — the school and email are already fixed by this invite</li>
          <li>• They can then log in to the NoteSwift Schools portal with full access to {schoolName}</li>
        </ul>
      </div>

      {fallbackLink && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-amber-900 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <h4 className="font-medium">Email failed to send</h4>
          </div>
          <p className="text-sm text-amber-800 mb-2">
            The invitation was created, but we couldn't email it. Copy this link and send it to them directly.
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
            {isReinvite ? "Send New Invitation" : "Send Invitation"}
          </>
        )}
      </Button>
    </form>
  );
}
