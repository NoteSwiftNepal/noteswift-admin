
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Activity, DollarSign, BookOpen, Calendar, RefreshCw, FileText, FileSpreadsheet, LineChart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { UserGrowthChart } from '@/components/reports/UserGrowthChart';
import { CourseEnrollmentChart } from '@/components/reports/CourseEnrollmentChart';
import { WeeklyActiveUsersChart } from '@/components/reports/WeeklyActiveUsersChart';
import { CoursesPublishedChart } from '@/components/reports/CoursesPublishedChart';
import { RevenueChart } from '@/components/reports/RevenueChart';
import { PlatformHealthMetrics } from '@/components/reports/PlatformHealthMetrics';
import { formatCurrency } from '@/lib/reports-utils';

interface ReportsData {
  period: string;
  metrics: {
    totalUsers: number;
    newUsersThisPeriod: number;
    totalCourses: number;
    totalEnrollments: number;
    totalTransactions: number;
    totalRevenue: number;
    completedCourses: number;
  };
  userGrowthData: Array<{
    month: string;
    newUsers: number;
  }>;
  courseEnrollmentData: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  weeklyActiveUsersData: Array<{
    day: string;
    users: number;
  }>;
  coursesPublishedData: Array<{
    month: string;
    courses: number;
  }>;
  revenueTrendData: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}



export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  const fetchReportsData = async (selectedPeriod = period) => {
    try {
      setRefreshing(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      console.log('🔍 Fetching reports data for period:', selectedPeriod);
      const url = `${API_ENDPOINTS.REPORTS.OVERVIEW}?period=${selectedPeriod}`;
      console.log('📡 URL:', url);
      const response = await fetch(url, createFetchOptions('GET'));
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Reports data received:', result);

      if (result.success) {
        setData(result.data);
        toast({
          title: "Success",
          description: "Reports data loaded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to fetch reports data",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch reports data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    fetchReportsData(newPeriod);
  };

  // Helper function to get dynamic chart titles based on period
  const getDynamicTitle = (chartType: string, selectedPeriod: string) => {
    const periodLabels = {
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '60d': 'Last 60 Days',
      '90d': 'Last 90 Days',
      '1y': 'Last Year',
      'all': 'All Time'
    };

    const periodLabel = periodLabels[selectedPeriod as keyof typeof periodLabels] || 'Last 6 Months';

    switch (chartType) {
      case 'userGrowth':
        return `User Growth (${periodLabel})`;
      case 'coursesPublished':
        return `Courses Published (${periodLabel})`;
      case 'weeklyActive':
        return selectedPeriod === '7d' ? 'Daily Active Users (Last 7 Days)' : `Weekly Active Users (${periodLabel})`;
      case 'revenue':
        return `Revenue Performance (${periodLabel})`;
      default:
        return chartType;
    }
  };

  // Helper function to toggle insight expansion
  const toggleInsight = (chartType: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(chartType)) {
      newExpanded.delete(chartType);
    } else {
      newExpanded.add(chartType);
    }
    setExpandedInsights(newExpanded);
  };

  const exportToCSV = () => {
    if (!data) return;

    setExporting(true);
    try {
      const csvData = [
        // Metrics
        ['Metric', 'Value'],
        ['Total Users', data.metrics.totalUsers],
        ['New Users This Period', data.metrics.newUsersThisPeriod],
        ['Total Courses', data.metrics.totalCourses],
        ['Total Enrollments', data.metrics.totalEnrollments],
        ['Total Transactions', data.metrics.totalTransactions],
        ['Total Revenue', data.metrics.totalRevenue],
        ['Completed Courses', data.metrics.completedCourses],
        [],
        // User Growth Data
        ['Month', 'New Users'],
        ...data.userGrowthData.map(item => [item.month, item.newUsers]),
        [],
        // Course Enrollment Data
        ['Course', 'Enrollments'],
        ...data.courseEnrollmentData.map(item => [item.name, item.value]),
        [],
        // Weekly Active Users
        ['Day', 'Active Users'],
        ...data.weeklyActiveUsersData.map(item => [item.day, item.users]),
        [],
        // Courses Published
        ['Month', 'Courses Published'],
        ...data.coursesPublishedData.map(item => [item.month, item.courses]),
        [],
        // Revenue Trend
        ['Date', 'Revenue', 'Transactions'],
        ...data.revenueTrendData.map(item => [item.date, item.revenue, item.transactions])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reports-${period}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "CSV file has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export CSV file.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!data) return;

    setExporting(true);
    try {
      // For PDF export, we'll create a simple text-based report
      const reportContent = `
REPORTS & ANALYTICS - ${period.toUpperCase()}
Generated on: ${new Date().toLocaleDateString()}

KEY METRICS:
- Total Users: ${data.metrics.totalUsers.toLocaleString()}
- New Users This Period: ${data.metrics.newUsersThisPeriod.toLocaleString()}
- Total Courses: ${data.metrics.totalCourses}
- Total Enrollments: ${data.metrics.totalEnrollments.toLocaleString()}
- Total Transactions: ${data.metrics.totalTransactions}
- Total Revenue: ${formatCurrency(data.metrics.totalRevenue)}
- Completed Courses: ${data.metrics.completedCourses}

PLATFORM HEALTH:
- Enrollment Rate: ${data.metrics.totalEnrollments > 0 ? ((data.metrics.totalEnrollments / data.metrics.totalUsers) * 100).toFixed(1) : 0}%
- Average Revenue per User: ${data.metrics.totalUsers > 0 ? formatCurrency(data.metrics.totalRevenue / data.metrics.totalUsers) : formatCurrency(0)}
- Course Completion Rate: ${data.metrics.totalEnrollments > 0 ? ((data.metrics.completedCourses / data.metrics.totalEnrollments) * 100).toFixed(1) : 0}%
- Transaction Success Rate: ${data.metrics.totalTransactions > 0 ? ((data.metrics.totalTransactions / Math.max(data.metrics.totalEnrollments, 1)) * 100).toFixed(1) : 0}%

USER GROWTH TREND:
${data.userGrowthData.map(item => `${item.month}: ${item.newUsers} new users`).join('\n')}

TOP COURSES BY ENROLLMENT:
${data.courseEnrollmentData.map(item => `${item.name}: ${item.value} enrollments`).join('\n')}

WEEKLY ACTIVE USERS:
${data.weeklyActiveUsersData.map(item => `${item.day}: ${item.users} active users`).join('\n')}

COURSES PUBLISHED:
${data.coursesPublishedData.map(item => `${item.month}: ${item.courses} courses`).join('\n')}

REVENUE TREND:
${data.revenueTrendData.map(item => `${item.date}: ${formatCurrency(item.revenue)} (${item.transactions} transactions)`).join('\n')}
      `;

      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reports-${period}-${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "Report file has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report file.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <LineChart className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-semibold text-slate-900">Reports & Analytics</h1>
            </div>
            <p className="mt-2  text-slate-600">Comprehensive platform analytics and performance metrics</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-6 text-lg text-slate-600">Loading analytics data...</p>
          <p className="mt-2 text-sm text-slate-500">Fetching user metrics, course data, and performance indicators</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <LineChart className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-semibold text-slate-900">Reports & Analytics</h1>
            </div>
            <p className="mt-2 text-slate-600">Comprehensive platform analytics and performance metrics</p>
          </div>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-slate-600">Failed to load reports data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, userGrowthData, courseEnrollmentData, weeklyActiveUsersData, coursesPublishedData, revenueTrendData } = data || {};
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <LineChart className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-slate-900">Reports & Analytics</h1>
          </div>
          <p className="mt-2 text-slate-600">Comprehensive platform analytics and performance metrics</p>
        </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-40 h-9">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="60d">Last 60 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => fetchReportsData()}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="h-9"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={exporting || !data}
              variant="outline"
              size="sm"
              className="h-9"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={exporting || !data}
              variant="outline"
              size="sm"
              className="h-9"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-slate-900">{metrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">
                +{metrics.newUsersThisPeriod} new this period
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-slate-900">{formatCurrency(metrics.totalRevenue)}</div>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.totalTransactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-slate-900">{metrics.totalCourses}</div>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.totalEnrollments} total enrollments
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-slate-900">
                {weeklyActiveUsersData.length > 0 ? Math.round(weeklyActiveUsersData.reduce((sum, day) => sum + day.users, 0) / 7) : 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Daily average this period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth */}
          <UserGrowthChart
            data={data}
            userGrowthData={userGrowthData}
            period={period}
            getDynamicTitle={getDynamicTitle}
            expandedInsights={expandedInsights}
            toggleInsight={toggleInsight}
            metrics={data?.metrics}
          />

          {/* Course Enrollment Breakdown */}
          <CourseEnrollmentChart
            data={data}
            courseEnrollmentData={courseEnrollmentData}
            expandedInsights={expandedInsights}
            toggleInsight={toggleInsight}
            metrics={data?.metrics}
          />
          
          {/* Weekly Active Users */}
          <WeeklyActiveUsersChart
            data={data}
            weeklyActiveUsersData={weeklyActiveUsersData}
            period={period}
            getDynamicTitle={getDynamicTitle}
            expandedInsights={expandedInsights}
            toggleInsight={toggleInsight}
            metrics={data?.metrics}
          />

          {/* Courses Published */}
          <CoursesPublishedChart
            data={data}
            coursesPublishedData={coursesPublishedData}
            period={period}
            getDynamicTitle={getDynamicTitle}
            expandedInsights={expandedInsights}
            toggleInsight={toggleInsight}
            metrics={data?.metrics}
          />

          {/* Revenue Trend */}
          <RevenueChart
            data={data}
            revenueTrendData={revenueTrendData}
            period={period}
            getDynamicTitle={getDynamicTitle}
            expandedInsights={expandedInsights}
            toggleInsight={toggleInsight}
            metrics={data?.metrics}
          />

          {/* Platform Health */}
          <PlatformHealthMetrics
            data={data}
            metrics={metrics}
          />
        </div>
    </div>
  );
}
