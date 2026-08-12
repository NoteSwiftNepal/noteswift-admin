"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StudentSummary {
  _id: string;
  full_name: string;
  email?: string;
  grade?: number;
  enrolledCourses?: string[];
  schoolCourses?: { _id: string; title: string }[];
}

interface SchoolStudentsListProps {
  schoolId: string;
  canManage?: boolean;
}

export function SchoolStudentsList({ schoolId, canManage = false }: SchoolStudentsListProps) {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        `${API_ENDPOINTS.USERS.LIST}?type=students&schoolId=${schoolId}`,
        createFetchOptions('GET')
      );
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching school students:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchStudents();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchStudents]);

  const handleRemove = async (student: StudentSummary) => {
    setRemovingId(student._id);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.SCHOOLS.REMOVE_STUDENT(schoolId, student._id),
        createFetchOptions('POST')
      );
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Student removed",
          description: data.message || `${student.full_name} was removed from this school.`,
        });
        // Drop the removed student from the list immediately, then re-sync.
        setStudents((prev) => prev.filter((s) => s._id !== student._id));
        fetchStudents();
      } else {
        toast({
          title: "Could not remove student",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Could not remove student",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

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
          <div className="min-w-0 flex-1 pr-3">
            <div className="font-medium">{student.full_name || "Unnamed student"}</div>
            {student.schoolCourses && student.schoolCourses.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {student.schoolCourses.map((c) => (
                  <Badge key={c._id} variant="outline" className="font-normal">
                    {c.title}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No courses enrolled through this school</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {typeof student.grade === "number" && (
              <Badge variant="outline">Grade {student.grade}</Badge>
            )}
            <Badge variant="secondary">
              {student.schoolCourses?.length || 0} course{student.schoolCourses?.length === 1 ? "" : "s"}
            </Badge>
            {canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={removingId === student._id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {student.full_name || "this student"} from the school?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This unlinks the student from this school and unenrolls them from every course they
                      gained through it (via this school&apos;s unlock codes). Courses they obtained any other
                      way are left untouched. This can&apos;t be undone from here.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleRemove(student)}
                    >
                      Remove student
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
