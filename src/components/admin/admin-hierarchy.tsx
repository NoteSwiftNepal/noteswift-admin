"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Shield, User, Trash2, Star } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/context/admin-context";
import { RemoveAdminDialog } from "./remove-admin-dialog";
import { useToast } from "@/hooks/use-toast";

interface Admin {
  _id: string;
  email: string;
  name: string;
  role: 'system_admin' | 'super_admin' | 'admin';
  createdAt: string;
  lastLogin?: string;
}

export function AdminHierarchy() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null);
  const { admin: currentAdmin, canDeleteAdmin, canPromoteToSuperAdmin } = useAdmin();
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

  const setSuperAdmin = async (adminId: string) => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.SET_SUPER_ADMIN, createFetchOptions('POST', { adminId }));
      if (response.ok) {
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error setting super admin:', error);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'system_admin':
        return <Crown className="h-5 w-5 text-red-500" />;
      case 'super_admin':
        return <Star className="h-5 w-5 text-purple-500" />;
      default:
        return <Shield className="h-5 w-5 text-blue-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'system_admin':
        return <Badge variant="default" className="bg-red-500">System Admin</Badge>;
      case 'super_admin':
        return <Badge variant="default" className="bg-purple-500">Super Admin</Badge>;
      default:
        return <Badge variant="default" className="bg-blue-500">Admin</Badge>;
    }
  };

  const systemAdmin = admins.find(admin => admin.role === 'system_admin');
  const superAdmin = admins.find(admin => admin.role === 'super_admin');
  const regularAdmins = admins.filter(admin => admin.role === 'admin');

  if (loading) {
    return <div className="text-center py-8">Loading admin hierarchy...</div>;
  }

  return (
    <div className="space-y-6">
      {/* System Admin */}
      {systemAdmin && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Crown className="h-5 w-5 text-red-500" />
            System Administrator
          </h3>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{systemAdmin.name}</div>
                  <div className="text-sm text-muted-foreground">{systemAdmin.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(systemAdmin.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(systemAdmin.role)}
                  <span className="text-xs text-muted-foreground">Cannot be modified</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Super Admin */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Star className="h-5 w-5 text-purple-500" />
          Super Administrator
        </h3>
        {superAdmin ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{superAdmin.name}</div>
                  <div className="text-sm text-muted-foreground">{superAdmin.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(superAdmin.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(superAdmin.role)}
                  {canDeleteAdmin(superAdmin._id, superAdmin.role) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRemoveDialog(superAdmin)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No Super Admin assigned
          </div>
        )}
      </div>

      {/* Regular Admins */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Administrators ({regularAdmins.length})
        </h3>
        {regularAdmins.length > 0 ? (
          <div className="space-y-3">
            {regularAdmins.map((admin) => (
              <Card key={admin._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{admin.name}</div>
                      <div className="text-sm text-muted-foreground">{admin.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(admin.role)}
                      {canPromoteToSuperAdmin(admin.role) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSuperAdmin(admin._id)}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteAdmin(admin._id, admin.role) && (
                        <Button
                          size="sm"
                          variant="outline"
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
          <div className="text-center py-8 text-muted-foreground">
            No regular administrators
          </div>
        )}
      </div>

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