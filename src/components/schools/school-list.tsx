"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { School as SchoolIcon, Search, Plus, Ban, ExternalLink } from "lucide-react";
import { useAdmin } from "@/context/admin-context";
import { SchoolFormDialog } from "./school-form-dialog";
import { viewSchoolDashboard } from "@/lib/view-school-dashboard";
import { useToast } from "@/hooks/use-toast";

interface School {
  _id: string;
  name: string;
  shortCode: string;
  address?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export function SchoolList() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const { isSystemAdmin, isSuperAdmin } = useAdmin();
  const canManageSchools = isSystemAdmin || isSuperAdmin;
  const { toast } = useToast();

  const handleViewDashboard = async (schoolId: string) => {
    try {
      await viewSchoolDashboard(schoolId);
    } catch (error) {
      toast({
        title: "Can't open dashboard",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.LIST, createFetchOptions('GET'));
      const data = await response.json();
      setSchools(data.data?.schools || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const deactivateSchool = async (schoolId: string) => {
    if (!confirm('Are you sure you want to deactivate this school?')) return;
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.DEACTIVATE(schoolId), createFetchOptions('POST'));
      if (response.ok) {
        fetchSchools();
      }
    } catch (error) {
      console.error('Error deactivating school:', error);
    }
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.shortCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading schools...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools by name or short code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {canManageSchools && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add School
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {filteredSchools.map((school) => (
          <div key={school._id} className="flex items-center justify-between p-4 border rounded-lg">
            <Link href={`/dashboard/school-management/${school._id}`} className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                {school.logoUrl ? (
                  <img src={school.logoUrl} alt={`${school.name} logo`} className="w-full h-full object-cover" />
                ) : (
                  <SchoolIcon className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{school.name}</div>
                <div className="text-sm text-muted-foreground truncate">{school.address || "No address on file"}</div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(school.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="font-mono">{school.shortCode}</Badge>
              {school.isActive ? (
                <Badge variant="default" className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {canManageSchools && school.isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDashboard(school._id)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Dashboard
                </Button>
              )}
              {canManageSchools && school.isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deactivateSchool(school._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No schools found matching your search.' : 'No schools added yet.'}
        </div>
      )}

      <SchoolFormDialog open={addOpen} onOpenChange={setAddOpen} onSaved={fetchSchools} />
    </div>
  );
}
