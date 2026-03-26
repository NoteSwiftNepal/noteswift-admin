"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Users, 
  Plus, 
  Trash2, 
  UserCheck, 
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Teacher {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  profilePhoto?: string;
}

interface Course {
  _id: string;
  title: string;
  subjects?: Array<{
    name: string;
    description?: string;
  }>;
}

interface Assignment {
  _id: string;
  teacherId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePhoto?: string;
  };
  courseId: {
    _id: string;
    title: string;
    thumbnail?: string;
  };
  subjectName: string;
  assignedAt: Date;
  assignedBy?: {
    firstName: string;
    lastName: string;
  };
  notes?: string;
  isActive: boolean;
}

interface TeacherWithAssignments extends Teacher {
  assignments: Assignment[];
  totalSubjects: number;
}

export default function TeacherAssignmentsPage() {
  const [teachers, setTeachers] = useState<TeacherWithAssignments[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  // Support multiple course-subject pairs for cross-course assignment
  const [selectedCourseSubjects, setSelectedCourseSubjects] = useState<Array<{courseId: string, subjectName: string}>>([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading teachers and assignments data...');
      const [teachersData, coursesData] = await Promise.all([
        fetchTeachersWithAssignments(),
        fetchCourses()
      ]);
      console.log('✅ Data loaded successfully:', {
        teachers: teachersData.length,
        courses: coursesData.length
      });
      setTeachers(teachersData);
      setCourses(coursesData);
    } catch (err: any) {
      console.error('❌ Failed to load data:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachersWithAssignments = async (): Promise<TeacherWithAssignments[]> => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const { fetchApprovedTeachers } = await import('@/lib/api/adminTeachers');
      
      // Fetch approved teachers using existing API function
      console.log('Fetching approved teachers...');
      const teachersList = await fetchApprovedTeachers();
      console.log('Teachers list:', teachersList.length, 'teachers found');

      // Fetch all assignments
      console.log('Fetching assignments from:', `${API_ENDPOINTS.BASE}/api/teacher/teacher-assignments`);
      const assignmentsRes = await fetch(
        `${API_ENDPOINTS.BASE}/api/teacher/teacher-assignments`,
        {
          ...createFetchOptions('GET'),
          cache: 'no-store'
        }
      );
      
      if (!assignmentsRes.ok) {
        const errorText = await assignmentsRes.text();
        console.error('Failed to fetch assignments:', assignmentsRes.status, errorText);
        throw new Error('Failed to fetch assignments');
      }
      
      const assignmentsJson = await assignmentsRes.json();
      console.log('Assignments API response:', assignmentsJson);
      const allAssignments = assignmentsJson.data?.assignments || [];
      console.log('Assignments list:', allAssignments.length, 'assignments found');

      // Group assignments by teacher
      const teachersWithAssignments = teachersList.map((teacher) => {
        const teacherAssignments = allAssignments.filter(
          (assignment: Assignment) => 
            assignment.teacherId._id === teacher._id && assignment.isActive
        );
        return {
          _id: teacher._id,
          firstName: teacher.firstName || '',
          lastName: teacher.lastName || '',
          email: teacher.email,
          phoneNumber: teacher.phoneNumber,
          profilePhoto: teacher.verificationDocuments?.profile?.[0]?.url,
          assignments: teacherAssignments,
          totalSubjects: teacherAssignments.length
        };
      });

      console.log('Teachers with assignments:', teachersWithAssignments.length);
      return teachersWithAssignments;
    } catch (err: any) {
      console.error('Error fetching teachers with assignments:', err);
      throw err;
    }
  };

  const fetchCourses = async (): Promise<Course[]> => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const res = await fetch(API_ENDPOINTS.COURSES.LIST, createFetchOptions('GET'));
      if (!res.ok) throw new Error('Failed to fetch courses');
      const json = await res.json();
      return json.result?.courses || [];
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      return [];
    }
  };

  const handleAssignSubject = async () => {
    if (!selectedTeacher || selectedCourseSubjects.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one subject to assign',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const adminId = localStorage.getItem('adminId');

      // Use bulk assignment for all selections (supports multiple courses)
      const assignments = selectedCourseSubjects.map(cs => ({
        courseId: cs.courseId,
        subjectName: cs.subjectName,
        notes: assignmentNotes
      }));

      const res = await fetch(
        `${API_ENDPOINTS.BASE}/api/teacher/teacher-assignments/bulk`,
        createFetchOptions('POST', {
          teacherId: selectedTeacher._id,
          assignments,
          assignedBy: adminId
        })
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to assign teacher');
      }

      const data = await res.json();
      
      const successCount = data.data.success.length;
      const failedCount = data.data.failed.length;
      
      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `${successCount} subject${successCount !== 1 ? 's' : ''} assigned successfully${failedCount > 0 ? ` (${failedCount} skipped - already assigned)` : ''}`
        });
      }
      
      if (failedCount > 0 && successCount === 0) {
        toast({
          title: 'Warning',
          description: `All ${failedCount} subject${failedCount !== 1 ? 's were' : ' was'} already assigned`,
          variant: 'destructive'
        });
      }

      setIsBulkAssignDialogOpen(false);
      setSelectedCourseSubjects([]);
      setAssignmentNotes('');
      setExpandedCourses(new Set());
      loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to assign teacher',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to remove this assignment for ${subjectName}?`)) {
      return;
    }

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const res = await fetch(
        `${API_ENDPOINTS.BASE}/api/teacher/teacher-assignments/${assignmentId}`,
        createFetchOptions('DELETE')
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove assignment');
      }

      toast({
        title: 'Success',
        description: `Assignment removed for ${subjectName}`
      });

      loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove assignment',
        variant: 'destructive'
      });
    }
  };

  const toggleTeacherExpansion = (teacherId: string) => {
    const newExpanded = new Set(expandedTeachers);
    if (newExpanded.has(teacherId)) {
      newExpanded.delete(teacherId);
    } else {
      newExpanded.add(teacherId);
    }
    setExpandedTeachers(newExpanded);
  };

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Teacher Subject Assignments</h1>
          </div>
          <p className="text-gray-600 mt-2">Assign multiple subjects to teachers</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Teacher Subject Assignments</h1>
        </div>
        <p className="text-gray-600 mt-2">Assign and manage multiple subjects for each teacher</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.filter(t => t.totalSubjects > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.reduce((sum, t) => sum + t.totalSubjects, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Teachers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers List */}
      <div className="space-y-4">
        {filteredTeachers.map((teacher) => {
          const isExpanded = expandedTeachers.has(teacher._id);
          
          return (
            <Card key={teacher._id}>
              <CardHeader className="cursor-pointer hover:bg-muted/50" onClick={() => toggleTeacherExpansion(teacher._id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center">
                      {teacher.profilePhoto ? (
                        <img
                          src={teacher.profilePhoto}
                          alt={`${teacher.firstName} ${teacher.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {(teacher.firstName?.[0] || '')}{(teacher.lastName?.[0] || '') || teacher.email[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {teacher.firstName} {teacher.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={teacher.totalSubjects > 0 ? "default" : "secondary"}>
                      {teacher.totalSubjects} Subject{teacher.totalSubjects !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeacher(teacher);
                        setIsBulkAssignDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  {teacher.assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No subjects assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teacher.assignments.map((assignment) => (
                        <div
                          key={assignment._id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <div>
                              <p className="font-medium">{assignment.subjectName}</p>
                              <p className="text-sm text-muted-foreground">
                                {assignment.courseId?.title ?? "Course deleted"}
                              </p>
                              {assignment.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Note: {assignment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                            </Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveAssignment(assignment._id, assignment.subjectName)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}

        {filteredTeachers.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Users className="h-12 w-12 mb-4" />
                <p>No teachers found matching your search</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Subjects to Teacher</DialogTitle>
            <DialogDescription>
              Select subjects from any course to assign to {selectedTeacher?.firstName} {selectedTeacher?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div>
              <Label className="text-base font-semibold">Available Courses & Subjects</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Expand courses and select subjects to assign. You can select from multiple courses.
              </p>
              
              <div className="space-y-2">
                {courses.map((course) => {
                  const isExpanded = expandedCourses.has(course._id);
                  const courseSubjects = course.subjects?.map(s => s.name) || [];
                  const selectedFromThisCourse = selectedCourseSubjects.filter(
                    cs => cs.courseId === course._id
                  ).length;
                  
                  return (
                    <div key={course._id} className="border rounded-lg">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          const newExpanded = new Set(expandedCourses);
                          if (isExpanded) {
                            newExpanded.delete(course._id);
                          } else {
                            newExpanded.add(course._id);
                          }
                          setExpandedCourses(newExpanded);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {courseSubjects.length} subject{courseSubjects.length !== 1 ? 's' : ''} available
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedFromThisCourse > 0 && (
                            <Badge variant="default">
                              {selectedFromThisCourse} selected
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && courseSubjects.length > 0 && (
                        <div className="border-t p-3 space-y-2 bg-muted/20">
                          {courseSubjects.map((subject) => {
                            const isSelected = selectedCourseSubjects.some(
                              cs => cs.courseId === course._id && cs.subjectName === subject
                            );
                            const uniqueId = `${course._id}-${subject}`;
                            
                            return (
                              <div key={uniqueId} className="flex items-center space-x-2 pl-6">
                                <Checkbox
                                  id={uniqueId}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCourseSubjects([
                                        ...selectedCourseSubjects,
                                        { courseId: course._id, subjectName: subject }
                                      ]);
                                    } else {
                                      setSelectedCourseSubjects(
                                        selectedCourseSubjects.filter(
                                          cs => !(cs.courseId === course._id && cs.subjectName === subject)
                                        )
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={uniqueId}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                >
                                  {subject}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedCourseSubjects.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Selected: {selectedCourseSubjects.length} subject{selectedCourseSubjects.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourseSubjects.map((cs, index) => {
                      const course = courses.find(c => c._id === cs.courseId);
                      return (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {cs.subjectName} <span className="text-muted-foreground ml-1">({course?.title})</span>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="Add any notes about these assignments..."
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBulkAssignDialogOpen(false);
                setSelectedCourseSubjects([]);
                setAssignmentNotes('');
                setExpandedCourses(new Set());
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignSubject}
              disabled={selectedCourseSubjects.length === 0}
            >
              Assign {selectedCourseSubjects.length > 0 && `(${selectedCourseSubjects.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
