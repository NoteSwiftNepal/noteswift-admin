"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Eye, Mail, Calendar, BookOpen, TrendingUp, Users, Ban, Trash2, GraduationCap, School } from "lucide-react";
import { AssignCourseDialog, AssignCourseFormData } from "@/components/users/AssignCourseDialog";
import { ManageSchoolDialog } from "@/components/users/ManageSchoolDialog";
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
import { useToast } from "@/hooks/use-toast";

// Types
type StudentStatus = 'enrolled' | 'not_enrolled' | 'free_trial' | 'trial_ended' | 'blocked';

interface Student {
  _id: string;
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  grade: number;
  address: {
    institution: string;
    district: string;
    province: string;
  };
  avatarEmoji: string;
  profileImage: string | null;
  enrolledCourses: string[];
  isBanned?: boolean;
  status?: StudentStatus;
  realEnrolledCoursesCount?: number;
  realEnrollments?: any[];
  lastLogin: string;
  createdAt: string;
}

interface StudentStats {
  total: number;
  enrolled: number;
  free_trial: number;
  trial_ended: number;
  not_enrolled: number;
  blocked: number;
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
  phone_number?: string | null;
  grade: number;
  address: {
    institution: string;
    district: string;
    province: string;
  };
  profileImage: string | null;
  isBanned?: boolean;
  schoolId?: string | null;
  schoolName?: string | null;
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

// A single course enrollment can appear twice in the combined enrollments
// list — once as the regular CourseEnrollment record and once as the
// access-code usage record redeeming it — since redeeming a code always
// creates its own CourseEnrollment too. Dedupe by courseId, keeping the
// entry that isn't 'access_code' when both exist since it carries the real
// progress value.
function computeStudentEnrollments(studentId: string, allEnrollments: any[]): any[] {
  const rawStudentEnrollments = allEnrollments.filter((e: any) => e.studentId === studentId);
  const enrollmentsByCourseId = new Map<string, any>();
  for (const enrollment of rawStudentEnrollments) {
    const existing = enrollmentsByCourseId.get(enrollment.courseId);
    if (!existing || existing.enrollmentType === 'access_code') {
      enrollmentsByCourseId.set(enrollment.courseId, enrollment);
    }
  }
  return Array.from(enrollmentsByCourseId.values());
}

function mergeStudentEnrollments(students: Student[], enrollments: any[]): Student[] {
  return students.map((student) => {
    const studentEnrollments = computeStudentEnrollments(student._id, enrollments);
    return {
      ...student,
      realEnrolledCoursesCount: studentEnrollments.length,
      realEnrollments: studentEnrollments,
    };
  });
}

const JOINED_WITHIN_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
];

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'not_enrolled', label: 'Not Enrolled' },
  { value: 'free_trial', label: 'Free Trial' },
  { value: 'trial_ended', label: 'Trial Ended' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  enrolled: { label: 'Enrolled', className: 'bg-green-100 text-green-700 border-green-200' },
  not_enrolled: { label: 'Not Enrolled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  free_trial: { label: 'Free Trial', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  trial_ended: { label: 'Trial Ended', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700 border-red-200' },
};

const STUDENTS_PAGE_SIZE = 25;

export default function UsersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsLoadingMore, setStudentsLoadingMore] = useState(false);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsHasMore, setStudentsHasMore] = useState(false);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [joinedFilter, setJoinedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | TeacherDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [schools, setSchools] = useState<{ _id: string; name: string; shortCode: string }[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [assignCourseDialogOpen, setAssignCourseDialogOpen] = useState(false);
  const [assignCourseLoading, setAssignCourseLoading] = useState(false);
  const [manageSchoolDialogOpen, setManageSchoolDialogOpen] = useState(false);
  const [assignSchoolLoading, setAssignSchoolLoading] = useState(false);
  const [makeIndependentLoading, setMakeIndependentLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'students';

  // Initial load: teachers + the full enrollments cache (used to compute
  // each student's real course list without a per-student network call).
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const enrollmentsRes = await fetch(API_ENDPOINTS.ENROLLMENTS.LIST, createFetchOptions('GET'));
      if (enrollmentsRes.ok) {
        const enrollmentsJson = await enrollmentsRes.json();
        setEnrollments(enrollmentsJson.enrollments || []);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setCoursesLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.COURSES.DROPDOWN, createFetchOptions('GET'));
      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      setSchoolsLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.SCHOOLS.DROPDOWN, createFetchOptions('GET'));
      if (response.ok) {
        const data = await response.json();
        setSchools(data.data?.schools || data.schools || []);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');

      const [teachersRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.USERS.LIST}?type=teachers&includeVerificationDocs=true`, createFetchOptions('GET')),
        fetchEnrollments(),
        fetchCourses(),
        fetchSchools(),
      ]);

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

  const fetchStudentStats = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const url = gradeFilter !== 'all'
        ? `${API_ENDPOINTS.USERS.STUDENT_STATS}?grade=${gradeFilter}`
        : API_ENDPOINTS.USERS.STUDENT_STATS;
      const res = await fetch(url, createFetchOptions('GET'));
      if (res.ok) {
        const json = await res.json();
        setStudentStats(json.data);
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  // Search/grade/status/joined-date are all resolved server-side. Paginated
  // 25-at-a-time (STUDENTS_PAGE_SIZE) instead of fetching every matching
  // student at once — `page=1` (the default, used whenever filters change)
  // replaces the list; any later page appends onto it via "Load More".
  const fetchStudents = async (page: number = 1) => {
    try {
      if (page === 1) setStudentsLoading(true);
      else setStudentsLoadingMore(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const params = new URLSearchParams({
        type: 'students',
        sort: sortBy === 'name' ? 'alphabetical' : sortBy,
        page: String(page),
        limit: String(STUDENTS_PAGE_SIZE),
      });
      if (studentSearch.trim()) params.set('search', studentSearch.trim());
      if (gradeFilter !== 'all') params.set('grade', gradeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (joinedFilter !== 'all') params.set('joinedWithin', joinedFilter);

      const res = await fetch(`${API_ENDPOINTS.USERS.LIST}?${params.toString()}`, createFetchOptions('GET'));
      if (res.ok) {
        const data = await res.json();
        const fetched: Student[] = data.students || [];
        setStudents((prev) => (page === 1 ? fetched : [...prev, ...fetched]));
        setStudentsPage(page);
        setStudentsHasMore(!!data.pagination?.hasMore);
        setStudentsTotal(data.pagination?.total ?? fetched.length);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setStudentsLoading(false);
      setStudentsLoadingMore(false);
    }
  };

  const handleLoadMoreStudents = () => {
    if (studentsHasMore && !studentsLoadingMore) {
      fetchStudents(studentsPage + 1);
    }
  };

  // Debounced re-fetch whenever search/filters change — this also covers
  // the very first student load (all deps start at their default values).
  // Always restarts from page 1: a new filter invalidates whatever pages
  // were already appended.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentSearch, gradeFilter, statusFilter, joinedFilter, sortBy]);

  // The stat row is scoped to grade only — not search/status/joined-date —
  // so it answers "how is Grade 12 doing" when a grade is picked, and
  // otherwise stays a global summary independent of the list's other
  // filters. Runs on mount too (this is the initial stats load).
  useEffect(() => {
    fetchStudentStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeFilter]);

  const studentsWithEnrollments = mergeStudentEnrollments(students, enrollments);

  const refreshAfterStudentAction = async () => {
    await Promise.all([fetchStudents(), fetchStudentStats(), fetchEnrollments()]);
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
          
          // If student, also fetch real enrollment data. Fetched fresh here
          // (not from the local `enrollments` cache) so the dialog reflects
          // an enrollment just removed or a ban that just deactivated
          // enrollments, instead of a stale pre-action snapshot.
          if (userType === 'student') {
            const enrollmentsRes = await fetch(API_ENDPOINTS.ENROLLMENTS.LIST, createFetchOptions('GET'));
            const freshEnrollments = enrollmentsRes.ok ? (await enrollmentsRes.json()).enrollments || [] : [];
            userData = { ...userData, realEnrollments: computeStudentEnrollments(userId, freshEnrollments) };
            console.log('✅ Student enrollments loaded fresh:', userData.realEnrollments.length);
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

  const handleRemoveEnrollment = async (enrollment: any) => {
    if (!selectedUser || selectedUser.type !== 'student') return;
    if (!confirm(`Remove enrollment in "${enrollment.courseName}"?`)) return;
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ENROLLMENTS.REMOVE(enrollment._id),
        createFetchOptions('DELETE', { enrollmentType: enrollment.enrollmentType })
      );
      if (!response.ok) throw new Error('Failed to remove enrollment');
      toast({ title: 'Enrollment removed', description: `Removed from "${enrollment.courseName}".` });
      await fetchUserDetails(selectedUser._id, 'student');
      refreshAfterStudentAction();
    } catch (error) {
      console.error('Error removing enrollment:', error);
      toast({ title: 'Failed to remove enrollment', variant: 'destructive' });
    }
  };

  const handleToggleBan = async () => {
    if (!selectedUser || selectedUser.type !== 'student') return;
    const isBanned = !!(selectedUser as any).isBanned;
    const action = isBanned ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${action} ${selectedUser.full_name}?`)) return;
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const url = isBanned ? API_ENDPOINTS.USERS.UNBAN(selectedUser._id) : API_ENDPOINTS.USERS.BAN(selectedUser._id);
      const response = await fetch(url, createFetchOptions('POST'));
      if (!response.ok) throw new Error('Failed to update account status');
      toast({ title: isBanned ? 'User unblocked' : 'User blocked' });
      await fetchUserDetails(selectedUser._id, 'student');
      refreshAfterStudentAction();
    } catch (error) {
      console.error('Error updating ban status:', error);
      toast({ title: 'Failed to update account status', variant: 'destructive' });
    }
  };

  const handleAssignCourseSubmit = async (formData: AssignCourseFormData) => {
    if (!selectedUser || selectedUser.type !== 'student') return;
    setAssignCourseLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ENROLLMENTS.CREATE,
        createFetchOptions('POST', {
          studentId: selectedUser._id,
          courseId: formData.course,
          paymentMethod: formData.paymentMethod,
          amount: formData.amount,
          paymentReference: formData.paymentReference || undefined,
          notes: formData.notes || undefined,
        })
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign course');
      }
      toast({ title: 'Course assigned', description: `${selectedUser.full_name} was enrolled successfully.` });
      setAssignCourseDialogOpen(false);
      await fetchUserDetails(selectedUser._id, 'student');
      refreshAfterStudentAction();
    } catch (error: any) {
      console.error('Error assigning course:', error);
      toast({ title: 'Failed to assign course', description: error.message, variant: 'destructive' });
    } finally {
      setAssignCourseLoading(false);
    }
  };

  const handleAssignSchool = async (schoolId: string) => {
    if (!selectedUser || selectedUser.type !== 'student') return;
    setAssignSchoolLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.SCHOOLS.ASSIGN_STUDENT(schoolId, selectedUser._id),
        createFetchOptions('POST')
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to assign school');
      }
      toast({ title: 'School updated', description: data.message });
      setManageSchoolDialogOpen(false);
      await fetchUserDetails(selectedUser._id, 'student');
      refreshAfterStudentAction();
    } catch (error: any) {
      console.error('Error assigning school:', error);
      toast({ title: 'Failed to update school', description: error.message, variant: 'destructive' });
    } finally {
      setAssignSchoolLoading(false);
    }
  };

  const handleMakeIndependent = async () => {
    if (!selectedUser || selectedUser.type !== 'student' || !(selectedUser as any).schoolId) return;
    setMakeIndependentLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.SCHOOLS.REMOVE_STUDENT((selectedUser as any).schoolId, selectedUser._id),
        createFetchOptions('POST')
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to remove student from school');
      }
      toast({ title: 'Student is now independent', description: data.message });
      setManageSchoolDialogOpen(false);
      await fetchUserDetails(selectedUser._id, 'student');
      refreshAfterStudentAction();
    } catch (error: any) {
      console.error('Error making student independent:', error);
      toast({ title: 'Failed to update school', description: error.message, variant: 'destructive' });
    } finally {
      setMakeIndependentLoading(false);
    }
  };

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

      <Tabs
        value={activeTab}
        onValueChange={(tab) => router.push(`/dashboard/users?tab=${tab}`)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">
            Students ({studentStats?.total ?? studentsWithEnrollments.length})
          </TabsTrigger>
          <TabsTrigger value="teachers">
            Teachers ({filteredTeachers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Students', value: studentStats?.total, className: 'text-gray-900' },
              { label: 'Enrolled', value: studentStats?.enrolled, className: 'text-green-600' },
              { label: 'Free Trial', value: studentStats?.free_trial, className: 'text-blue-600' },
              { label: 'Trial Ended', value: studentStats?.trial_ended, className: 'text-amber-600' },
              { label: 'Not Enrolled', value: studentStats?.not_enrolled, className: 'text-gray-500' },
              { label: 'Blocked', value: studentStats?.blocked, className: 'text-red-600' },
            ].map((stat) => (
              <Card key={stat.label} className="shadow-sm">
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${stat.className}`}>{stat.value ?? '—'}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, number, or school..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-full md:w-40">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={joinedFilter} onValueChange={setJoinedFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Joined date" />
              </SelectTrigger>
              <SelectContent>
                {JOINED_WITHIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="shadow-md">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Institute</TableHead>
                    <TableHead>Enrolled Courses</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading students...
                      </TableCell>
                    </TableRow>
                  ) : studentsWithEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No students found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentsWithEnrollments.map((student) => {
                      const badge = STATUS_BADGE[student.status || 'not_enrolled'];
                      return (
                        <TableRow key={student._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
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
                          <TableCell className="text-sm">{student.phone_number || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{student.address?.institution || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {student.realEnrolledCoursesCount || 0} courses
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(student.lastLogin)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={badge?.className}>
                              {badge?.label || 'Not Enrolled'}
                            </Badge>
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
                                        <h4 className="font-medium mb-3">Additional Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div className="p-3 border rounded-lg bg-muted/20">
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Institution</div>
                                            <div className="text-sm mt-1">{selectedUser.address.institution || 'N/A'}</div>
                                          </div>
                                          <div className="p-3 border rounded-lg bg-muted/20">
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Province</div>
                                            <div className="text-sm mt-1">{selectedUser.address.province || 'N/A'}</div>
                                          </div>
                                          <div className="p-3 border rounded-lg bg-muted/20">
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">District</div>
                                            <div className="text-sm mt-1">{selectedUser.address.district || 'N/A'}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Course Access — always visible so admin can assign a course
                                        even to a student with zero enrollments today. */}
                                    <div className="flex items-center justify-between p-3 border rounded">
                                      <div className="flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Course Access</span>
                                      </div>
                                      <Button size="sm" onClick={() => setAssignCourseDialogOpen(true)}>
                                        Assign to Course
                                      </Button>
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
                                                      {enrollment.courseType} • {
                                                        enrollment.enrollmentType === 'regular' ? 'Paid' :
                                                        enrollment.enrollmentType === 'trial' ? 'Trial' :
                                                        enrollment.enrollmentType === 'admin_assigned' ? 'Admin Assigned' :
                                                        'Access Code'
                                                      }
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <Badge
                                                    variant={
                                                      enrollment.enrollmentType === 'trial' ? "outline" :
                                                      enrollment.enrollmentType === 'access_code' ? "secondary" :
                                                      enrollment.enrollmentType === 'admin_assigned' ? "secondary" :
                                                      "default"
                                                    }
                                                    className="mb-1"
                                                  >
                                                    {enrollment.enrollmentType === 'regular' ? 'Paid' :
                                                     enrollment.enrollmentType === 'trial' ? 'Trial' :
                                                     enrollment.enrollmentType === 'admin_assigned' ? 'Admin Assigned' :
                                                     'Access Code'}
                                                  </Badge>
                                                  <div className="text-xs text-muted-foreground">
                                                    {enrollment.status}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                                {enrollment.enrollmentType !== 'trial' && (
                                                  <div>
                                                    <span className="font-medium">Progress:</span> {enrollment.weightedCourseProgress ?? enrollment.progress ?? 0}%
                                                  </div>
                                                )}
                                                <div>
                                                  <span className="font-medium">Enrolled:</span> {formatDate(enrollment.enrolledAt)}
                                                </div>
                                              </div>

                                              {enrollment.enrollmentType === 'trial' && enrollment.expiresAt && (
                                                <div className="mt-2 text-sm">
                                                  <span className="font-medium">Expires:</span> {formatDate(enrollment.expiresAt)}
                                                </div>
                                              )}

                                              {enrollment.enrollmentType === 'admin_assigned' && (
                                                <div className="mt-2 text-sm space-y-1">
                                                  <div>
                                                    <span className="font-medium">Payment:</span> {enrollment.paymentMethod || 'N/A'}
                                                    {typeof enrollment.amount === 'number' && ` • Rs ${enrollment.amount}`}
                                                  </div>
                                                  {enrollment.paymentReference && (
                                                    <div>
                                                      <span className="font-medium">Reference:</span> {enrollment.paymentReference}
                                                    </div>
                                                  )}
                                                  <div className="text-muted-foreground">{enrollment.generatedBy}</div>
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

                                              {enrollment.enrollmentType !== 'trial' && (
                                                <div className="mt-2 bg-muted rounded-full h-2">
                                                  <div
                                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${enrollment.weightedCourseProgress ?? enrollment.progress ?? 0}%` }}
                                                  ></div>
                                                </div>
                                              )}

                                              <div className="mt-3 flex justify-end">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                  onClick={() => handleRemoveEnrollment(enrollment)}
                                                >
                                                  <Trash2 className="h-4 w-4 mr-2" />
                                                  Remove from Course
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* School */}
                                    <div className="flex items-center justify-between p-3 border rounded">
                                      <div className="flex items-center gap-2">
                                        <School className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">School</span>
                                        <Badge variant={(selectedUser as any).schoolId ? 'default' : 'outline'}>
                                          {(selectedUser as any).schoolId ? ((selectedUser as any).schoolName || 'Linked') : 'Independent'}
                                        </Badge>
                                      </div>
                                      <Button size="sm" variant="outline" onClick={() => setManageSchoolDialogOpen(true)}>
                                        Manage School
                                      </Button>
                                    </div>

                                    {/* Account Status */}
                                    <div className="flex items-center justify-between p-3 border rounded">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Account Status</span>
                                        <Badge variant={(selectedUser as any).isBanned ? 'destructive' : 'default'}>
                                          {(selectedUser as any).isBanned ? 'Blocked' : 'Active'}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant={(selectedUser as any).isBanned ? 'default' : 'destructive'}
                                        size="sm"
                                        onClick={handleToggleBan}
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        {(selectedUser as any).isBanned ? 'Unblock User' : 'Block User'}
                                      </Button>
                                    </div>

                                    <AssignCourseDialog
                                      open={assignCourseDialogOpen}
                                      onOpenChange={setAssignCourseDialogOpen}
                                      studentName={selectedUser.full_name}
                                      courses={courses}
                                      coursesLoading={coursesLoading}
                                      onSubmit={handleAssignCourseSubmit}
                                      loading={assignCourseLoading}
                                    />
                                    <ManageSchoolDialog
                                      open={manageSchoolDialogOpen}
                                      onOpenChange={setManageSchoolDialogOpen}
                                      studentName={selectedUser.full_name}
                                      currentSchoolId={(selectedUser as any).schoolId || null}
                                      currentSchoolName={(selectedUser as any).schoolName || null}
                                      schools={schools}
                                      schoolsLoading={schoolsLoading}
                                      onAssign={handleAssignSchool}
                                      assignLoading={assignSchoolLoading}
                                      onMakeIndependent={handleMakeIndependent}
                                      independentLoading={makeIndependentLoading}
                                    />
                                  </div>
                                ) : null}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {!studentsLoading && studentsWithEnrollments.length > 0 && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {studentsWithEnrollments.length} of {studentsTotal} student{studentsTotal === 1 ? '' : 's'}
                  </div>
                  {studentsHasMore && (
                    <Button variant="outline" onClick={handleLoadMoreStudents} disabled={studentsLoadingMore}>
                      {studentsLoadingMore ? 'Loading...' : 'Load More'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
