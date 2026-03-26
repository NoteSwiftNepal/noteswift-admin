"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UserManagementSettings() {
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(true);
  const [phoneVerificationRequired, setPhoneVerificationRequired] = useState(false);
  const [autoApproveTeachers, setAutoApproveTeachers] = useState(false);
  const [maxStudentsPerTeacher, setMaxStudentsPerTeacher] = useState("100");
  const [defaultUserRole, setDefaultUserRole] = useState("student");
  const [accountDeletionPeriod, setAccountDeletionPeriod] = useState("30");
  const [bulkUserImport, setBulkUserImport] = useState(false);
  const [userProfileRequired, setUserProfileRequired] = useState(true);

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving user management settings...");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Registration & Verification</Label>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Email Verification Required</Label>
            <p className="text-sm text-muted-foreground">
              Users must verify their email before accessing the platform
            </p>
          </div>
          <Switch checked={emailVerificationRequired} onCheckedChange={setEmailVerificationRequired} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Phone Verification Required</Label>
            <p className="text-sm text-muted-foreground">
              Users must verify their phone number
            </p>
          </div>
          <Switch checked={phoneVerificationRequired} onCheckedChange={setPhoneVerificationRequired} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Complete Profile Required</Label>
            <p className="text-sm text-muted-foreground">
              Users must complete their profile before using the platform
            </p>
          </div>
          <Switch checked={userProfileRequired} onCheckedChange={setUserProfileRequired} />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Teacher Management</Label>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Auto-approve Teacher Applications</Label>
            <p className="text-sm text-muted-foreground">
              Automatically approve teacher registration requests
            </p>
          </div>
          <Switch checked={autoApproveTeachers} onCheckedChange={setAutoApproveTeachers} />
        </div>

        <div>
          <Label>Max Students per Teacher</Label>
          <Input
            type="number"
            value={maxStudentsPerTeacher}
            onChange={(e) => setMaxStudentsPerTeacher(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Default User Role</Label>
          <Select value={defaultUserRole} onValueChange={setDefaultUserRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Account Deletion Period (days)</Label>
          <Input
            type="number"
            value={accountDeletionPeriod}
            onChange={(e) => setAccountDeletionPeriod(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Bulk User Import</Label>
          <p className="text-sm text-muted-foreground">
            Allow admins to import users in bulk via CSV
          </p>
        </div>
        <Switch checked={bulkUserImport} onCheckedChange={setBulkUserImport} />
      </div>

      <Button onClick={handleSave} className="w-full">
        Save User Management Settings
      </Button>
    </div>
  );
}