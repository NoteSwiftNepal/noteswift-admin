"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { fetchPendingTeachers, fetchApprovedTeachers, fetchRejectedTeachers, approveTeacher, rejectTeacher, removeTeacher, TeacherSummary } from "@/lib/api/adminTeachers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Eye, UserCheck, UserX, Shield, BookOpen, Plus, Edit, CheckCircle, User, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { RemoveTeacherDialog } from "@/components/teachers/remove-teacher-dialog";

interface Course {
  _id: string;
  title: string;
  subject: string;
  description: string;
  status: string;
  gradeLevel?: string;
  chapters?: any[];
  program?: string;
  subjects?: Array<{
    name: string;
    description?: string;
    modules?: Array<{
      name: string;
      description: string;
      duration?: string;
    }>;
  }>;
}

export default function TeachersManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [loading, setLoading] = useState(false);
  const [pendingTeachers, setPendingTeachers] = useState<TeacherSummary[]>([]);
  const [approvedTeachers, setApprovedTeachers] = useState<TeacherSummary[]>([]);
  const [rejectedTeachers, setRejectedTeachers] = useState<TeacherSummary[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pending']));
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [teacherToRemove, setTeacherToRemove] = useState<TeacherSummary | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [pendingData, approvedData, rejectedData, coursesData] = await Promise.all([
        fetchPendingTeachers(),
        fetchApprovedTeachers(),
        fetchRejectedTeachers(),
        fetchCourses()
      ]);
      setPendingTeachers(pendingData);
      setApprovedTeachers(approvedData);
      setRejectedTeachers(rejectedData);
      setCourses(coursesData);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Load failed', description: err.message || 'Could not load data' });
    } finally {
      setLoading(false);
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
      console.error(err);
      return [];
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSectionExpansion = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveTeacher(id);
      toast({ title: 'Approved', description: 'Teacher approved successfully' });
      // Move from pending to approved
      const teacher = pendingTeachers.find(t => t._id === id);
      if (teacher) {
        setPendingTeachers(prev => prev.filter(t => t._id !== id));
        setApprovedTeachers(prev => [...prev, teacher]);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Approve failed', description: err.message || 'Could not approve teacher' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectTeacher(id);
      toast({ title: 'Rejected', description: 'Teacher rejected' });
      // Move from pending to rejected
      const teacher = pendingTeachers.find(t => t._id === id);
      if (teacher) {
        setPendingTeachers(prev => prev.filter(t => t._id !== id));
        setRejectedTeachers(prev => [...prev, teacher]);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Reject failed', description: err.message || 'Could not reject teacher' });
    }
  };

  const openRemoveDialog = (teacher: TeacherSummary) => {
    setTeacherToRemove(teacher);
    setRemoveDialogOpen(true);
  };

  const handleRemoveTeacher = async (teacherId: string, reason: string) => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.TEACHERS.REMOVE(teacherId),
        createFetchOptions('POST', { reason })
      );
      const data = await response.json();
      
      if (response.ok) {
        toast({ 
          title: 'Teacher Removed', 
          description: data.message || 'Teacher has been removed and notified via email.' 
        });
        // Remove from all lists
        setPendingTeachers(prev => prev.filter(t => t._id !== teacherId));
        setApprovedTeachers(prev => prev.filter(t => t._id !== teacherId));
        setRejectedTeachers(prev => prev.filter(t => t._id !== teacherId));
      } else {
        throw new Error(data.error || 'Failed to remove teacher');
      }
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Remove failed', 
        description: err.message || 'Could not remove teacher',
        variant: 'destructive'
      });
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
            <div>
                   <div className="flex items-center gap-2">
                              <CardTitle className="text-3xl font-bold text-gray-900">Teacher Management</CardTitle>
                          </div>
                  <p className="text-gray-600 mt-2">Manage and oversee teacher assignments and approvals</p>
                </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading teachers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
     <div>
                   <div className="flex items-center justify-between">
                     <div>
                       <div className="flex items-center gap-2">
                         <Users className="h-6 w-6 text-primary" />
                         <CardTitle className="text-3xl font-bold text-gray-900">Teacher Management</CardTitle>
                       </div>
                       <p className="text-gray-600 mt-2">Manage and oversee teacher assignments and approvals</p>
                     </div>
                     <Button onClick={() => router.push('/dashboard/teacher-assignments')}>
                       <BookOpen className="h-4 w-4 mr-2" />
                       Subject Assignments
                     </Button>
                   </div>
                </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            Overview ({pendingTeachers.length + approvedTeachers.length + rejectedTeachers.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingTeachers.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedTeachers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedTeachers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Pending Teachers Overview */}
          <Card>
            <Collapsible open={expandedSections.has('pending')} onOpenChange={() => toggleSectionExpansion('pending')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSections.has('pending') ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Pending Approval
                      </CardTitle>
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        {pendingTeachers.length} teachers
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {pendingTeachers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending teachers
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingTeachers.map(t => (
                        <div key={t._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`}</div>
                              <div className="text-sm text-muted-foreground">{t.email}</div>
                              <div className="text-sm text-muted-foreground">{t.institution?.name || ''} • {t.subjects?.map((s: any) => s.name).join(', ')}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher-management/${t._id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button size="sm" onClick={() => handleApprove(t._id)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleReject(t._id)}>
                              <UserX className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Approved Teachers Overview */}
          <Card>
            <Collapsible open={expandedSections.has('approved')} onOpenChange={() => toggleSectionExpansion('approved')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSections.has('approved') ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Approved Teachers
                      </CardTitle>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {approvedTeachers.length} teachers
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {approvedTeachers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No approved teachers
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {approvedTeachers.map(t => (
                        <div key={t._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`}</div>
                              <div className="text-sm text-muted-foreground">{t.email}</div>
                              <div className="text-sm text-muted-foreground">{t.institution?.name || ''} • {t.subjects?.map((s: any) => s.name).join(', ')}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher-management/${t._id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openRemoveDialog(t)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Rejected Teachers Overview */}
          <Card>
            <Collapsible open={expandedSections.has('rejected')} onOpenChange={() => toggleSectionExpansion('rejected')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSections.has('rejected') ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        Rejected Teachers
                      </CardTitle>
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {rejectedTeachers.length} teachers
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {rejectedTeachers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No rejected teachers
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rejectedTeachers.map(t => (
                        <div key={t._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <UserX className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <div className="font-semibold">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`}</div>
                              <div className="text-sm text-muted-foreground">{t.email}</div>
                              <div className="text-sm text-muted-foreground">{t.institution?.name || ''} • {t.subjects?.map((s: any) => s.name).join(', ')}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher-management/${t._id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Pending Approval ({pendingTeachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTeachers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending teachers
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTeachers.map(t => (
                    <div key={t._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`}</div>
                          <div className="text-sm text-muted-foreground">{t.email}</div>
                          <div className="text-sm text-muted-foreground">{t.institution?.name || ''} • {t.subjects?.map((s: any) => s.name).join(', ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher-management/${t._id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(t._id)}>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleReject(t._id)}>
                          <UserX className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Approved Teachers ({approvedTeachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedTeachers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No approved teachers
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedTeachers.map(t => (
                    <div key={t._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`}</div>
                          <div className="text-sm text-muted-foreground">{t.email}</div>
                          <div className="text-sm text-muted-foreground">{t.institution?.name || ''} • {t.subjects?.map((s: any) => s.name).join(', ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher-management/${t._id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openRemoveDialog(t)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Rejected Teachers ({rejectedTeachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedTeachers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No rejected teachers
                </div>
              ) : (
                <div className="space-y-4">
                  {rejectedTeachers.map(t => (
                    <div key={t._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <UserX className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`}</div>
                          <div className="text-sm text-muted-foreground">{t.email}</div>
                          <div className="text-sm text-muted-foreground">{t.institution?.name || ''} • {t.subjects?.map((s: any) => s.name).join(', ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher-management/${t._id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remove Teacher Dialog */}
        <RemoveTeacherDialog
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          teacher={teacherToRemove ? {
            _id: teacherToRemove._id,
            firstName: teacherToRemove.firstName || '',
            lastName: teacherToRemove.lastName || '',
            email: teacherToRemove.email
          } : null}
          onConfirm={handleRemoveTeacher}
        />
      </Tabs>
    </div>
  );
}