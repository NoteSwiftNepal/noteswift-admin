"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AdminData {
  _id: string;
  email: string;
  name: string;
  role: 'system_admin' | 'super_admin' | 'admin';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

interface AdminContextType {
  admin: AdminData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasPermission: (requiredRole: string) => boolean;
  isSystemAdmin: boolean;
  isSuperAdmin: boolean;
  isRegularAdmin: boolean;
  canPromoteToSuperAdmin: (targetRole: string) => boolean;
  canDemoteFromSuperAdmin: (targetRole: string) => boolean;
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

  const hasPermission = (requiredRole: string): boolean => {
    if (!admin) return false;

    const roleHierarchy = {
      'system_admin': 3,
      'super_admin': 2,
      'admin': 1
    };

    return roleHierarchy[admin.role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy];
  };

  const canPromoteToSuperAdmin = (targetRole: string): boolean => {
    return admin?.role === 'system_admin' && targetRole === 'admin';
  };

  const canDemoteFromSuperAdmin = (targetRole: string): boolean => {
    return admin?.role === 'system_admin' && targetRole === 'super_admin';
  };

  const canDeleteAdmin = (targetId: string, targetRole: string): boolean => {
    // Cannot delete yourself
    if (admin?._id === targetId) return false;

    // System admin can delete anyone
    if (admin?.role === 'system_admin') return true;

    // Super admin can only delete regular admins
    if (admin?.role === 'super_admin') return targetRole === 'admin';

    // Regular admins cannot delete anyone
    return false;
  };

  const canManageSpecificAdmin = (targetId: string, targetRole: string): boolean => {
    // Cannot manage yourself
    if (admin?._id === targetId) return false;

    // System admin can manage anyone (except themselves, handled above)
    if (admin?.role === 'system_admin') return true;

    // Super admin can only manage regular admins
    if (admin?.role === 'super_admin') return targetRole === 'admin';

    // Regular admins cannot manage anyone
    return false;
  };

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const value: AdminContextType = {
    admin,
    loading,
    error,
    refetch,
    hasPermission,
    isSystemAdmin: admin?.role === 'system_admin',
    isSuperAdmin: admin?.role === 'super_admin',
    isRegularAdmin: admin?.role === 'admin',
    canPromoteToSuperAdmin,
    canDemoteFromSuperAdmin,
    canDeleteAdmin,
    canManageSpecificAdmin,
    canInviteAdmins: admin?.role === 'system_admin' || admin?.role === 'super_admin'
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