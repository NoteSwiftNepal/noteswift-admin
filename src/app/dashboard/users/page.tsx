"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MoreHorizontal, Search, Filter, ChevronDown, ChevronRight, Eye, Mail, Calendar, MapPin, BookOpen, TrendingUp, Users } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Types
interface Student {
  _id: string;
  id: string;
  full_name: string;
  email: string;
  grade: number;
  address: {
    institution: string;
    district: string;
    province: string;
  };
  avatarEmoji: string;
  profileImage: string | null;
  enrolledCourses: string[];
  realEnrolledCoursesCount?: number;
  realEnrollments?: any[];
  lastLogin: string;
  createdAt: string;
}

interface Teacher {
  _id: string;
  id: string;
  full_name: string;
  email: string;
  role: string;
  subject?: string;
  profileImage?: string | null;
  status: string;
  lastLogin: string;
  createdAt: string;
}

interface UserDetails {
  _id: string;
  id: string;
  full_name: string;
  email: string;
  grade: number;
  address: {
    institution: string;
    district: string;
    province: string;
  };
  profileImage: string | null;
  type: 'student';
  enrolledCourses: Array<{
    id: string;
    name: string;
    progress: number;
  }>;
  realEnrollments?: any[];
  courseProgress: Array<{
    courseId: string;
    courseName: string;
    progress: number;
    lastAccessed: string;
  }>;
  lastLogin: string;
  createdAt: string;
}

interface TeacherDetails {
  _id: string;
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  institution?: {
    name?: string;
    type?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
  };
  subjects?: Array<{
    name: string;
    level?: string;
  }>;
  qualifications?: Array<{
    degree?: string;
    institution?: string;
    year?: number;
    grade?: string;
  }>;
  experience?: {
    totalYears?: number;
    previousPositions?: Array<{
      position?: string;
      institution?: string;
      startDate?: string;
      endDate?: string;
      current?: boolean;
    }>;
  };
  bio?: string;
  verificationDocuments?: {
    profile?: Array<{
      url: string;
      uploadedAt?: string;
    }>;
    idCard?: Array<{
      url: string;
      uploadedAt?: string;
    }>;
    certificates?: Array<{
      url: string;
      uploadedAt?: string;
    }>;
  };
  agreementAccepted?: boolean;
  onboardingComplete?: boolean;
  onboardingStep?: number;
  status?: string;
  approvalStatus?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  type: 'teacher';
  role: string;
  subject?: string;
  courses: Array<{
    id: string;
    name: string;
    students: number;
    status?: string;
    createdAt?: string;
  }>;
  lastLogin: string;
}

export default function UsersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set([10, 11, 12]));
  const [selectedUser, setSelectedUser] = useState<UserDetails | TeacherDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'students';

  // Fetch users data
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      
      // Fetch students, teachers, and enrollments in parallel
      const [studentsRes, teachersRes, enrollmentsRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.USERS.LIST}?type=students`, createFetchOptions('GET')),
        fetch(`${API_ENDPOINTS.USERS.LIST}?type=teachers&includeVerificationDocs=true`, createFetchOptions('GET')),
        fetch(`${API_ENDPOINTS.BASE}/api/admin/enrollments`, createFetchOptions('GET'))
      ]);

      let enrollmentsData = [];
      if (enrollmentsRes.ok) {
        const enrollmentsJson = await enrollmentsRes.json();
        enrollmentsData = enrollmentsJson.enrollments || [];
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        // Calculate real enrollment count for each student
        const studentsWithRealEnrollments = (studentsData.students || []).map((student: Student) => {
          const rawStudentEnrollments = enrollmentsData.filter(
            (enrollment: any) => enrollment.studentId === student._id
          );

          // A single course enrollment can appear twice in the combined
          // enrollments list — once as the regular CourseEnrollment record
          // and once as the access-code usage record redeeming it — since
          // redeeming a code always creates its own CourseEnrollment too.
          // Dedupe by courseId, keeping the entry that isn't 'access_code'
          // when both exist since it carries the real progress value.
          const enrollmentsByCourseId = new Map<string, any>();
          for (const enrollment of rawStudentEnrollments) {
            const existing = enrollmentsByCourseId.get(enrollment.courseId);
            if (!existing || existing.enrollmentType === 'access_code') {
              enrollmentsByCourseId.set(enrollment.courseId, enrollment);
            }
          }
          const studentEnrollments = Array.from(enrollmentsByCourseId.values());

          return {
            ...student,
            realEnrolledCoursesCount: studentEnrollments.length,
            realEnrollments: studentEnrollments
          };
        });
        setStudents(studentsWithRealEnrollments);
      }

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData.teachers || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string, userType: 'student' | 'teacher') => {
    try {
      setUserDetailsLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      console.log('🔍 Fetching user details:', { userId, userType });
      const url = `${API_ENDPOINTS.USERS.GET(userId)}?type=${userType}`;
      console.log('📡 URL:', url);
      const response = await fetch(url, createFetchOptions('GET'));
      console.log('📥 Response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('✅ User data received:', result);
        
        // Backend returns { success: true, data: { user: ..., type: ... } }
        if (result.success && result.data) {
          let userData = { ...result.data.user, type: result.data.type };
          
          // If teacher, also fetch assignments
          if (userType === 'teacher') {
            try {
              console.log('📚 Fetching teacher assignments...');
              const assignmentsRes = await fetch(
                `${API_ENDPOINTS.BASE}/api/teacher/teacher-assignments`,
                {
                  ...createFetchOptions('GET'),
                  cache: 'no-store'
                }
              );
              
              if (assignmentsRes.ok) {
                const assignmentsJson = await assignmentsRes.json();
                const allAssignments = assignmentsJson.data?.assignments || [];
                const teacherAssignments = allAssignments.filter(
                  (assignment: any) => 
                    assignment.teacherId._id === userId && assignment.isActive
                );
                userData = { ...userData, assignments: teacherAssignments };
                console.log('✅ Teacher assignments loaded:', teacherAssignments.length);
              }
            } catch (assignmentError) {
              console.error('❌ Error fetching teacher assignments:', assignmentError);
            }
          }
          
          // If student, also fetch real enrollment data
          if (userType === 'student') {
            // Use the already fetched enrollment data from the student object
            const studentData = students.find(s => s._id === userId);
            userData = { ...userData, realEnrollments: (studentData as any)?.realEnrollments || [] };
            console.log('✅ Student enrollments loaded from cache:', (studentData as any)?.realEnrollments?.length || 0);
          }
          
          console.log('📦 Processed user data:', userData);
          setSelectedUser(userData);
        } else {
          console.error('❌ Unexpected data format:', result);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
    } finally {
      setUserDetailsLoading(false);
    }
  };

  // Filter and sort students
  const filteredStudents = students
    .filter(student => {
      const matchesSearch = (student.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesGrade = gradeFilter === "all" || student.grade?.toString() === gradeFilter;
      return matchesSearch && matchesGrade;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.full_name || '').localeCompare(b.full_name || '');
        case "grade":
          return (a.grade || 0) - (b.grade || 0);
        case "lastLogin":
          return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
        default:
          return 0;
      }
    });

  // Group students by grade
  const studentsByGrade = filteredStudents.reduce((acc, student) => {
    const gradeKey = student.grade || 0; // Default to grade 0 for null grades
    if (!acc[gradeKey]) {
      acc[gradeKey] = [];
    }
    acc[gradeKey].push(student);
    return acc;
  }, {} as Record<number, Student[]>);

  // Filter teachers
  const filteredTeachers = teachers
    .filter(teacher => {
      return (teacher.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
             (teacher.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.full_name || '').localeCompare(b.full_name || '');
        case "lastLogin":
          return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
        default:
          return 0;
      }
    });

  const toggleGradeExpansion = (grade: number) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getGradeBadgeVariant = (grade: number) => {
    if (grade >= 11) return "default";
    if (grade >= 9) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold font-headline tracking-tight">User Management</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
 <div>
           <div className="flex items-center gap-2">
                      <Users className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">User Management</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Manage users, roles, and permissions across the platform</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="grade">Grade</SelectItem>
              <SelectItem value="lastLogin">Last Login</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">
            Students ({filteredStudents.length})
          </TabsTrigger>
          <TabsTrigger value="teachers">
            Teachers ({filteredTeachers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          <div className="flex items-center gap-4">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
                <SelectItem value="11">Grade 11</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {Object.keys(studentsByGrade).sort((a, b) => parseInt(b) - parseInt(a)).map(gradeStr => {
            const grade = parseInt(gradeStr);
            const gradeStudents = studentsByGrade[grade];
            const isExpanded = expandedGrades.has(grade);

            return (
              <Card key={grade} className="shadow-md">
                <Collapsible open={isExpanded} onOpenChange={() => toggleGradeExpansion(grade)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <CardTitle className="text-xl">Grade {grade}</CardTitle>
                          <Badge variant={getGradeBadgeVariant(grade)}>
                            {gradeStudents.length} students
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Institution</TableHead>
                            <TableHead>Enrolled Courses</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gradeStudents.map((student) => (
                            <TableRow key={student._id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center">
                                    <img
                                      src={student.profileImage || '/assets/default-avatar.svg'}
                                      alt={student.full_name}
                                      className="h-full w-full object-cover"
                                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/default-avatar.svg'; }}
                                    />
                                  </div>
                                  <div>
                                    <div className="font-medium">{student.full_name}</div>
                                    <div className="text-sm text-muted-foreground">{student.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{student.address.institution}</div>
                                  <div className="text-muted-foreground">{student.address.district}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {(student as any).realEnrolledCoursesCount || 0} courses
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(student.lastLogin)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => fetchUserDetails(student._id, 'student')}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Student Details</DialogTitle>
                                      <DialogDescription>
                                        Complete profile and activity information
                                      </DialogDescription>
                                    </DialogHeader>
                                    {userDetailsLoading ? (
                                      <div className="flex items-center justify-center py-8">
                                        <div className="text-muted-foreground">Loading details...</div>
                                      </div>
                                    ) : selectedUser && selectedUser.type === 'student' ? (
                                      <div className="space-y-6">
                                        {/* Profile Header */}
                                        <div className="flex items-center gap-4">
                                          <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center">
                                            <img
                                              src={selectedUser.profileImage || '/assets/default-avatar.svg'}
                                              alt={selectedUser.full_name}
                                              className="h-full w-full object-cover"
                                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/default-avatar.svg'; }}
                                            />
                                          </div>
                                          <div>
                                            <h3 className="text-xl font-semibold">{selectedUser.full_name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                              <Mail className="h-4 w-4 text-primary" />
                                              <span className="font-medium text-foreground">{selectedUser.email}</span>
                                            </div>
                                            <Badge variant={getGradeBadgeVariant(selectedUser.grade)} className="mt-2">
                                              Grade {selectedUser.grade}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Basic Information */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-sm">
                                              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                                              <div>
                                                <span className="font-medium">Email:</span> <span className="text-primary font-medium">{selectedUser.email}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                              <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <div>
                                                <span className="font-medium">Grade:</span> {selectedUser.grade}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <div>
                                                <span className="font-medium">Joined:</span> {formatDate(selectedUser.createdAt)}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                              <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <div>
                                                <span className="font-medium">Last Login:</span> {formatDate(selectedUser.lastLogin)}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-sm">
                                              <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <div>
                                                <span className="font-medium">Enrolled Courses:</span> {(selectedUser as any).realEnrollments?.length || 0}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <div>
                                                <span className="font-medium">Last Updated:</span> {selectedUser.createdAt ? formatDate(selectedUser.createdAt) : 'Unknown'}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Address Information */}
                                        {selectedUser.address && (
                                          <div>
                                            <h4 className="font-medium mb-3">Address Information</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                              <div className="p-3 border rounded-lg bg-muted/20">
                                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Institution</div>
                                                <div className="text-sm mt-1">{selectedUser.address.institution || 'N/A'}</div>
                                              </div>
                                              <div className="p-3 border rounded-lg bg-muted/20">
                                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">District</div>
                                                <div className="text-sm mt-1">{selectedUser.address.district || 'N/A'}</div>
                                              </div>
                                              <div className="p-3 border rounded-lg bg-muted/20">
                                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Province</div>
                                                <div className="text-sm mt-1">{selectedUser.address.province || 'N/A'}</div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Profile Information */}
                                        <div>
                                          <h4 className="font-medium mb-3">Profile Information</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-3 border rounded-lg bg-muted/20">
                                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Profile Image</div>
                                              <div className="text-sm mt-1">
                                                {selectedUser.profileImage ? (
                                                  <span className="text-green-600">✓ Available</span>
                                                ) : (
                                                  <span className="text-muted-foreground">Not set</span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-muted/20">
                                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Avatar Emoji</div>
                                              <div className="text-sm mt-1">
                                                <span className="text-sm text-muted-foreground">
                                                  {selectedUser.avatarEmoji || 'Default'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Real Enrollments */}
                                        {(selectedUser as any).realEnrollments && (selectedUser as any).realEnrollments.length > 0 && (
                                          <div>
                                            <h4 className="font-medium mb-3">Course Enrollments ({(selectedUser as any).realEnrollments.length})</h4>
                                            <div className="grid gap-3">
                                              {(selectedUser as any).realEnrollments.map((enrollment: any) => (
                                                <div key={enrollment._id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                      <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center bg-primary/10">
                                                        {enrollment.studentProfileImage ? (
                                                          <img 
                                                            src={enrollment.studentProfileImage} 
                                                            alt={enrollment.studentName} 
                                                            className="h-10 w-10 object-cover"
                                                          />
                                                        ) : (
                                                          <span className="text-sm font-semibold text-primary">
                                                            {enrollment.studentAvatarEmoji || enrollment.studentName?.charAt(0)?.toUpperCase() || '?'}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div>
                                                        <div className="font-medium">{enrollment.courseName}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                          {enrollment.courseType} • {enrollment.enrollmentType === 'regular' ? 'Paid' : enrollment.enrollmentType === 'trial' ? 'Trial' : 'Access Code'}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="text-right">
                                                      <Badge 
                                                        variant={
                                                          enrollment.enrollmentType === 'trial' ? "outline" : 
                                                          enrollment.enrollmentType === 'access_code' ? "secondary" : 
                                                          "default"
                                                        }
                                                        className="mb-1"
                                                      >
                                                        {enrollment.enrollmentType === 'regular' ? 'Paid' : 
                                                         enrollment.enrollmentType === 'trial' ? 'Trial' : 
                                                         'Access Code'}
                                                      </Badge>
                                                      <div className="text-xs text-muted-foreground">
                                                        {enrollment.status}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  
                                                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                                    <div>
                                                      <span className="font-medium">Progress:</span> {enrollment.progress}%
                                                    </div>
                                                    <div>
                                                      <span className="font-medium">Enrolled:</span> {formatDate(enrollment.enrolledAt)}
                                                    </div>
                                                  </div>
                                                  
                                                  {enrollment.enrollmentType === 'trial' && enrollment.expiresAt && (
                                                    <div className="mt-2 text-sm">
                                                      <span className="font-medium">Expires:</span> {formatDate(enrollment.expiresAt)}
                                                    </div>
                                                  )}
                                                  
                                                  {enrollment.enrollmentType === 'access_code' && (
                                                    <div className="mt-2 text-sm">
                                                      <span className="font-medium">Code:</span> 
                                                      <code className="ml-1 bg-muted px-1 py-0.5 rounded text-xs">
                                                        {enrollment.accessCode}
                                                      </code>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="mt-2 bg-muted rounded-full h-2">
                                                    <div
                                                      className="bg-primary h-2 rounded-full transition-all duration-300"
                                                      style={{ width: `${enrollment.progress}%` }}
                                                    ></div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Account Status */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="flex items-center justify-between p-3 border rounded">
                                            <span className="text-sm font-medium">Account Status</span>
                                            <Badge variant="default">Active</Badge>
                                          </div>
                                          <div className="flex items-center justify-between p-3 border rounded">
                                            <span className="text-sm font-medium">Profile Complete</span>
                                            <Badge variant="default">Yes</Badge>
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}

          {Object.keys(studentsByGrade).length === 0 && (
            <Card className="shadow-md">
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  No students found matching your criteria.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>All Teachers</CardTitle>
              <CardDescription>Manage teacher accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No teachers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <TableRow key={teacher._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center">
                              <img
                                src={teacher.profileImage || '/assets/default-avatar.svg'}
                                alt={teacher.full_name}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/default-avatar.svg'; }}
                              />
                            </div>
                            <div>
                              <div className="font-medium">{teacher.full_name}</div>
                              <div className="text-sm text-muted-foreground">{teacher.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{teacher.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {teacher.subject ? (
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {teacher.subject}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No subjects</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={teacher.status === 'active' ? 'default' : 'outline'}>
                            {teacher.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(teacher.lastLogin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchUserDetails(teacher._id, 'teacher')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Teacher Details</DialogTitle>
                                <DialogDescription>
                                  Complete profile and activity information
                                </DialogDescription>
                              </DialogHeader>
                              {userDetailsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="text-muted-foreground">Loading details...</div>
                                </div>
                              ) : selectedUser && selectedUser.type === 'teacher' ? (
                                <div className="space-y-6">
                                  {/* Profile Header */}
                                  <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center">
                                      <img
                                        src={selectedUser.profileImage || (selectedUser as any).profilePhoto || '/assets/default-avatar.svg'}
                                        alt={selectedUser.fullName || selectedUser.firstName || 'Teacher'}
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/default-avatar.svg'; }}
                                      />
                                    </div>
                                    <div>
                                      
                                      <h3 className="text-xl font-semibold">
                                        {selectedUser.fullName || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}
                                        <Badge variant="secondary" className="ml-2">{selectedUser.role}</Badge>
 </h3>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Mail className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-foreground">{selectedUser.email}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Basic Information */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-3 text-sm">
                                        <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                                        <div>
                                          <span className="font-medium">Email:</span> <span className="text-primary font-medium">{selectedUser.email}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 text-sm">
                                        <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                          <span className="font-medium">Subject:</span> {selectedUser.subject || "Not specified"}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                          <span className="font-medium">Joined:</span> {selectedUser.createdAt ? formatDate(selectedUser.createdAt) : 'Unknown'}
                                        </div>
                                      </div>
                                      {selectedUser.phoneNumber && (
                                        <div className="flex items-center gap-3 text-sm">
                                          <div className="w-4 h-4 flex-shrink-0" />
                                          <div>
                                            <span className="font-medium">Phone:</span> {selectedUser.phoneNumber}
                                          </div>
                                        </div>
                                      )}
                                      {selectedUser.dateOfBirth && (
                                        <div className="flex items-center gap-3 text-sm">
                                          <div className="w-4 h-4 flex-shrink-0" />
                                          <div>
                                            <span className="font-medium">Date of Birth:</span> {new Date(selectedUser.dateOfBirth).toLocaleDateString()}
                                          </div>
                                        </div>
                                      )}
                                      {selectedUser.gender && (
                                        <div className="flex items-center gap-3 text-sm">
                                          <div className="w-4 h-4 flex-shrink-0" />
                                          <div>
                                            <span className="font-medium">Gender:</span> {selectedUser.gender}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-3 text-sm">
                                        <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                          <span className="font-medium">Status:</span> {selectedUser.status || 'Unknown'}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                          <span className="font-medium">Last Login:</span> {formatDate(selectedUser.lastLogin)}
                                        </div>
                                      </div>
                                      {selectedUser.approvalStatus && (
                                        <div className="flex items-center gap-3 text-sm">
                                          <div className="w-4 h-4 flex-shrink-0" />
                                          <div>
                                            <span className="font-medium">Approval:</span> {selectedUser.approvalStatus}
                                          </div>
                                        </div>
                                      )}
                                      {selectedUser.onboardingStep && (
                                        <div className="flex items-center gap-3 text-sm">
                                          <div className="w-4 h-4 flex-shrink-0" />
                                          <div>
                                            <span className="font-medium">Onboarding Step:</span> {selectedUser.onboardingStep}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Address */}
                                  {selectedUser.address && (
                                    <div>
                                      <h4 className="font-medium mb-3">Address</h4>
                                      <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="text-sm">
                                          {[selectedUser.address.street, selectedUser.address.city, selectedUser.address.state, selectedUser.address.country, selectedUser.address.zipCode].filter(Boolean).join(', ') || 'Not provided'}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Institution */}
                                  {selectedUser.institution && (
                                    <div>
                                      <h4 className="font-medium mb-3">Institution</h4>
                                      <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="text-sm">
                                          <div className="font-medium">{selectedUser.institution.name}</div>
                                          <div className="text-muted-foreground">{selectedUser.institution.type}</div>
                                          {selectedUser.institution.address && (
                                            <div className="mt-2 pt-2 border-t">
                                              {[selectedUser.institution.address.street, selectedUser.institution.address.city, selectedUser.institution.address.state, selectedUser.institution.address.country, selectedUser.institution.address.zipCode].filter(Boolean).join(', ')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Bio */}
                                  {selectedUser.bio && (
                                    <div>
                                      <h4 className="font-medium mb-3">Bio</h4>
                                      <div className="p-3 border rounded-lg bg-muted/20">
                                        <div className="text-sm leading-relaxed">{selectedUser.bio}</div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Subjects */}
                                  {selectedUser.subjects && selectedUser.subjects.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-3">Subjects</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedUser.subjects.map((subject: any, i: number) => (
                                          <Badge key={i} variant="secondary" className="px-3 py-1">
                                            {subject.name} {subject.level && `(${subject.level})`}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Qualifications */}
                                  {selectedUser.qualifications && selectedUser.qualifications.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-3">Qualifications</h4>
                                      <div className="space-y-3">
                                        {selectedUser.qualifications.map((qual: any, i: number) => (
                                          <div key={i} className="p-3 border rounded-lg bg-muted/20">
                                            <div className="font-medium">{qual.degree}{qual.field && ` in ${qual.field}`}</div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                              {qual.institution} ({qual.year}) {qual.grade && `- ${qual.grade}`}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Experience */}
                                  {selectedUser.experience && (
                                    <div>
                                      <h4 className="font-medium mb-3">Experience</h4>
                                      <div className="space-y-3">
                                        {selectedUser.experience.totalYears && (
                                          <div className="p-3 border rounded-lg bg-muted/20">
                                            <div className="text-sm">
                                              <span className="font-medium">Total Years:</span> {selectedUser.experience.totalYears}
                                            </div>
                                          </div>
                                        )}
                                        {selectedUser.experience.previousPositions && selectedUser.experience.previousPositions.length > 0 && (
                                          <div>
                                            <div className="text-sm font-medium mb-3">Previous Positions</div>
                                            <div className="space-y-2">
                                              {selectedUser.experience.previousPositions.map((pos: any, i: number) => (
                                                <div key={i} className="p-3 border rounded-lg bg-muted/20 border-l-4 border-l-primary">
                                                  <div className="font-medium">{pos.position || pos.title}</div>
                                                  <div className="text-sm text-muted-foreground mt-1">{pos.institution}</div>
                                                  <div className="text-xs text-muted-foreground mt-2">
                                                    {pos.startDate ? new Date(pos.startDate).toLocaleDateString() : ''} - {pos.endDate ? new Date(pos.endDate).toLocaleDateString() : (pos.current ? 'Present' : 'Unknown')}
                                                  </div>
                                                  {pos.description && (
                                                    <div className="text-sm mt-2 pt-2 border-t">{pos.description}</div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Status Information */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-3 border rounded">
                                      <span className="text-sm font-medium">Agreement Accepted</span>
                                      <Badge variant={selectedUser.agreementAccepted === true ? "default" : "outline"}>
                                        {selectedUser.agreementAccepted === true ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded">
                                      <span className="text-sm font-medium">Onboarding Complete</span>
                                      <Badge variant={selectedUser.onboardingComplete === true ? "default" : "outline"}>
                                        {selectedUser.onboardingComplete === true ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Assigned Subjects */}
                                  {(selectedUser as any).assignments && (selectedUser as any).assignments.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-4">Assigned Subjects</h4>
                                      <div className="grid gap-3">
                                        {(selectedUser as any).assignments.map((assignment: any) => (
                                          <div key={assignment._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                              <BookOpen className="h-4 w-4 text-primary" />
                                              <div className="flex-1">
                                                <div className="font-medium">{assignment.subjectName}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  {assignment.courseId.title}
                                                </div>
                                                {assignment.notes && (
                                                  <div className="text-xs text-muted-foreground mt-1">
                                                    Note: {assignment.notes}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <Badge variant="outline" className="ml-4">
                                              Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Courses Teaching */}
                                  {selectedUser.courses && selectedUser.courses.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-4">Courses Teaching</h4>
                                      <div className="grid gap-3">
                                        {selectedUser.courses.map((course) => (
                                          <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex-1">
                                              <div className="font-medium">{course.name}</div>
                                              <div className="text-sm text-muted-foreground">
                                                {course.students || 0} students enrolled
                                              </div>
                                            </div>
                                            <Badge variant="outline" className="ml-4">
                                              {course.students || 0} students
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Verification Documents */}
                                  {selectedUser.verificationDocuments && Object.keys(selectedUser.verificationDocuments).length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-3">Verification Documents</h4>
                                      <div className="space-y-2">
                                        {Object.entries(selectedUser.verificationDocuments).map(([category, docs]: [string, any]) => (
                                          docs && docs.length > 0 && (
                                            <div key={category}>
                                              <div className="text-sm font-medium capitalize mb-2">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                                              <div className="space-y-1">
                                                {docs.map((doc: any, i: number) => (
                                                  <div key={i} className="flex items-center gap-3 p-3 border rounded text-sm">
                                                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                                      <span className="text-xs font-medium">{category.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                      <div className="font-medium">Document {i + 1}</div>
                                                      <div className="text-muted-foreground text-xs">
                                                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Upload date unknown'}
                                                      </div>
                                                    </div>
                                                    {doc.url && (
                                                      <Button variant="outline" size="sm" asChild>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                                                      </Button>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
