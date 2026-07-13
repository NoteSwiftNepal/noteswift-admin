"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolList } from "@/components/schools/school-list";
import { School } from "lucide-react";

export default function SchoolManagementPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2">
          <School className="h-6 w-6 text-primary" />
          <CardTitle className="text-3xl font-bold text-gray-900">School Management</CardTitle>
        </div>
        <p className="text-gray-600 mt-2">Manage schools and their admins, teachers, and students</p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
          <CardDescription>View and manage schools on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolList />
        </CardContent>
      </Card>
    </div>
  );
}
