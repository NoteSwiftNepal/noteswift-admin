// Main formatCurrency function
export const formatCurrency = (amount: number) => {
  return `Rs. ${amount.toLocaleString('en-IN')}`;
};

export interface ReportsData {
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

export interface ChartInsight {
  type: 'metric' | 'highlight' | 'progress' | 'trend' | 'info';
  label: string;
  value: string;
  subvalue?: string;
  progress?: number;
  trend?: 'positive' | 'negative' | 'neutral';
  icon?: any;
}

export interface ChartInsightsData {
  title: string;
  keyMetric: {
    value: string;
    label: string;
    trend: 'up' | 'down' | 'stable';
  };
  insights: ChartInsight[];
}

// Helper function to get dynamic chart titles based on period
export const getDynamicTitle = (chartType: string, selectedPeriod: string) => {
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

// Helper function to generate personalized insights for each chart
export const getChartInsights = (chartType: string, chartData: any[], metrics: any): ChartInsightsData | null => {
  if (!chartData || chartData.length === 0) return null;

  switch (chartType) {
    case 'userGrowth':
      const totalNewUsers = chartData.reduce((sum, item) => sum + (item.newUsers || 0), 0);
      const avgNewUsers = Math.round(totalNewUsers / chartData.length);
      const maxUsers = Math.max(...chartData.map(item => item.newUsers || 0));
      const growthTrend = chartData.length > 1 && chartData[0].newUsers > 0 ?
        ((chartData[chartData.length - 1].newUsers - chartData[0].newUsers) / chartData[0].newUsers * 100) : 0;
      const peakMonth = chartData.find(item => item.newUsers === maxUsers)?.month;

      return {
        title: "User Acquisition Analytics",
        keyMetric: {
          value: totalNewUsers.toLocaleString(),
          label: "Total Registrations",
          trend: growthTrend > 0 ? 'up' : growthTrend < 0 ? 'down' : 'stable'
        },
        insights: [
          {
            type: 'metric',
            label: 'Average Monthly Growth',
            value: `${avgNewUsers} users/month`,
            subvalue: `Consistent registration pattern across ${chartData.length} months of data`,
            icon: null // Will be set by component
          },
          {
            type: 'highlight',
            label: 'Peak Registration Month',
            value: `${peakMonth}: ${maxUsers} registrations`,
            subvalue: 'Highest user acquisition period with optimal marketing performance and user engagement',
            icon: null
          },
          {
            type: 'trend',
            label: 'Growth Momentum Analysis',
            value: `${growthTrend > 0 ? '+' : ''}${growthTrend.toFixed(1)}% overall trend`,
            trend: growthTrend > 0 ? 'positive' : growthTrend < 0 ? 'negative' : 'neutral',
            subvalue: growthTrend > 10 ? 'Exceptional growth trajectory indicates highly effective user acquisition strategies and market demand' : growthTrend > 0 ? 'Steady upward trend with opportunities for strategic scaling and optimization' : 'Growth challenges identified - requires focused intervention in marketing and user experience'
          },
          {
            type: 'info',
            label: 'Strategic Growth Insights',
            value: growthTrend > 10 ? 'Outstanding performance - current strategies are highly effective and should be scaled' : growthTrend > 0 ? 'Stable growth foundation with clear opportunities for expansion and improvement' : 'Critical attention needed - comprehensive review of acquisition channels and user onboarding required',
            subvalue: 'Focus on retention strategies and lifetime value optimization to maximize growth impact'
          }
        ]
      };

    case 'courseEnrollment':
      const totalEnrollments = chartData.reduce((sum, item) => sum + (item.value || 0), 0);
      const topCourse = chartData.reduce((max, item) => (item.value || 0) > (max.value || 0) ? item : max, chartData[0]);
      const enrollmentRate = metrics?.totalUsers ? ((totalEnrollments / metrics.totalUsers) * 100).toFixed(1) : '0';
      const avgEnrollments = Math.round(totalEnrollments / chartData.length);

      return {
        title: "Course Popularity Analytics",
        keyMetric: {
          value: totalEnrollments.toLocaleString(),
          label: "Total Enrollments",
          trend: 'up'
        },
        insights: [
          {
            type: 'metric',
            label: 'Top Performing Course',
            value: `${topCourse?.name || 'N/A'}`,
            subvalue: `${topCourse?.value || 0} enrollments - represents highest student interest and engagement`,
            icon: null
          },
          {
            type: 'progress',
            label: 'Student Enrollment Rate',
            value: `${enrollmentRate}% of total users enrolled`,
            progress: Math.min(parseFloat(enrollmentRate) / 100, 1),
            subvalue: 'Percentage of registered users actively participating in courses'
          },
          {
            type: 'metric',
            label: 'Average Course Popularity',
            value: `${avgEnrollments} enrollments per course`,
            subvalue: `Across ${chartData.length} available courses with varying enrollment distribution`,
            icon: null
          },
          {
            type: 'info',
            label: 'Content Engagement Strategy',
            value: `${chartData.length} courses available for enrollment with diverse subject coverage`,
            subvalue: parseFloat(enrollmentRate) > 50 ? 'Excellent engagement levels - content strategy highly effective' : parseFloat(enrollmentRate) > 25 ? 'Good participation rates with opportunities for growth' : 'Enrollment optimization needed - review course offerings and marketing'
          }
        ]
      };

    case 'coursesPublished':
      const totalCourses = chartData.reduce((sum, item) => sum + (item.courses || 0), 0);
      const avgCourses = (totalCourses / chartData.length).toFixed(1);
      const maxCourses = Math.max(...chartData.map(item => item.courses || 0));
      const productiveMonth = chartData.find(item => item.courses === maxCourses)?.month;
      const activeMonths = chartData.filter(item => item.courses > 0).length;

      return {
        title: "Content Creation Analytics",
        keyMetric: {
          value: totalCourses.toString(),
          label: "Courses Published",
          trend: 'up'
        },
        insights: [
          {
            type: 'metric',
            label: 'Monthly Publishing Average',
            value: `${avgCourses} courses per month`,
            subvalue: `Consistent content development pace across ${chartData.length} months of activity`,
            icon: null
          },
          {
            type: 'highlight',
            label: 'Peak Productivity Month',
            value: `${productiveMonth}`,
            subvalue: `${maxCourses} courses published - represents highest content creation output and team performance`,
            icon: null
          },
          {
            type: 'progress',
            label: 'Content Publishing Consistency',
            value: `${activeMonths}/${chartData.length} months with active publishing`,
            progress: activeMonths / chartData.length,
            subvalue: 'Regular content release pattern essential for maintaining student engagement'
          },
          {
            type: 'trend',
            label: 'Content Development Velocity',
            value: parseFloat(avgCourses) > 2 ? 'Exceptional content production rate' : parseFloat(avgCourses) > 1 ? 'Strong publishing momentum maintained' : 'Content creation pace needs strategic acceleration',
            trend: parseFloat(avgCourses) > 1.5 ? 'positive' : 'neutral',
            subvalue: parseFloat(avgCourses) > 2 ? 'Outstanding productivity - content pipeline highly efficient' : parseFloat(avgCourses) > 1 ? 'Good content velocity with opportunities for scaling' : 'Content development requires focused improvement initiatives'
          }
        ]
      };

    case 'weeklyActive':
      const totalActive = chartData.reduce((sum, item) => sum + (item.users || 0), 0);
      const avgDailyActive = Math.round(totalActive / chartData.length);
      const maxActive = Math.max(...chartData.map(item => item.users || 0));
      const peakDay = chartData.find(item => item.users === maxActive)?.day;
      const engagementRate = metrics?.totalUsers ? ((avgDailyActive / metrics.totalUsers) * 100).toFixed(1) : '0';
      const variability = maxActive > avgDailyActive * 1.5 ? 'high' : maxActive > avgDailyActive * 1.2 ? 'moderate' : 'low';

      return {
        title: "User Engagement Analytics",
        keyMetric: {
          value: avgDailyActive.toLocaleString(),
          label: "Daily Active Users",
          trend: 'up'
        },
        insights: [
          {
            type: 'metric',
            label: 'Peak Activity Period',
            value: `${peakDay}`,
            subvalue: `${maxActive.toLocaleString()} active users - represents maximum platform utilization and engagement`,
            icon: null
          },
          {
            type: 'progress',
            label: 'User Engagement Rate',
            value: `${engagementRate}% of total registered users`,
            progress: Math.min(parseFloat(engagementRate) / 100, 1),
            subvalue: 'Percentage of user base actively engaging with platform content and features'
          },
          {
            type: 'metric',
            label: 'Total Session Volume',
            value: totalActive.toLocaleString(),
            subvalue: `Across ${chartData.length} days of tracked user activity and platform interaction`,
            icon: null
          },
          {
            type: 'info',
            label: 'Engagement Pattern Analysis',
            value: variability === 'high' ? 'Significant activity fluctuations detected - strategic optimization of peak usage times recommended' : variability === 'moderate' ? 'Moderate engagement variations observed with opportunities for consistency improvement' : 'Strong consistent engagement pattern - excellent user retention and platform stickiness demonstrated',
            trend: variability === 'low' ? 'positive' : 'neutral',
            subvalue: variability === 'high' ? 'Focus on understanding peak drivers and optimizing off-peak engagement strategies' : 'Stable engagement foundation provides solid base for growth initiatives'
          }
        ]
      };

    case 'revenue':
      const totalRevenue = chartData.reduce((sum, item) => sum + (item.revenue || 0), 0);
      const avgDailyRevenue = Math.round(totalRevenue / chartData.length);
      const maxRevenue = Math.max(...chartData.map(item => item.revenue || 0));
      const totalTransactions = chartData.reduce((sum, item) => sum + (item.transactions || 0), 0);
      const avgTransactionValue = totalTransactions > 0 ? (totalRevenue / totalTransactions) : 0;
      const revenueTrend = chartData.length > 1 && chartData[chartData.length - 1].revenue > chartData[0].revenue ? 'growing' : 'stable';

      return {
        title: "Revenue Performance Analytics",
        keyMetric: {
          value: formatCurrency(totalRevenue),
          label: "Total Revenue",
          trend: revenueTrend === 'growing' ? 'up' : 'stable'
        },
        insights: [
          {
            type: 'metric',
            label: 'Average Daily Revenue Generation',
            value: formatCurrency(avgDailyRevenue),
            subvalue: `Consistent revenue flow across ${chartData.length} days of business operations`,
            icon: null
          },
          {
            type: 'highlight',
            label: 'Peak Revenue Performance',
            value: formatCurrency(maxRevenue),
            subvalue: 'Highest single-day revenue achievement with optimal business conditions and customer spending',
            icon: null
          },
          {
            type: 'metric',
            label: 'Average Transaction Value',
            value: formatCurrency(avgTransactionValue),
            subvalue: `Based on ${totalTransactions.toLocaleString()} total transactions processed during the period`,
            icon: null
          },
          {
            type: 'trend',
            label: 'Revenue Growth Trajectory',
            value: revenueTrend === 'growing' ? 'Positive revenue growth trajectory established' : 'Stable revenue performance maintained',
            trend: revenueTrend === 'growing' ? 'positive' : 'neutral',
            subvalue: revenueTrend === 'growing' ? 'Strong upward momentum in revenue generation indicates successful business scaling and market expansion' : 'Consistent revenue stability achieved - focus on optimizing transaction volumes and average order values for growth'
          }
        ]
      };

    default:
      return null;
  }
};