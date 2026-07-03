'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Minus, Pencil, Trash2, Save, X, User, BookOpen, PlayCircle, FileText, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { getCourse, updateCourse, updateChapter, deleteChapter } from '@/lib/api/adminCourses';
import { fetchApprovedTeachers } from '@/lib/api/adminTeachers';
import { toast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/config/api';

interface Module {
  _id?: string;
  name: string;
  description: string;
  duration?: string;
  hasVideo?: boolean;
  hasNotes?: boolean;
  liveClassSchedule?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface Subject {
  _id?: string;
  name: string;
  description?: string;
  modules?: Module[];
  assignedTeacher?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    profilePhoto?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Course {
  _id?: string;
  title: string;
  subjects?: Subject[];
}

interface Teacher {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  profilePhoto?: string;
  subjects?: any[];
}

export default function SubjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingChapter, setEditingChapter] = useState<{
    subjectIndex: number;
    moduleIndex: number;
    name: string;
    description: string;
    duration: string;
  } | null>(null);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [deleteChapterTarget, setDeleteChapterTarget] = useState<{
    subjectIndex: number;
    moduleIndex: number;
    name: string;
  } | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedSections, setExpandedSections] = useState<{
    stats: boolean;
    subjects: { [key: number]: { expanded: boolean; details: boolean; modules: boolean; moduleItems: { [key: number]: boolean } } };
  }>({
    stats: true,
    subjects: {}
  });

  // Load course and teachers data
  useEffect(() => {
    loadData();
  }, [courseId, refreshTrigger]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [courseData, teachersData] = await Promise.all([
        getCourse(courseId),
        fetchApprovedTeachers()
      ]);

      // Ensure subjects array exists
      const courseWithSubjects = {
        ...courseData,
        subjects: courseData.subjects || []
      };

      // Fetch teacher assignments
      const assignmentsResponse = await fetch(`${API_ENDPOINTS.BASE}/api/teacher/teacher-assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      let assignments = [];
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        assignments = assignmentsData.data?.assignments || [];
        console.log('📋 Total assignments fetched:', assignments.length);
        console.log('📋 All assignments:', assignments);
      }

      // Find assigned teachers for each subject from teacher assignment data
      const subjectsWithAssignments = courseWithSubjects.subjects?.map((subject) => {
        // Trim subject name to handle trailing/leading spaces
        const trimmedSubjectName = subject.name.trim();
        
        // Find assignment for this course and subject
        console.log('🔍 Looking for assignment:', {
          searchCourseId: courseId,
          searchSubjectName: subject.name,
          trimmedSubjectName: trimmedSubjectName,
          allAssignmentCourseIds: assignments.map((a: any) => ({
            id: a.courseId._id,
            subject: a.subjectName,
            trimmedSubject: a.subjectName.trim(),
            matches: a.courseId._id === courseId && a.subjectName.trim() === trimmedSubjectName
          })),
          matchingAssignments: assignments.filter((a: any) => 
            a.courseId._id === courseId && 
            a.subjectName.trim() === trimmedSubjectName && 
            a.isActive
          )
        });
        
        const assignment = assignments.find((assignment: any) => 
          assignment.courseId._id === courseId && 
          assignment.subjectName.trim() === trimmedSubjectName && 
          assignment.isActive
        );

        if (assignment) {
          console.log('✅ Found assignment for', subject.name, ':', assignment);
          // Find the teacher details
          const assignedTeacher = teachersData.find(teacher => teacher._id === assignment.teacherId._id);
          
          if (assignedTeacher) {
            return {
              ...subject,
              assignedTeacher: {
                _id: assignedTeacher._id,
                firstName: assignedTeacher.firstName || '',
                lastName: assignedTeacher.lastName || '',
                fullName: assignedTeacher.fullName || `${assignedTeacher.firstName || ''} ${assignedTeacher.lastName || ''}`.trim() || assignedTeacher.email,
                email: assignedTeacher.email,
                profilePhoto: assignedTeacher.verificationDocuments?.profile?.[0]?.url
              }
            };
          }
        } else {
          console.log('❌ No assignment found for', subject.name);
        }

        return subject;
      }) || [];

      setCourse({
        ...courseWithSubjects,
        subjects: subjectsWithAssignments
      });
      setTeachers(teachersData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubject = (subjectIndex: number, updates: Partial<Subject>) => {
    setCourse(prevCourse => {
      if (!prevCourse) return null;
      const updatedSubjects = [...(prevCourse.subjects || [])];
      if (updatedSubjects[subjectIndex]) {
        updatedSubjects[subjectIndex] = { ...updatedSubjects[subjectIndex], ...updates };
      }
      return { ...prevCourse, subjects: updatedSubjects };
    });
  };

  const updateModule = (subjectIndex: number, moduleIndex: number, updates: Partial<Module>) => {
    setCourse(prevCourse => {
      if (!prevCourse?.subjects?.[subjectIndex]?.modules) return prevCourse;
      const updatedSubjects = [...(prevCourse.subjects || [])];
      const updatedModules = [...updatedSubjects[subjectIndex].modules!];
      if (updatedModules[moduleIndex]) {
        updatedModules[moduleIndex] = { ...updatedModules[moduleIndex], ...updates };
      }
      updatedSubjects[subjectIndex] = { ...updatedSubjects[subjectIndex], modules: updatedModules };
      return { ...prevCourse, subjects: updatedSubjects };
    });
  };

  const addSubject = () => {
    const newSubject: Subject = {
      name: '',
      description: '',
      modules: [{ name: '', description: '', duration: '' }]
    };
    setCourse(prevCourse => prevCourse ? {
      ...prevCourse,
      subjects: [...(prevCourse.subjects || []), newSubject]
    } : null);
  };

  const removeSubject = (subjectIndex: number) => {
    setCourse(prevCourse => {
      if (!prevCourse?.subjects) return prevCourse;
      const updatedSubjects = prevCourse.subjects.filter((_, i) => i !== subjectIndex);
      return { ...prevCourse, subjects: updatedSubjects };
    });
  };

  const addModule = (subjectIndex: number) => {
    setCourse(prevCourse => {
      if (!prevCourse?.subjects?.[subjectIndex]) return prevCourse;
      const updatedSubjects = [...(prevCourse.subjects || [])];
      const modules = [...(updatedSubjects[subjectIndex].modules || [])];
      modules.push({ name: '', description: '', duration: '' });
      updatedSubjects[subjectIndex] = { ...updatedSubjects[subjectIndex], modules };
      return { ...prevCourse, subjects: updatedSubjects };
    });
  };

  const removeModule = (subjectIndex: number, moduleIndex: number) => {
    setCourse(prevCourse => {
      if (!prevCourse?.subjects?.[subjectIndex]?.modules) return prevCourse;
      const updatedSubjects = [...(prevCourse.subjects || [])];
      const modules = updatedSubjects[subjectIndex].modules!.filter((_, i) => i !== moduleIndex);
      updatedSubjects[subjectIndex] = { ...updatedSubjects[subjectIndex], modules };
      return { ...prevCourse, subjects: updatedSubjects };
    });
  };

  const openEditChapter = (subjectIndex: number, moduleIndex: number) => {
    const module = course?.subjects?.[subjectIndex]?.modules?.[moduleIndex];
    if (!module) return;
    setEditingChapter({
      subjectIndex,
      moduleIndex,
      name: module.name,
      description: module.description || '',
      duration: module.duration || '',
    });
  };

  const handleSaveChapter = async () => {
    if (!editingChapter || !course?._id) return;
    const { subjectIndex, moduleIndex, name, description, duration } = editingChapter;
    const subject = course.subjects?.[subjectIndex];
    const module = subject?.modules?.[moduleIndex];
    if (!subject?._id || !module?._id) return;

    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Chapter name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingChapter(true);
      await updateChapter(course._id, subject._id, module._id, { name, description, duration });
      updateModule(subjectIndex, moduleIndex, { name, description, duration });
      toast({
        title: "Success",
        description: "Chapter updated successfully!",
      });
      setEditingChapter(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update chapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingChapter(false);
    }
  };

  const openDeleteChapter = (subjectIndex: number, moduleIndex: number) => {
    const module = course?.subjects?.[subjectIndex]?.modules?.[moduleIndex];
    if (!module) return;
    setDeleteChapterTarget({ subjectIndex, moduleIndex, name: module.name || `Chapter ${moduleIndex + 1}` });
  };

  const handleDeleteChapter = async () => {
    if (!deleteChapterTarget || !course?._id) return;
    const { subjectIndex, moduleIndex } = deleteChapterTarget;
    const subject = course.subjects?.[subjectIndex];
    const module = subject?.modules?.[moduleIndex];

    try {
      setIsDeletingChapter(true);

      // Only hit the backend if the chapter was actually persisted there
      if (subject?._id && module?._id) {
        await deleteChapter(course._id, subject._id, module._id);
      }

      removeModule(subjectIndex, moduleIndex);
      toast({
        title: "Success",
        description: "Chapter deleted successfully!",
      });
      setDeleteChapterTarget(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete chapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsDeletingChapter(false);
    }
  };

  const toggleStatsSection = () => {
    setExpandedSections(prev => ({ ...prev, stats: !prev.stats }));
  };

  const toggleSubjectExpansion = (subjectIndex: number) => {
    setExpandedSections(prev => {
      const isExpanding = !prev.subjects[subjectIndex]?.expanded;
      const subjectModules = course?.subjects?.[subjectIndex]?.modules || [];
      
      return {
        ...prev,
        subjects: {
          ...prev.subjects,
          [subjectIndex]: {
            ...prev.subjects[subjectIndex],
            expanded: isExpanding,
            // Initialize moduleItems to expanded when subject is expanded
            ...(isExpanding && {
              moduleItems: subjectModules.reduce((acc, _, index) => {
                acc[index] = true;
                return acc;
              }, {} as { [key: number]: boolean })
            })
          }
        }
      };
    });
  };

  const toggleSubjectSection = (subjectIndex: number, section: 'details' | 'modules') => {
    setExpandedSections(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subjectIndex]: {
          ...prev.subjects[subjectIndex],
          [section]: !prev.subjects[subjectIndex]?.[section]
        }
      }
    }));
  };

  const toggleModuleExpansion = (subjectIndex: number, moduleIndex: number) => {
    setExpandedSections(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subjectIndex]: {
          ...prev.subjects[subjectIndex],
          moduleItems: {
            ...prev.subjects[subjectIndex]?.moduleItems,
            [moduleIndex]: !prev.subjects[subjectIndex]?.moduleItems?.[moduleIndex]
          }
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!course) return;

    try {
      setIsSaving(true);

      // Validate subjects have names
      const invalidSubjects = course.subjects?.filter(s => !s.name.trim());
      if (invalidSubjects?.length) {
        toast({
          title: "Validation Error",
          description: "All subjects must have names",
          variant: "destructive",
        });
        return;
      }

      // Save to Course collection
      await updateCourse(courseId, course);

      // Also update SubjectContent collection for each subject
      for (const subject of course.subjects || []) {
        try {
          // Check if SubjectContent exists for this subject
          const response = await fetch(`${API_ENDPOINTS.SUBJECT_CONTENT.GET}?courseId=${courseId}&subjectName=${encodeURIComponent(subject.name)}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.result?.subjectContent) {
              let subjectContent = data.result.subjectContent;

              // Only update description, don't touch modules (content is managed separately)
              await fetch(API_ENDPOINTS.SUBJECT_CONTENT.UPDATE(subjectContent._id), {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  description: subject.description
                  // Don't update modules - content URLs are managed by teachers
                })
              });
            }
          }
        } catch (error) {
          console.error(`Error updating SubjectContent for subject ${subject.name}:`, error);
          // Continue with other subjects even if one fails
        }
      }

      toast({
        title: "Success",
        description: "Subject changes saved successfully!",
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error saving subjects:', error);
      toast({
        title: "Error",
        description: `Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading subject data...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Course not found</p>
          <Button onClick={() => router.push('/dashboard/courses')} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-6">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
             
              <h1 className="text-3xl font-bold text-gray-900">Subject Editor</h1>
            </div>
            <p className="text-gray-600">{course.title}</p>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <Card className="border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Course Overview
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleStatsSection}
                className="flex items-center gap-2"
              >
                {expandedSections.stats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expandedSections.stats ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </CardHeader>
          {expandedSections.stats && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-2xl font-bold">{course.subjects?.length || 0}</p>
                        <p className="text-sm text-gray-600">Subjects</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-2xl font-bold">
                          {course.subjects?.reduce((acc, s) => acc + (s.modules?.length || 0), 0) || 0}
                        </p>
                        <p className="text-sm text-gray-600">Modules</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-2xl font-bold">
                          {course.subjects?.filter(s => s.assignedTeacher).length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Assigned</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-2xl font-bold">{teachers.length}</p>
                        <p className="text-sm text-gray-600">Approved Teachers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Subjects List */}
        <div className="space-y-6">
          {course.subjects?.map((subject, subjectIndex) => (
            <Card key={subjectIndex} className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSubjectExpansion(subjectIndex)}
                      className="flex items-center gap-2 p-1"
                    >
                      {expandedSections.subjects[subjectIndex]?.expanded !== false ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <div>
                      <CardTitle className="text-lg">Subject {subjectIndex + 1}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {subject.modules?.length || 0} modules
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSubject(subjectIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              {expandedSections.subjects[subjectIndex]?.expanded !== false && (
                <CardContent className="space-y-6">
                {/* Subject Details */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Subject Details</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSubjectSection(subjectIndex, 'details')}
                      className="flex items-center gap-2"
                    >
                      {expandedSections.subjects[subjectIndex]?.details !== false ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expandedSections.subjects[subjectIndex]?.details !== false ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                  {expandedSections.subjects[subjectIndex]?.details !== false && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`subject-name-${subjectIndex}`}>Subject Name *</Label>
                          <Input
                            id={`subject-name-${subjectIndex}`}
                            value={subject.name}
                            onChange={(e) => updateSubject(subjectIndex, { name: e.target.value })}
                            placeholder="Enter subject name"
                          />
                        </div>
                        <div>
                          <Label>Assigned Teacher</Label>
                          {subject.assignedTeacher ? (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <Avatar>
                                <AvatarImage src={subject.assignedTeacher.profilePhoto} />
                                <AvatarFallback>
                                  {(subject.assignedTeacher.firstName?.[0] || '')}{(subject.assignedTeacher.lastName?.[0] || '') || subject.assignedTeacher.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{subject.assignedTeacher.fullName}</p>
                                <p className="text-xs text-gray-600">{subject.assignedTeacher.email}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-gray-600">No teacher assigned</p>
                                <p className="text-xs text-gray-500">Assign from Teacher Management</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`subject-desc-${subjectIndex}`}>Description</Label>
                        <Textarea
                          id={`subject-desc-${subjectIndex}`}
                          value={subject.description || ''}
                          onChange={(e) => updateSubject(subjectIndex, { description: e.target.value })}
                          placeholder="Subject description"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Modules */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Modules</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSubjectSection(subjectIndex, 'modules')}
                        className="flex items-center gap-2"
                      >
                        {expandedSections.subjects[subjectIndex]?.modules !== false ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {expandedSections.subjects[subjectIndex]?.modules !== false ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addModule(subjectIndex)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Chapter
                      </Button>
                    </div>
                  </div>

                  {expandedSections.subjects[subjectIndex]?.modules !== false && (
                    <div className="space-y-4">
                      {subject.modules?.map((module, moduleIndex) => (
                        <div key={moduleIndex} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleModuleExpansion(subjectIndex, moduleIndex)}
                                className="flex items-center gap-2 p-1"
                              >
                                {expandedSections.subjects[subjectIndex]?.moduleItems?.[moduleIndex] !== false ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                              <h4 className="font-medium">Chapter {moduleIndex + 1}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {module._id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditChapter(subjectIndex, moduleIndex)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteChapter(subjectIndex, moduleIndex)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {expandedSections.subjects[subjectIndex]?.moduleItems?.[moduleIndex] !== false && (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                <div className="md:col-span-2">
                                  <Label>Module Name *</Label>
                                  <Input
                                    value={module.name}
                                    onChange={(e) => updateModule(subjectIndex, moduleIndex, { name: e.target.value })}
                                    placeholder="Module name"
                                  />
                                </div>
                                <div>
                                  <Label>Duration</Label>
                                  <Input
                                    value={module.duration || ''}
                                    onChange={(e) => updateModule(subjectIndex, moduleIndex, { duration: e.target.value })}
                                    placeholder="e.g., 2 hours"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label>Description</Label>
                                <Textarea
                                  value={module.description}
                                  onChange={(e) => updateModule(subjectIndex, moduleIndex, { description: e.target.value })}
                                  placeholder="Module description"
                                  rows={2}
                                />
                              </div>

                              {/* Module Status Indicators */}
                              <div className="flex items-center gap-2 mt-3">
                                {module.hasVideo && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <PlayCircle className="w-3 h-3" />
                                    Has Video
                                  </Badge>
                                )}
                                {module.hasNotes && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    Has Notes
                                  </Badge>
                                )}
                                {module.liveClassSchedule && Array.isArray(module.liveClassSchedule) && module.liveClassSchedule.length > 0 && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {module.liveClassSchedule.length} Live Classes
                                  </Badge>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              )}
            </Card>
          ))}

          {/* Add Subject Button */}
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Add New Subject</h3>
              <p className="text-gray-600 mb-4">Create a new subject for this course</p>
              <Button onClick={addSubject} className="flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />
                Add Subject
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Chapter Dialog */}
      <Dialog open={!!editingChapter} onOpenChange={(open) => !open && setEditingChapter(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>
              Update this chapter&apos;s details. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>
          {editingChapter && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-chapter-name">Chapter Name *</Label>
                <Input
                  id="edit-chapter-name"
                  value={editingChapter.name}
                  onChange={(e) => setEditingChapter({ ...editingChapter, name: e.target.value })}
                  placeholder="Chapter name"
                />
              </div>
              <div>
                <Label htmlFor="edit-chapter-duration">Duration</Label>
                <Input
                  id="edit-chapter-duration"
                  value={editingChapter.duration}
                  onChange={(e) => setEditingChapter({ ...editingChapter, duration: e.target.value })}
                  placeholder="e.g., 2 hours"
                />
              </div>
              <div>
                <Label htmlFor="edit-chapter-description">Description</Label>
                <Textarea
                  id="edit-chapter-description"
                  value={editingChapter.description}
                  onChange={(e) => setEditingChapter({ ...editingChapter, description: e.target.value })}
                  placeholder="Chapter description"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChapter(null)} disabled={isSavingChapter}>
              Cancel
            </Button>
            <Button onClick={handleSaveChapter} disabled={isSavingChapter}>
              {isSavingChapter ? 'Saving...' : 'Save Chapter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Confirmation */}
      <AlertDialog open={!!deleteChapterTarget} onOpenChange={(open) => !open && setDeleteChapterTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteChapterTarget?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteChapterTarget(null)} disabled={isDeletingChapter}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChapter}
              disabled={isDeletingChapter}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingChapter ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}