"use client";

import React, { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import type { Permission, ProductRole } from '@/lib/permissions';

export interface AdminData {
  _id: string;
  email: string;
  phone_number?: string | null;
  name: string;
  // Stored role value; use productRole / permissions instead (lib/permissions.ts).
  role: 'system_admin' | 'super_admin' | 'admin' | 'sales';
  productRole: ProductRole | null;
  roleLabel: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

interface AdminContextType {
  admin: AdminData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Whether the signed-in admin has this permission (decides what the panel shows; the backend enforces it). */
  can: (permission: Permission) => boolean;
  productRole: ProductRole | null;
  /** Super Admin (stored system_admin), the top level. */
  isTopAdmin: boolean;
  canDeleteAdmin: (targetId: string, targetRole: string) => boolean;
  canManageSpecificAdmin: (targetId: string, targetRole: string) => boolean;
  canInviteAdmins: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('adminToken');
      if (!token) {
        setAdmin(null);
        return;
      }

      const { API_ENDPOINTS } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.ADMIN_AUTH.PROFILE, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else if (response.status === 401) {
        // Token is invalid, clear it
        localStorage.removeItem('adminToken');
        setAdmin(null);
      } else {
        throw new Error('Failed to fetch admin profile');
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchAdminProfile();
  };

  const can = useCallback(
    (permission: Permission): boolean => !!admin?.permissions?.includes(permission),
    [admin]
  );

  // Admin accounts are managed only by a Super Admin, who can't remove
  // themselves; the backend also refuses to remove a Super Admin.
  const canManageSpecificAdmin = (targetId: string, targetRole: string): boolean =>
    can('admins.manage') && admin?._id !== targetId && targetRole !== 'system_admin';

  const canDeleteAdmin = canManageSpecificAdmin;

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const value: AdminContextType = {
    admin,
    loading,
    error,
    refetch,
    can,
    productRole: admin?.productRole ?? null,
    isTopAdmin: admin?.productRole === 'super_admin',
    canDeleteAdmin,
    canManageSpecificAdmin,
    canInviteAdmins: can('admins.manage'),
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}