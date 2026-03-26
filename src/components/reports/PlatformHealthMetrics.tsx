import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/reports-utils';

interface PlatformHealthMetricsProps {
  data: any;
  metrics: any;
}

export const PlatformHealthMetrics: React.FC<PlatformHealthMetricsProps> = ({
  data,
  metrics
}) => {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Platform Health Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex justify-between items-center p-3 bg-white rounded-md border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Enrollment Rate</span>
            <span className="text-sm font-medium text-slate-900">
              {metrics.totalEnrollments > 0
                ? ((metrics.totalEnrollments / metrics.totalUsers) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-md border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Avg Revenue per User</span>
            <span className="text-sm font-medium text-slate-900">
              {metrics.totalUsers > 0
                ? formatCurrency(metrics.totalRevenue / metrics.totalUsers)
                : formatCurrency(0)}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-md border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Course Completion Rate</span>
            <span className="text-sm font-medium text-slate-900">
              {metrics.totalEnrollments > 0
                ? ((metrics.completedCourses / metrics.totalEnrollments) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-md border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Transaction Success Rate</span>
            <span className="text-sm font-medium text-slate-900">
              {metrics.totalTransactions > 0
                ? ((metrics.totalTransactions / Math.max(metrics.totalEnrollments, 1)) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-md border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Avg Transaction Value</span>
            <span className="text-sm font-medium text-slate-900">
              {metrics.totalTransactions > 0
                ? formatCurrency(metrics.totalRevenue / metrics.totalTransactions)
                : formatCurrency(0)}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-md border border-slate-200">
            <span className="text-sm font-medium text-slate-700">User Engagement Rate</span>
            <span className="text-sm font-medium text-slate-900">
              {data?.weeklyActiveUsersData?.length > 0
                ? ((data.weeklyActiveUsersData.reduce((sum: number, day: any) => sum + day.users, 0) / 7 / metrics.totalUsers) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded-md border border-slate-200">
          <h4 className="font-medium text-sm text-slate-900 mb-2">Period Summary</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Over the selected period, the platform has seen {metrics.newUsersThisPeriod} new user registrations,
            processed {metrics.totalTransactions} transactions generating {formatCurrency(metrics.totalRevenue)} in revenue,
            and maintained an average of {data?.weeklyActiveUsersData?.length > 0 ? Math.round(data.weeklyActiveUsersData.reduce((sum: number, day: any) => sum + day.users, 0) / 7) : 0} daily active users.
          </p>
        </div>
        <p className="text-xs text-slate-500">Key performance indicators and engagement metrics across the selected time period.</p>
      </CardContent>
    </Card>
  );
};