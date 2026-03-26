"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminList } from "@/components/admin/admin-list";
import { InviteAdmin } from "@/components/admin/invite-admin";
import { AdminHierarchy } from "@/components/admin/admin-hierarchy";
import { useAdmin } from "@/context/admin-context";
import { Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function AdminManagementPage() {
  const { admin, canInviteAdmins } = useAdmin();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'hierarchy';
  return (
    <div className="flex flex-col gap-8">
     
 <div>
           <div className="flex items-center gap-2">
           <Shield className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">Admin Management</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Manage administrators and their permissions</p>
        </div>
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className={`grid w-full ${canInviteAdmins ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="hierarchy">Admin Hierarchy</TabsTrigger>
          <TabsTrigger value="list">All Admins</TabsTrigger>
          {canInviteAdmins && (
            <TabsTrigger value="invite">Invite Admin</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="hierarchy">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>Admin Hierarchy</CardTitle>
              <CardDescription>View the current admin structure and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminHierarchy />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>All Administrators</CardTitle>
              <CardDescription>Manage existing administrators and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminList />
            </CardContent>
          </Card>
        </TabsContent>

        {canInviteAdmins && (
          <TabsContent value="invite">
            <Card className="shadow-md mt-6">
              <CardHeader>
                <CardTitle>Invite New Administrator</CardTitle>
                <CardDescription>Send invitation to add a new admin to the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <InviteAdmin />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}