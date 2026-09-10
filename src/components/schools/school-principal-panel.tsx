"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Mail, Clock, CheckCircle2, Trash2, Send } from "lucide-react";
import { InvitePrincipal } from "./invite-principal";
import { useToast } from "@/hooks/use-toast";

interface SchoolPrincipalPanelProps {
  schoolId: string;
  schoolName: string;
  canManage: boolean;
}

interface Principal {
  _id: string;
  email: string;
  status: 'active' | 'pending' | 'expired';
  invitationExpires?: string;
  lastLogin?: string;
}

export function SchoolPrincipalPanel({ schoolId, schoolName, canManage }: SchoolPrincipalPanelProps) {
  const { toast } = useToast();
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.PRINCIPAL_STATUS(schoolId), createFetchOptions('GET'));
      const result = await response.json();
      if (result.success) setPrincipals(result.data?.principals || []);
    } catch (error) {
      console.error('Error fetching principals:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleInvited = () => {
    setInviteOpen(false);
    fetchStatus();
  };

  const handleReinvite = async (p: Principal) => {
    setBusyId(p._id);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.SCHOOLS.INVITE_PRINCIPAL(schoolId),
        createFetchOptions('POST', { email: p.email })
      );
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Invitation resent", description: `A fresh invite was sent to ${p.email}.` });
        fetchStatus();
      } else {
        toast({ title: "Could not resend", description: data.message || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not resend", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (p: Principal) => {
    setBusyId(p._id);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.SCHOOLS.REMOVE_PRINCIPAL(schoolId, p._id),
        createFetchOptions('POST')
      );
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Principal removed", description: `${p.email} was removed.` });
        setPrincipals((prev) => prev.filter((x) => x._id !== p._id));
        fetchStatus();
      } else {
        toast({ title: "Could not remove", description: data.message || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not remove", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="shadow-md mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Principals</CardTitle>
          <CardDescription>Administrator accounts with full access to {schoolName}'s data.</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add Principal
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : principals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No principal accounts yet. Add one to give a school administrator access to {schoolName}.
          </div>
        ) : (
          <div className="space-y-3">
            {principals.map((p) => (
              <div key={p._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  {p.status === 'active' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  ) : p.status === 'expired' ? (
                    <Clock className="h-5 w-5 text-red-500 shrink-0" />
                  ) : (
                    <Mail className="h-5 w-5 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{p.email}</span>
                      <Badge
                        variant={p.status === 'active' ? 'default' : p.status === 'expired' ? 'destructive' : 'secondary'}
                        className={p.status === 'active' ? 'bg-green-500' : ''}
                      >
                        {p.status === 'active' ? 'Active' : p.status === 'expired' ? 'Invitation Expired' : 'Invitation Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {p.status === 'active'
                        ? p.lastLogin
                          ? `Last logged in ${new Date(p.lastLogin).toLocaleString()}`
                          : 'Registered, but has not logged in yet'
                        : p.status === 'expired'
                          ? `Expired ${p.invitationExpires ? new Date(p.invitationExpires).toLocaleString() : ''} — re-invite to send a new link.`
                          : `Expires ${p.invitationExpires ? new Date(p.invitationExpires).toLocaleString() : ''}`}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status !== 'active' && (
                      <Button variant="outline" size="sm" onClick={() => handleReinvite(p)} disabled={busyId === p._id}>
                        <Send className="h-4 w-4 mr-1" />
                        Re-invite
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busyId === p._id}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {p.email}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This deletes this principal&apos;s account for {schoolName}.{" "}
                            {p.status === 'active'
                              ? "Their sign-in will stop working immediately."
                              : "Their pending invitation will be cancelled."}{" "}
                            Other principals of this school are unaffected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleRemove(p)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Principal for {schoolName}</DialogTitle>
            <DialogDescription>The invitation link expires in 48 hours.</DialogDescription>
          </DialogHeader>
          <InvitePrincipal schoolId={schoolId} schoolName={schoolName} onInvited={handleInvited} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
