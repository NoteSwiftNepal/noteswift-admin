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
import { UserPlus, Mail, Clock, CheckCircle2 } from "lucide-react";
import { InvitePrincipal } from "./invite-principal";

interface SchoolPrincipalPanelProps {
  schoolId: string;
  schoolName: string;
  canManage: boolean;
}

type PrincipalStatus =
  | { status: 'none' }
  | { status: 'pending' | 'expired'; email: string; invitationExpires: string }
  | { status: 'active'; email: string; lastLogin?: string };

export function SchoolPrincipalPanel({ schoolId, schoolName, canManage }: SchoolPrincipalPanelProps) {
  const [data, setData] = useState<PrincipalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.PRINCIPAL_STATUS(schoolId), createFetchOptions('GET'));
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching principal status:', error);
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

  return (
    <Card className="shadow-md mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Principal</CardTitle>
          <CardDescription>The single administrator account with full access to {schoolName}'s data.</CardDescription>
        </div>
        {canManage && data && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            {data.status === 'none' ? 'Invite Principal' : 'Re-invite Principal'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !data || data.status === 'none' ? (
          <div className="text-center py-8 text-muted-foreground">
            No principal account has been set up for this school yet.
          </div>
        ) : data.status === 'active' ? (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{data.email}</span>
                <Badge variant="default" className="bg-green-500">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.lastLogin
                  ? `Last logged in ${new Date(data.lastLogin).toLocaleString()}`
                  : 'Registered, but has not logged in yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4">
            {data.status === 'expired' ? (
              <Clock className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <Mail className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{data.email}</span>
                <Badge variant={data.status === 'expired' ? 'destructive' : 'secondary'}>
                  {data.status === 'expired' ? 'Invitation Expired' : 'Invitation Pending'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.status === 'expired'
                  ? `Expired ${new Date(data.invitationExpires).toLocaleString()} — send a new invitation below.`
                  : `Expires ${new Date(data.invitationExpires).toLocaleString()}`}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{data?.status === 'none' ? 'Invite' : 'Re-invite'} Principal for {schoolName}</DialogTitle>
            <DialogDescription>The invitation link expires in 48 hours.</DialogDescription>
          </DialogHeader>
          <InvitePrincipal
            schoolId={schoolId}
            schoolName={schoolName}
            isReinvite={!!data && data.status !== 'none'}
            onInvited={handleInvited}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
