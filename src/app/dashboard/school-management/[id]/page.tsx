"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { School, ArrowLeft, UserPlus, Ban, Pencil, ExternalLink } from "lucide-react";
import { AdminList } from "@/components/admin/admin-list";
import { InviteAdmin } from "@/components/admin/invite-admin";
import { SchoolTeachersList } from "@/components/schools/school-teachers-list";
import { SchoolStudentsList } from "@/components/schools/school-students-list";
import { SchoolFormDialog } from "@/components/schools/school-form-dialog";
import { SchoolPrincipalPanel } from "@/components/schools/school-principal-panel";
import { useAdmin } from "@/context/admin-context";
import { viewSchoolDashboard } from "@/lib/view-school-dashboard";
import { useToast } from "@/hooks/use-toast";

interface SchoolDetail {
  _id: string;
  name: string;
  shortCode: string;
  address?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;
  const { isSystemAdmin, isSuperAdmin } = useAdmin();
  const canManageSchools = isSystemAdmin || isSuperAdmin;
  const { toast } = useToast();

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleViewDashboard = async () => {
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

  const fetchSchool = useCallback(async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.GET(schoolId), createFetchOptions('GET'));
      const data = await response.json();
      setSchool(data.data?.school || null);
    } catch (error) {
      console.error('Error fetching school:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSchool();
  }, [fetchSchool]);

  const deactivateSchool = async () => {
    if (!confirm('Are you sure you want to deactivate this school?')) return;
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.DEACTIVATE(schoolId), createFetchOptions('POST'));
      if (response.ok) fetchSchool();
    } catch (error) {
      console.error('Error deactivating school:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading school...</div>;
  }

  if (!school) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">School not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/school-management')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to School Management
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => router.push('/dashboard/school-management')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to School Management
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {school.logoUrl ? (
                <img src={school.logoUrl} alt={`${school.name} logo`} className="w-full h-full object-cover" />
              ) : (
                <School className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900">{school.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono">{school.shortCode}</Badge>
                {school.isActive ? (
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
          {canManageSchools && (
            <div className="flex items-center gap-2">
              {school.isActive && (
                <Button variant="outline" onClick={handleViewDashboard}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Dashboard
                </Button>
              )}
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit School
              </Button>
              {school.isActive && (
                <Button variant="outline" onClick={deactivateSchool} className="text-red-600 hover:text-red-700">
                  <Ban className="h-4 w-4 mr-1" />
                  Deactivate School
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="text-gray-600 mt-2">{school.address || "No address on file"}</p>
      </div>

      <Tabs defaultValue="principal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="principal">Principal</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="principal">
          <SchoolPrincipalPanel schoolId={schoolId} schoolName={school.name} canManage={canManageSchools} />
        </TabsContent>

        <TabsContent value="admins">
          <Card className="shadow-md mt-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>School Admins</CardTitle>
                <CardDescription>Administrators scoped to {school.name}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Invite Admin
              </Button>
            </CardHeader>
            <CardContent>
              <AdminList schoolId={schoolId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>School Teachers</CardTitle>
              <CardDescription>Teachers assigned to {school.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolTeachersList schoolId={schoolId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>School Students</CardTitle>
              <CardDescription>Students linked to {school.name} via redeemed unlock codes</CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolStudentsList schoolId={schoolId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Admin to {school.name}</DialogTitle>
            <DialogDescription>This admin will be scoped to this school.</DialogDescription>
          </DialogHeader>
          <InviteAdmin schoolId={schoolId} onInvited={() => setInviteOpen(false)} />
        </DialogContent>
      </Dialog>

      <SchoolFormDialog open={editOpen} onOpenChange={setEditOpen} school={school} onSaved={fetchSchool} />
    </div>
  );
}
