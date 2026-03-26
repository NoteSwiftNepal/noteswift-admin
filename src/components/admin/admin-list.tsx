"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Shield, User, Trash2, Star, Search, UserMinus } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/context/admin-context";

interface Admin {
  _id: string;
  email: string;
  name: string;
  role: 'system_admin' | 'super_admin' | 'admin';
  createdAt: string;
  lastLogin?: string;
}

export function AdminList() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { admin: currentAdmin, canPromoteToSuperAdmin, canDemoteFromSuperAdmin, canDeleteAdmin } = useAdmin();

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

  const demoteSuperAdmin = async (adminId: string) => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.DEMOTE_SUPER_ADMIN, createFetchOptions('POST', { adminId }));
      if (response.ok) {
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error demoting super admin:', error);
    }
  };

  const removeAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMINS.REMOVE, createFetchOptions('POST', { adminId }));
      if (response.ok) {
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error removing admin:', error);
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

  const getRolePriority = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 1;
      case 'super_admin':
        return 2;
      default:
        return 3;
    }
  };

  const filteredAdmins = admins
    .filter(admin =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));

  if (loading) {
    return <div className="text-center py-8">Loading administrators...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search admins by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Admin List */}
      <div className="space-y-4">
        {filteredAdmins.map((admin) => (
          <div key={admin._id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                {admin.role === 'system_admin' && <Crown className="h-5 w-5 text-yellow-500" />}
                {admin.role === 'super_admin' && <Star className="h-5 w-5 text-purple-500" />}
                {admin.role === 'admin' && <Shield className="h-5 w-5 text-blue-500" />}
              </div>
              <div>
                <div className="font-medium">{admin.name}</div>
                <div className="text-sm text-muted-foreground">{admin.email}</div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(admin.createdAt).toLocaleDateString()}
                  {admin.lastLogin && ` • Last login: ${new Date(admin.lastLogin).toLocaleDateString()}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getRoleBadge(admin.role)}
              {/* Promote to Super Admin - only system admin can do this for regular admins */}
              {canPromoteToSuperAdmin(admin.role) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSuperAdmin(admin._id)}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Star className="h-4 w-4 mr-1" />
                  Make Super Admin
                </Button>
              )}
              {/* Demote from Super Admin - only system admin can do this for super admins */}
              {canDemoteFromSuperAdmin(admin.role) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => demoteSuperAdmin(admin._id)}
                  className="text-orange-600 hover:text-orange-700"
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Demote to Admin
                </Button>
              )}
              {/* Remove Admin - based on role permissions */}
              {canDeleteAdmin(admin._id, admin.role) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeAdmin(admin._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAdmins.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No admins found matching your search.' : 'No administrators found.'}
        </div>
      )}
    </div>
  );
}