"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ShieldX } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/context/admin-context";

export function InviteAdmin() {
  const { admin, canInviteAdmins } = useAdmin();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("You have been invited to join the NoteSwift admin team. Click the link below to accept the invitation and set up your account.");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.INVITE, createFetchOptions('POST', {
        email: email.trim(),
        message
      }));

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invitation sent successfully!",
        });
        setEmail("");
        setMessage("You have been invited to join the NoteSwift admin team. Click the link below to accept the invitation and set up your account.");
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
          <li>• Once registered, they'll have admin access to the platform</li>
        </ul>
      </div>

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