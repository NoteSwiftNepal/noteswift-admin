"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Shield, Trash2, BadgeIndianRupee } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/context/admin-context";
import { RemoveAdminDialog } from "./remove-admin-dialog";
import { useToast } from "@/hooks/use-toast";
import { productRoleOf, ROLE_BADGES, ProductRole } from "@/lib/permissions";

interface Admin {
  _id: string;
  email: string;
  name: string;
  role: 'system_admin' | 'super_admin' | 'admin' | 'sales';
  createdAt: string;
  lastLogin?: string;
}

export function AdminHierarchy() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null);
  const { canDeleteAdmin } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.LIST, createFetchOptions('GET'));
      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRemoveDialog = (admin: Admin) => {
    setAdminToRemove(admin);
    setRemoveDialogOpen(true);
  };

  const handleRemoveAdmin = async (adminId: string, reason: string) => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.REMOVE, createFetchOptions('POST', { adminId, reason }));
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Admin Removed",
          description: data.message || "The administrator has been removed and notified via email.",
        });
        fetchAdmins();
      } else {
        throw new Error(data.error || 'Failed to remove admin');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Three levels (lib/permissions.ts): stored system_admin is the Super
  // Admin; stored super_admin and admin are both Admin; sales is Sales.
  const GROUPS: { role: ProductRole; title: string; icon: React.ReactNode; empty: string }[] = [
    { role: 'super_admin', title: 'Super Admins', icon: <Crown className="h-5 w-5 text-red-500" />, empty: 'No Super Admins' },
    { role: 'admin', title: 'Admins', icon: <Shield className="h-5 w-5 text-blue-500" />, empty: 'No Admins' },
    { role: 'sales', title: 'Sales', icon: <BadgeIndianRupee className="h-5 w-5 text-emerald-600" />, empty: 'No Sales accounts yet' },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading admin hierarchy...</div>;
  }

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const members = admins.filter((a) => productRoleOf(a.role) === group.role);
        return (
          <div key={group.role}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {group.icon}
              {group.title} ({members.length})
            </h3>
            {members.length > 0 ? (
              <div className="space-y-3">
                {members.map((admin) => (
                  <Card key={admin._id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{admin.name}</div>
                          <div className="text-sm text-muted-foreground truncate">{admin.email}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(admin.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="default" className={ROLE_BADGES[group.role].className}>{ROLE_BADGES[group.role].text}</Badge>
                          {canDeleteAdmin(admin._id, admin.role) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Remove ${admin.name}`}
                              onClick={() => openRemoveDialog(admin)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">{group.empty}</div>
            )}
          </div>
        );
      })}

      {/* Remove Admin Dialog */}
      <RemoveAdminDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        admin={adminToRemove}
        onConfirm={handleRemoveAdmin}
      />
    </div>
  );
}
