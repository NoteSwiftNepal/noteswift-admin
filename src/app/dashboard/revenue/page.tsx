'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  Users,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface RevenueData {
  period: string;
  overview: {
    totalRevenue: number;
    pendingRevenue: number;
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    cancelledTransactions: number;
    totalCodes: number;
    usedCodes: number;
    unusedCodes: number;
    expiredCodes: number;
    totalEnrollments: number;
  };
  revenueByMethod: Record<string, number>;
  revenueByCourse: Record<string, number>;
  revenueTrendData: Array<{
    date: string;
    revenue: number;
  }>;
  recentTransactions: Array<{
    _id: string;
    buyerName: string;
    contact: string;
    courseName: string;
    amount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }>;
  recentCodes: Array<{
    _id: string;
    code: string;
    courseName: string;
    issuedTo?: string;
    issuedByAdminId?: string;
    issuedByRole?: string;
    isUsed: boolean;
    usedTimestamp?: string;
    expiresOn?: string;
    createdAt: string;
  }>;
  courseMap: Record<string, any>;
}

export default function RevenuePage() {
  const { toast } = useToast();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchRevenueData = async (selectedPeriod = period) => {
    try {
      setRefreshing(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(`${API_ENDPOINTS.REVENUE.OVERVIEW}?period=${selectedPeriod}`, createFetchOptions('GET'));
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch revenue data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch revenue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    fetchRevenueData(newPeriod);
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN')}`;
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

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
 <div>
           <div className="flex items-center gap-2">
                      <CreditCard className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">Revenue & Finance Dashboard</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Comprehensive financial monitoring across the entire platform</p>
        </div>        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-6 text-lg text-muted-foreground">Loading financial data...</p>
          <p className="mt-2 text-sm text-muted-foreground">Fetching transactions, codes, and revenue metrics</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-8">
         <div>
           <div className="flex items-center gap-2">
                      <CreditCard className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">Revenue & Finance Dashboard</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Comprehensive financial monitoring across the entire platform</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Failed to load revenue data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, revenueByMethod, revenueByCourse, revenueTrendData, recentTransactions } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
           <div>
           <div className="flex items-center gap-2">
                      <CreditCard className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-bold text-gray-900">Revenue & Finance Dashboard</CardTitle>
                  </div>
          <p className="text-gray-600 mt-2">Comprehensive financial monitoring across the entire platform</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => fetchRevenueData()}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {overview.completedTransactions} completed transactions
            </p>
          </CardContent>
        </Card>

        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(overview.pendingRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {overview.pendingTransactions} pending transactions
            </p>
          </CardContent>
        </Card>

        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overview.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              Students enrolled in courses
            </p>
          </CardContent>
        </Card>

        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overview.totalTransactions > 0
                ? ((overview.completedTransactions / overview.totalTransactions) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Transaction completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transaction Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="font-medium">{overview.completedTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-medium">{overview.pendingTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cancelled</span>
              <span className="font-medium">{overview.cancelledTransactions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This Period</span>
              <span className="font-medium text-blue-600">{formatCurrency(overview.totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Daily</span>
              <span className="font-medium text-blue-600">
                {revenueTrendData.length > 0
                  ? formatCurrency(overview.totalRevenue / revenueTrendData.length)
                  : formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peak Day</span>
              <span className="font-medium text-blue-600">
                {revenueTrendData.length > 0
                  ? formatCurrency(Math.max(...revenueTrendData.map(d => d.revenue)))
                  : formatCurrency(0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue by Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(revenueByMethod).map(([method, amount]) => (
              <div key={method} className="flex justify-between items-center">
                <span className="text-sm capitalize">{method.replace('-', ' ')}</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(revenueByCourse)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([course, amount]) => (
                  <div key={course} className="flex justify-between items-center">
                    <span className="text-sm truncate mr-2" title={course}>
                      {course.length > 15 ? course.substring(0, 15) + '...' : course}
                    </span>
                    <span className="font-medium text-blue-600">{formatCurrency(amount)}</span>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest payment transactions across the platform</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction._id}>
                  <TableCell>
                    <div className="font-medium">{transaction.buyerName}</div>
                    <div className="text-sm text-muted-foreground">{transaction.contact}</div>
                  </TableCell>
                  <TableCell className="font-medium">{transaction.courseName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {transaction.paymentMethod.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-blue-600">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.status === 'completed' ? 'default' :
                        transaction.status === 'pending-code-redemption' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {transaction.status === 'pending-code-redemption' ? 'Pending' : transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revenue Trend Chart */}
      <Card >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Revenue Trends
          </CardTitle>
          <CardDescription>Daily revenue growth and performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Revenue Breakdown
            </CardTitle>
            <CardDescription>Revenue distribution by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(revenueByMethod).map(([method, amount]) => {
                const percentage = (amount / overview.totalRevenue) * 100;
                return (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="capitalize">{method.replace('-', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-blue-600">{formatCurrency(amount)}</div>
                      <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Platform Health
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Transaction Success Rate</span>
                <span className="font-medium text-blue-600">
                  {overview.totalTransactions > 0
                    ? ((overview.completedTransactions / overview.totalTransactions) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Revenue per Transaction</span>
                <span className="font-medium text-blue-600">
                  {overview.completedTransactions > 0
                    ? formatCurrency(overview.totalRevenue / overview.completedTransactions)
                    : formatCurrency(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Transaction Value</span>
                <span className="font-medium text-blue-600">
                  {overview.completedTransactions > 0
                    ? formatCurrency(overview.totalRevenue / overview.completedTransactions)
                    : formatCurrency(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Enrollment Rate</span>
                <span className="font-medium text-blue-600">
                  {overview.totalTransactions > 0
                    ? ((overview.totalEnrollments / overview.totalTransactions) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
