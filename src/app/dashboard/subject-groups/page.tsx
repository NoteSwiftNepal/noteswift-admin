'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Link2, Ban, ChevronLeft, ChevronRight, RefreshCw, Video, Users } from 'lucide-react';
import { DisableSubjectGroupDialog } from '@/components/subject-groups/disable-subject-group-dialog';

// Locally redeclared — no shared types package in this repo (same posture
// as every other admin page's own interfaces).
interface SubjectGroupMember {
  courseId: string;
  courseSubjectId: string;
  courseName: string;
  subjectName: string;
}

interface SubjectGroup {
  _id: string;
  name: string;
  members: SubjectGroupMember[];
  status: 'active' | 'disabled';
  createdByTeacher: { id: string; name: string; email: string } | null;
  liveClassCount: number;
  studentsReached: number;
  createdAt: string;
}

interface SubjectGroupsResponse {
  success: boolean;
  data: {
    subjectGroups: SubjectGroup[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
}

// Compact "Physics · Mechanics: NEET 2026, JEE 2026" — grouped by subject
// name since every member of a group shares the same real-world subject by
// definition; only the course list actually varies member to member.
function formatMembers(members: SubjectGroupMember[]): string {
  if (members.length === 0) return '-';
  const subjectName = members[0].subjectName;
  const courseNames = members.map((m) => m.courseName).join(', ');
  return `${subjectName}: ${courseNames}`;
}

export default function SubjectGroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<SubjectGroupsResponse['data']['pagination'] | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [pageSize] = useState(20);

  const [disableDialog, setDisableDialog] = useState<{ open: boolean; group: SubjectGroup | null }>({ open: false, group: null });

  const fetchGroups = async (page = 1, showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(status && status !== 'all' && { status }),
      });

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(`${API_ENDPOINTS.SUBJECT_GROUPS.LIST}?${params}`, createFetchOptions('GET'));
      if (!response.ok) throw new Error('Failed to fetch subject groups');

      const data: SubjectGroupsResponse = await response.json();
      if (data.success) {
        setGroups(data.data.subjectGroups);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.message || 'Failed to fetch subject groups');
      }
    } catch (error: any) {
      console.error('Error fetching subject groups:', error);
      toast({ title: 'Error', description: error.message || 'Failed to load subject groups', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = () => {
    fetchGroups(1);
  };

  const handlePageChange = (page: number) => {
    fetchGroups(page);
  };

  const handleDisableConfirm = async (groupId: string, reason: string) => {
    const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
    const response = await fetch(API_ENDPOINTS.SUBJECT_GROUPS.DISABLE(groupId), createFetchOptions('PATCH', { reason }));
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to disable group');
    }
    toast({ title: 'Group disabled', description: 'Future shared scheduling and notifications are stopped for this group.' });
    await fetchGroups(pagination?.page || 1, true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="h-7 w-7" />
            Subject Groups
          </h1>
          <p className="text-muted-foreground mt-2">
            Every teacher's Shared Live Class Groups — which courses/subjects are linked, and by whom.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchGroups(pagination?.page || 1, true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Search by group name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleFilterChange}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
          <CardDescription>
            {pagination && `Showing ${groups.length} of ${pagination.total} group(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Live Classes</TableHead>
                  <TableHead>Students Reached</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      Loading subject groups...
                    </TableCell>
                  </TableRow>
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Link2 className="w-10 h-10 text-gray-400" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">No Subject Groups Yet</h3>
                          <p className="text-gray-500 mt-1">
                            Groups appear here once a teacher links the same subject across multiple courses.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => (
                    <TableRow key={group._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        {group.createdByTeacher ? (
                          <div>
                            <div className="font-medium text-sm">{group.createdByTeacher.name}</div>
                            <div className="text-xs text-gray-500">{group.createdByTeacher.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Unknown teacher</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm">{formatMembers(group.members)}</span>
                      </TableCell>
                      <TableCell>
                        {group.status === 'active' ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Video className="h-3.5 w-3.5 text-gray-400" />
                          {group.liveClassCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          {group.studentsReached}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {group.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDisableDialog({ open: true, group })}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1.5" />
                            Disable
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">Re-enable is teacher-owned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} groups
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DisableSubjectGroupDialog
        open={disableDialog.open}
        onOpenChange={(open) => setDisableDialog((d) => ({ ...d, open }))}
        group={disableDialog.group}
        onConfirm={handleDisableConfirm}
      />
    </div>
  );
}
