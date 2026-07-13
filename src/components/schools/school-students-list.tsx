"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface StudentSummary {
  _id: string;
  full_name: string;
  email?: string;
  grade?: number;
  enrolledCourses?: string[];
}

interface SchoolStudentsListProps {
  schoolId: string;
}

export function SchoolStudentsList({ schoolId }: SchoolStudentsListProps) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
        const response = await fetch(
          `${API_ENDPOINTS.USERS.LIST}?type=students&schoolId=${schoolId}`,
          createFetchOptions('GET')
        );
        const data = await response.json();
        if (!cancelled) setStudents(data.students || []);
      } catch (error) {
        console.error('Error fetching school students:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  if (loading) {
    return <div className="text-center py-8">Loading students...</div>;
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No students linked to this school yet. Students are linked automatically when they redeem a school-prefixed unlock code.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {students.map((student) => (
        <div key={student._id} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">{student.full_name || "Unnamed student"}</div>
            <div className="text-sm text-muted-foreground">{student.email || "—"}</div>
          </div>
          <div className="flex items-center gap-2">
            {typeof student.grade === "number" && (
              <Badge variant="outline">Grade {student.grade}</Badge>
            )}
            <Badge variant="secondary">
              {student.enrolledCourses?.length || 0} course{student.enrolledCourses?.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
