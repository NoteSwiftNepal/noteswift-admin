'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Search, 
  Calendar, 
  User, 
  BookOpen, 
  Video, 
  Users, 
  Package,
  AlertTriangle,
  Loader2,
  X,
  FilterX,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';

interface ArchiveStats {
  archivedSubjects: number;
  archivedLiveClasses: number;
  archivedAssignments: number;
}

interface ArchivedItem {
  _id: string;
  subjectName?: string;
  courseName?: string;
  title?: string;
  teacherName?: string;
  teacherEmail?: string;
  teacherId?: { name: string; email: string };
  courseId?: { title: string };
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
  __typename?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ArchivesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [activeTab, setActiveTab] = useState('subjects');
  
  const [subjects, setSubjects] = useState<ArchivedItem[]>([]);
  const [liveClasses, setLiveClasses] = useState<ArchivedItem[]>([]);
  const [assignments, setAssignments] = useState<ArchivedItem[]>([]);
  
  const [subjectsPagination, setSubjectsPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [classesPagination, setClassesPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [assignmentsPagination, setAssignmentsPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 0 });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const res = await fetch(API_ENDPOINTS.ARCHIVES.STATS, createFetchOptions('GET'));
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (error) {
      console.error('Error fetching archive stats:', error);
    }
  }, []);

  const fetchSubjects = useCallback(async (page = 1) => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`${API_ENDPOINTS.ARCHIVES.SUBJECTS}?${params}`, createFetchOptions('GET'));
      const json = await res.json();
      if (json.success) {
        setSubjects(json.data);
        setSubjectsPagination(json.pagination);
      }
    } catch (error) {
      console.error('Error fetching archived subjects:', error);
    }
  }, [searchQuery]);

  const fetchLiveClasses = useCallback(async (page = 1) => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`${API_ENDPOINTS.ARCHIVES.LIVE_CLASSES}?${params}`, createFetchOptions('GET'));
      const json = await res.json();
      if (json.success) {
        setLiveClasses(json.data);
        setClassesPagination(json.pagination);
      }
    } catch (error) {
      console.error('Error fetching archived live classes:', error);
    }
  }, [searchQuery]);

  const fetchAssignments = useCallback(async (page = 1) => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`${API_ENDPOINTS.ARCHIVES.TEACHER_ASSIGNMENTS}?${params}`, createFetchOptions('GET'));
      const json = await res.json();
      if (json.success) {
        setAssignments(json.data);
        setAssignmentsPagination(json.pagination);
      }
    } catch (error) {
      console.error('Error fetching archived assignments:', error);
    }
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchSubjects(subjectsPagination.page),
      fetchLiveClasses(classesPagination.page),
      fetchAssignments(assignmentsPagination.page),
    ]);
    setLoading(false);
  }, [fetchStats, fetchSubjects, fetchLiveClasses, fetchAssignments, subjectsPagination.page, classesPagination.page, assignmentsPagination.page]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'subjects') {
      fetchSubjects(subjectsPagination.page);
    } else if (activeTab === 'classes') {
      fetchLiveClasses(classesPagination.page);
    } else if (activeTab === 'assignments') {
      fetchAssignments(assignmentsPagination.page);
    }
  }, [activeTab, subjectsPagination.page, classesPagination.page, assignmentsPagination.page, fetchSubjects, fetchLiveClasses, fetchAssignments]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    if (activeTab === 'subjects') {
      setSubjectsPagination(p => ({ ...p, page: 1 }));
    } else if (activeTab === 'classes') {
      setClassesPagination(p => ({ ...p, page: 1 }));
    } else if (activeTab === 'assignments') {
      setAssignmentsPagination(p => ({ ...p, page: 1 }));
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSubjectsPagination(p => ({ ...p, page: 1 }));
    setClassesPagination(p => ({ ...p, page: 1 }));
    setAssignmentsPagination(p => ({ ...p, page: 1 }));
  };

  const handleRestore = async (id: string, type: 'subject' | 'liveClass' | 'assignment') => {
    setRestoring(id);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      let endpoint;
      if (type === 'subject') endpoint = API_ENDPOINTS.ARCHIVES.RESTORE_SUBJECT(id);
      else if (type === 'liveClass') endpoint = API_ENDPOINTS.ARCHIVES.RESTORE_LIVE_CLASS(id);
      else endpoint = API_ENDPOINTS.ARCHIVES.RESTORE_TEACHER_ASSIGNMENT(id);

      const res = await fetch(endpoint, createFetchOptions('POST'));
      const json = await res.json();
      
      if (json.success) {
        toast({ title: 'Success', description: 'Item restored successfully' });
        await loadData();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to restore item' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to restore item' });
    } finally {
      setRestoring(null);
      setRestoreDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handlePermanentDelete = async (id: string, type: 'subject' | 'liveClass' | 'assignment') => {
    if (deleteConfirmation !== 'DELETE') {
      toast({ title: 'Error', description: 'Please type DELETE to confirm' });
      return;
    }

    setDeleting(id);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      let endpoint;
      if (type === 'subject') endpoint = API_ENDPOINTS.ARCHIVES.PERMANENT_DELETE_SUBJECT(id);
      else if (type === 'liveClass') endpoint = API_ENDPOINTS.ARCHIVES.PERMANENT_DELETE_LIVE_CLASS(id);
      else endpoint = API_ENDPOINTS.ARCHIVES.PERMANENT_DELETE_TEACHER_ASSIGNMENT(id);

      const res = await fetch(endpoint, createFetchOptions('POST', { confirmation: 'DELETE' }));
      const json = await res.json();
      
      if (json.success) {
        toast({ title: 'Success', description: 'Item permanently deleted' });
        await loadData();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to delete item' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete item' });
    } finally {
      setDeleting(null);
      setPermanentDeleteDialogOpen(false);
      setSelectedItem(null);
      setDeleteConfirmation('');
    }
  };

  const openViewDialog = (item: ArchivedItem) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  const openRestoreDialog = (item: ArchivedItem) => {
    setSelectedItem(item);
    setRestoreDialogOpen(true);
  };

  const openPermanentDeleteDialog = (item: ArchivedItem) => {
    setSelectedItem(item);
    setDeleteConfirmation('');
    setPermanentDeleteDialogOpen(true);
  };

  const getCurrentPagination = () => {
    if (activeTab === 'subjects') return subjectsPagination;
    if (activeTab === 'classes') return classesPagination;
    return assignmentsPagination;
  };

  const getCurrentData = () => {
    if (activeTab === 'subjects') return subjects;
    if (activeTab === 'classes') return liveClasses;
    return assignments;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getItemType = (item: ArchivedItem) => {
    return activeTab;
  };

  const getItemName = (item: ArchivedItem) => {
    return item.subjectName || item.title || item.subjectName || 'Unknown';
  };

  const getItemCourse = (item: ArchivedItem) => {
    return item.courseName || item.courseId?.title || 'N/A';
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading archives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Archive Management</h2>
          <p className="text-muted-foreground">Manage soft-deleted courses, subjects, and content</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.archivedSubjects || 0}</div>
            <p className="text-xs text-muted-foreground">Soft-deleted subjects</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Classes</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.archivedLiveClasses || 0}</div>
            <p className="text-xs text-muted-foreground">Soft-deleted live classes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teacher Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.archivedAssignments || 0}</div>
            <p className="text-xs text-muted-foreground">Archived assignments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.archivedSubjects || 0) + (stats?.archivedLiveClasses || 0) + (stats?.archivedAssignments || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Items in archive</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archives..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} variant="default">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={handleResetFilters} variant="outline">
                <FilterX className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="subjects" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subjects
                  <Badge variant="secondary" className="ml-1">{stats?.archivedSubjects || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="classes" className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Live Classes
                  <Badge variant="secondary" className="ml-1">{stats?.archivedLiveClasses || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assignments
                  <Badge variant="secondary" className="ml-1">{stats?.archivedAssignments || 0}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="subjects" className="m-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No archived subjects</h3>
                  <p className="text-muted-foreground max-w-md">
                    Subjects that have been deleted will appear here. You can restore them or permanently delete them.
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject Name</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Deleted By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">{item.subjectName}</TableCell>
                          <TableCell>{item.courseName}</TableCell>
                          <TableCell>{item.teacherName}</TableCell>
                          <TableCell>{formatDate(item.deletedAt)}</TableCell>
                          <TableCell>
                            {item.deletedBy ? (
                              <Badge variant="outline">Admin</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openViewDialog(item)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRestoreDialog(item)}
                                disabled={restoring === item._id}
                              >
                                {restoring === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPermanentDeleteDialog(item)}
                                disabled={deleting === item._id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deleting === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((subjectsPagination.page - 1) * subjectsPagination.limit) + 1} to{' '}
                      {Math.min(subjectsPagination.page * subjectsPagination.limit, subjectsPagination.total)} of{' '}
                      {subjectsPagination.total} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSubjectsPagination(p => ({ ...p, page: p.page - 1 }))}
                        disabled={subjectsPagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {subjectsPagination.page} of {subjectsPagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSubjectsPagination(p => ({ ...p, page: p.page + 1 }))}
                        disabled={subjectsPagination.page >= subjectsPagination.pages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="classes" className="m-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : liveClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Video className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No archived live classes</h3>
                  <p className="text-muted-foreground max-w-md">
                    Live classes that have been deleted will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveClasses.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{item.subjectName}</TableCell>
                          <TableCell>{item.courseName}</TableCell>
                          <TableCell>{item.teacherName}</TableCell>
                          <TableCell>{formatDate(item.deletedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openViewDialog(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRestoreDialog(item)}
                                disabled={restoring === item._id}
                              >
                                {restoring === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPermanentDeleteDialog(item)}
                                disabled={deleting === item._id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deleting === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((classesPagination.page - 1) * classesPagination.limit) + 1} to{' '}
                      {Math.min(classesPagination.page * classesPagination.limit, classesPagination.total)} of{' '}
                      {classesPagination.total} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClassesPagination(p => ({ ...p, page: p.page - 1 }))}
                        disabled={classesPagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {classesPagination.page} of {classesPagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClassesPagination(p => ({ ...p, page: p.page + 1 }))}
                        disabled={classesPagination.page >= classesPagination.pages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="assignments" className="m-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No archived assignments</h3>
                  <p className="text-muted-foreground max-w-md">
                    Teacher assignments that have been deleted will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Assigned At</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">{item.subjectName}</TableCell>
                          <TableCell>{(item.courseId as any)?.title || item.courseName || 'N/A'}</TableCell>
                          <TableCell>{(item.teacherId as any)?.name || item.teacherName}</TableCell>
                          <TableCell>{item.assignedAt ? formatDate(item.assignedAt) : '-'}</TableCell>
                          <TableCell>{formatDate(item.deletedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openViewDialog(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRestoreDialog(item)}
                                disabled={restoring === item._id}
                              >
                                {restoring === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPermanentDeleteDialog(item)}
                                disabled={deleting === item._id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deleting === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((assignmentsPagination.page - 1) * assignmentsPagination.limit) + 1} to{' '}
                      {Math.min(assignmentsPagination.page * assignmentsPagination.limit, assignmentsPagination.total)} of{' '}
                      {assignmentsPagination.total} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignmentsPagination(p => ({ ...p, page: p.page - 1 }))}
                        disabled={assignmentsPagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {assignmentsPagination.page} of {assignmentsPagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignmentsPagination(p => ({ ...p, page: p.page + 1 }))}
                        disabled={assignmentsPagination.page >= assignmentsPagination.pages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Archive Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the archived item
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium capitalize">{getItemType(selectedItem)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{getItemName(selectedItem)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Course</Label>
                  <p className="font-medium">{getItemCourse(selectedItem)}</p>
                </div>
                {selectedItem.teacherName && (
                  <div>
                    <Label className="text-muted-foreground">Teacher</Label>
                    <p className="font-medium">{selectedItem.teacherName}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Deleted At</Label>
                  <p className="font-medium">{formatDate(selectedItem.deletedAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Deleted By</Label>
                  <p className="font-medium">{selectedItem.deletedBy ? 'Admin' : 'System'}</p>
                </div>
              </div>
              {selectedItem.deletionReason && (
                <div>
                  <Label className="text-muted-foreground">Deletion Reason</Label>
                  <p className="font-medium">{selectedItem.deletionReason}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <RefreshCw className="h-5 w-5" />
              Restore from Archive
            </DialogTitle>
            <DialogDescription>
              This will restore the item and make it visible again
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-green-800">
                  Restore "{getItemName(selectedItem)}"?
                </p>
                <p className="text-sm text-green-600 mt-2">
                  This will make the {getItemType(selectedItem)} visible to teachers and students again.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setRestoreDialogOpen(false);
                setSelectedItem(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedItem) {
                  const type = activeTab === 'subjects' ? 'subject' : activeTab === 'classes' ? 'liveClass' : 'assignment';
                  handleRestore(selectedItem._id, type);
                }
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanent Delete Warning
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-800">
                  Delete "{getItemName(selectedItem)}"?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This will permanently remove all associated data including recordings, progress, and content.
                </p>
              </div>
              
              <div>
                <Label className="text-red-600">Type "DELETE" to confirm</Label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE"
                  className="mt-2 border-red-300 focus:border-red-500"
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setPermanentDeleteDialogOpen(false);
                setSelectedItem(null);
                setDeleteConfirmation('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedItem) {
                  const type = activeTab === 'subjects' ? 'subject' : activeTab === 'classes' ? 'liveClass' : 'assignment';
                  handlePermanentDelete(selectedItem._id, type);
                }
              }}
              disabled={deleteConfirmation !== 'DELETE'}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Permanently Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}