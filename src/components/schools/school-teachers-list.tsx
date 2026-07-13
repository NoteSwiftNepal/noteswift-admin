"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, UserMinus } from "lucide-react";
import {
  TeacherSummary,
  fetchApprovedTeachers,
  assignTeacherSchool,
} from "@/lib/api/adminTeachers";

interface SchoolTeachersListProps {
  schoolId: string;
}

export function SchoolTeachersList({ schoolId }: SchoolTeachersListProps) {
  const [schoolTeachers, setSchoolTeachers] = useState<TeacherSummary[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    try {
      const [scoped, all] = await Promise.all([
        fetchApprovedTeachers(schoolId),
        fetchApprovedTeachers(),
      ]);
      setSchoolTeachers(scoped);
      setAllTeachers(all);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleAssign = async (teacherId: string) => {
    try {
      await assignTeacherSchool(teacherId, schoolId);
      await load();
    } catch (error) {
      console.error('Error assigning teacher to school:', error);
    }
  };

  const handleUnassign = async (teacherId: string) => {
    try {
      await assignTeacherSchool(teacherId, null);
      await load();
    } catch (error) {
      console.error('Error removing teacher from school:', error);
    }
  };

  const name = (t: TeacherSummary) => t.fullName || `${t.firstName || ""} ${t.lastName || ""}`.trim() || t.email;

  const unassignedTeachers = allTeachers
    .filter((t) => !t.schoolId)
    .filter((t) => name(t).toLowerCase().includes(searchTerm.toLowerCase()) || t.email.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return <div className="text-center py-8">Loading teachers...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Teachers at this school</h4>
        {schoolTeachers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No teachers assigned to this school yet.</div>
        ) : (
          <div className="space-y-3">
            {schoolTeachers.map((teacher) => (
              <div key={teacher._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{name(teacher)}</div>
                  <div className="text-sm text-muted-foreground">{teacher.email}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnassign(teacher._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Remove from school
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Assign an existing teacher</h4>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search approved teachers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {unassignedTeachers.map((teacher) => (
            <div key={teacher._id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{name(teacher)}</div>
                <div className="text-sm text-muted-foreground">{teacher.email}</div>
              </div>
              <Button size="sm" onClick={() => handleAssign(teacher._id)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            </div>
          ))}
          {unassignedTeachers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              {searchTerm ? "No matching teachers found." : "All approved teachers are already assigned to a school."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
