import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformSettings } from "@/components/admin/platform-settings";
import { SecuritySettings } from "@/components/admin/security-settings";
import { PaymentSettings } from "@/components/admin/payment-settings";
import { EmailSettings } from "@/components/admin/email-settings";
import { UserManagementSettings } from "@/components/admin/user-management-settings";
import { ContentModerationSettings } from "@/components/admin/content-moderation-settings";
import { SystemMaintenanceSettings } from "@/components/admin/system-maintenance-settings";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">

 <div>
           <div className="flex items-center gap-2">
   <Settings className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">Admin Settings</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Configure and manage your NoteSwift platform settings</p>
        </div>
      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="email">Email/SMS</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
              <CardDescription>Basic platform settings and branding</CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Password policies, sessions, and authentication</CardDescription>
            </CardHeader>
            <CardContent>
              <SecuritySettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>Payment & Financial Settings</CardTitle>
              <CardDescription>Payment gateways, commissions, and financial configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>Email & SMS Configuration</CardTitle>
              <CardDescription>SMTP settings, API keys, and notification templates</CardDescription>
            </CardHeader>
            <CardContent>
              <EmailSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Registration policies, verification, and user controls</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>Content Moderation</CardTitle>
              <CardDescription>Content policies, filters, and moderation settings</CardDescription>
            </CardHeader>
            <CardContent>
              <ContentModerationSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
              <CardDescription>Backup, maintenance mode, and system health</CardDescription>
            </CardHeader>
            <CardContent>
              <SystemMaintenanceSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
