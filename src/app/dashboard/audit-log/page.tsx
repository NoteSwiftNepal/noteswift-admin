'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  BookOpen,
  UserCheck,
  CreditCard,
  MessageSquare,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Database
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  _id: string;
  userId?: string;
  userType: 'admin' | 'teacher' | 'student' | 'system';
  userName: string;
  userEmail?: string;
  action: string;
  category: 'authentication' | 'user_management' | 'course_content' | 'enrollment' | 'payment' | 'communication' | 'system';
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  details: string;
  status: 'success' | 'failure' | 'warning';
  timestamp: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    location?: string;
    oldValue?: any;
    newValue?: any;
    additionalData?: Record<string, any>;
    [key: string]: any;
  };
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    statistics: {
      totalLogs: number;
      successCount: number;
      failureCount: number;
      warningCount: number;
      categories: string[];
      userTypes: string[];
    };
  };
}

const CATEGORY_CONFIG = {
  authentication: { icon: Shield, label: 'Authentication', color: 'bg-blue-100 text-blue-800' },
  user_management: { icon: Users, label: 'User Management', color: 'bg-blue-100 text-blue-800' },
  course_content: { icon: BookOpen, label: 'Course Content', color: 'bg-blue-100 text-blue-800' },
  enrollment: { icon: UserCheck, label: 'Enrollment', color: 'bg-blue-100 text-blue-800' },
  payment: { icon: CreditCard, label: 'Payment', color: 'bg-blue-100 text-blue-800' },
  communication: { icon: MessageSquare, label: 'Communication', color: 'bg-blue-100 text-blue-800' },
  system: { icon: Settings, label: 'System', color: 'bg-blue-100 text-blue-800' }
};

const STATUS_CONFIG = {
  success: { icon: CheckCircle, label: 'Success', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  failure: { icon: XCircle, label: 'Failure', color: 'bg-red-100 text-red-800 border-red-200' },
  warning: { icon: AlertTriangle, label: 'Warning', color: 'bg-blue-100 text-blue-800 border-blue-200' }
};

const USER_TYPE_CONFIG = {
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  teacher: { label: 'Teacher', color: 'bg-blue-100 text-blue-800' },
  student: { label: 'Student', color: 'bg-blue-100 text-blue-800' },
  system: { label: 'System', color: 'bg-blue-100 text-blue-800' }
};

export default function AuditLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState<AuditLogsResponse['data']['statistics'] | null>(null);
  const [pagination, setPagination] = useState<AuditLogsResponse['data']['pagination'] | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [userType, setUserType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const fetchAuditLogs = async (page = 1, showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(category && category !== 'all' && { category }),
        ...(userType && userType !== 'all' && { userType }),
        ...(status && status !== 'all' && { status }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      });

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(`${API_ENDPOINTS.AUDIT_LOGS.LIST}?${params}`, createFetchOptions('GET'));
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data: AuditLogsResponse = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
        setStatistics(data.data.statistics);
        setPagination(data.data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleFilterChange = () => {
    fetchAuditLogs(1);
  };

  const handlePageChange = (page: number) => {
    fetchAuditLogs(page);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Export up to 10k records
        ...(search && { search }),
        ...(category && category !== 'all' && { category }),
        ...(userType && userType !== 'all' && { userType }),
        ...(status && status !== 'all' && { status }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      });

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(`${API_ENDPOINTS.AUDIT_LOGS.LIST}?${params}`, createFetchOptions('GET'));
      if (!response.ok) throw new Error('Failed to fetch audit logs for export');

      const data: AuditLogsResponse = await response.json();
      if (data.success) {
        // Convert to CSV
        const csvHeaders = ['Timestamp', 'User Type', 'User Name', 'Email', 'Category', 'Action', 'Details', 'Status', 'Resource Type', 'Resource Name'];
        const csvRows = data.data.logs.map(log => [
          new Date(log.timestamp).toLocaleString(),
          USER_TYPE_CONFIG[log.userType].label,
          log.userName,
          log.userEmail || '',
          CATEGORY_CONFIG[log.category].label,
          log.action,
          log.details,
          STATUS_CONFIG[log.status].label,
          log.resourceType || '',
          log.resourceName || ''
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: 'Audit logs exported successfully'
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export audit logs',
        variant: 'destructive'
      });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setUserType('all');
    setStatus('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
    fetchAuditLogs(1);
  };

  const getActionVariant = (action: string) => {
    if (action.includes('created') || action.includes('success') || action.includes('activated') || action.includes('assigned')) {
      return 'default';
    }
    if (action.includes('updated') || action.includes('changed') || action.includes('sent')) {
      return 'secondary';
    }
    if (action.includes('deleted') || action.includes('failed') || action.includes('deactivated') || action.includes('locked')) {
      return 'destructive';
    }
    return 'outline';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <div className="text-lg">Loading audit logs...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
              <Shield className="w-8 h-8 text-gray-800" />
              Audit Logs
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive security and activity monitoring</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => fetchAuditLogs(currentPage, true)}
              variant="outline"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                 
                  <div>
                    <p className="text-2xl font-bold">{statistics.totalLogs.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
            
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{statistics.successCount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Success</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
             
                  <div>
                    <p className="text-2xl font-bold text-red-600">{statistics.failureCount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Failures</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{statistics.warningCount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Warnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search users, actions, details..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">User Type</label>
                <Select value={userType} onValueChange={setUserType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All User Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All User Types</SelectItem>
                    {Object.entries(USER_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button onClick={handleFilterChange}>Apply Filters</Button>
              <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              {pagination && `Showing ${logs.length} of ${pagination.total} events`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resource</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <Database className="w-12 h-12 text-gray-400" />
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">No Audit Logs Yet</h3>
                            <p className="text-gray-500 mt-1">
                              Audit logs will appear here as users interact with the system.
                              <br />
                              Try logging in, creating courses, or performing other actions to generate audit entries.
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const categoryConfig = CATEGORY_CONFIG[log.category];
                      const statusConfig = STATUS_CONFIG[log.status];
                      const userTypeConfig = USER_TYPE_CONFIG[log.userType];
                      const CategoryIcon = categoryConfig.icon;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={log._id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {format(new Date(log.timestamp), 'yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${log.userName}`} />
                              <AvatarFallback className="text-xs">
                                {log.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{log.userName}</div>
                              <div className="text-sm text-gray-500">{log.userEmail}</div>
                              <Badge variant="outline" className={`text-xs mt-1 ${userTypeConfig.color}`}>
                                {userTypeConfig.label}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`flex items-center gap-1 w-fit ${categoryConfig.color}`}>
                            <CategoryIcon className="w-3 h-3" />
                            {categoryConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionVariant(log.action)} className="font-medium">
                            {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm">{log.details}</div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                View metadata
                              </summary>
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`flex items-center gap-1 w-fit ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.resourceType && log.resourceName ? (
                            <div>
                              <Badge variant="secondary" className="text-xs">
                                {log.resourceType}
                              </Badge>
                              <div className="text-sm mt-1 font-medium">{log.resourceName}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {logs.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
                <p className="text-gray-600">Try adjusting your filters or check back later for new activity.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
