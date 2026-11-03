"use client";

import { useState, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Shield, Trash2, Search, BadgeIndianRupee } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/context/admin-context";
import { productRoleOf, ROLE_BADGES } from "@/lib/permissions";

interface Admin {
  _id: string;
  email: string;
  name: string;
  role: 'system_admin' | 'super_admin' | 'admin' | 'sales';
  createdAt: string;
  lastLogin?: string;
}

interface AdminListProps {
  schoolId?: string;
}

export function AdminList({ schoolId }: AdminListProps = {}) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm);
  const { admin: currentAdmin, canDeleteAdmin } = useAdmin();

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const fetchAdmins = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const url = schoolId
        ? `${API_ENDPOINTS.ADMINS.LIST}?schoolId=${schoolId}`
        : API_ENDPOINTS.ADMINS.LIST;
      const response = await fetch(url, createFetchOptions('GET'));
      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
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

  // system_admin is the Super Admin; super_admin and admin are both Admin.
  const getRoleBadge = (role: string) => {
    const product = productRoleOf(role);
    const badge = product ? ROLE_BADGES[product] : { text: role, className: '' };
    return <Badge variant="default" className={badge.className}>{badge.text}</Badge>;
  };

  const ROLE_ORDER = { super_admin: 1, admin: 2, sales: 3 } as const;
  const getRolePriority = (role: string) => {
    const product = productRoleOf(role);
    return product ? ROLE_ORDER[product] : 4;
  };

  const filteredAdmins = admins
    .filter(admin =>
      admin.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      admin.email.toLowerCase().includes(debouncedSearch.toLowerCase())
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
                {productRoleOf(admin.role) === 'super_admin' && <Crown className="h-5 w-5 text-yellow-500" />}
                {productRoleOf(admin.role) === 'admin' && <Shield className="h-5 w-5 text-blue-500" />}
                {productRoleOf(admin.role) === 'sales' && <BadgeIndianRupee className="h-5 w-5 text-emerald-600" />}
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