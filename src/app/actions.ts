"use server";

/**
 * Server Actions for Admin Dashboard
 * This file contains AI-related server actions that run on the Next.js server
 * Auth-related actions have been migrated to Express backend
 */

import { suggestTags } from "@/ai/flows/content-tagging";
import type { ContentTaggingInput } from "@/ai/flows/content-tagging";
import { getDashboardInsights } from "@/ai/flows/dashboard-insights";
import type { DashboardInsightsInput } from "@/ai/flows/dashboard-insights";
import { getTaskSuggestions } from "@/ai/flows/task-suggestions";
import type { TaskSuggestionsInput } from "@/ai/flows/task-suggestions";

import dbConnect from "@/lib/mongoose";
import Course from "@/lib/models/Course";
import Student from "@/lib/models/Student";
import CourseEnrollment from "@/lib/models/CourseEnrollment";
import Transaction from "@/lib/models/Transaction";

// ---------------------------- SUGGEST TAGS ----------------------------
export async function handleSuggestTags(data: ContentTaggingInput) {
  try {
    const result = await suggestTags(data);
    return { success: true, tags: result.tags };
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}


// ---------------------------- DASHBOARD INSIGHTS ----------------------------
export async function handleGetDashboardInsights() {
  try {
    await dbConnect();

    // Get real metrics from database
    const totalUsers = await Student.countDocuments();
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersToday = await Student.countDocuments({
      lastLoginAt: { $gte: last24Hours }
    });

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newSignupsLastWeek = await Student.countDocuments({
      createdAt: { $gte: lastWeek }
    });

    const coursesPublished = await Course.countDocuments();

    // Get top courses by enrollment
    const topCoursesData = await CourseEnrollment.aggregate([
      {
        $group: {
          _id: '$courseId',
          engagement: { $sum: 1 }
        }
      },
      {
        $sort: { engagement: -1 }
      },
      {
        $limit: 3
      }
    ]);

    // Get course names
    const courseIds = topCoursesData.map(tc => tc._id);
    const courses = await Course.find({ _id: { $in: courseIds } });
    const courseMap = courses.reduce((map, course) => {
      map[course._id.toString()] = course.title;
      return map;
    }, {} as Record<string, string>);

    const topCourses = topCoursesData.map(tc => ({
      name: courseMap[tc._id] || 'Unknown Course',
      engagement: tc.engagement
    }));

    const realInput: DashboardInsightsInput = {
      totalUsers,
      activeUsersToday,
      newSignupsLastWeek,
      coursesPublished,
      topCourses,
    };

    let result;
    try {
      result = await getDashboardInsights(realInput);
    } catch (aiError) {
      console.warn("AI insights error, using calculated metrics fallback:", aiError);
      result = {
        summary: `Platform currently serves ${totalUsers} registered students across ${coursesPublished} published courses, with ${newSignupsLastWeek} new signups this week.`,
        highlights: [
          `Total active platform enrollment reached ${totalUsers} registered students.`,
          coursesPublished > 0 ? `${coursesPublished} courses are published and accessible to students.` : `No courses published yet.`,
          topCourses.length > 0 ? `Top engaging course is "${topCourses[0].name}" with ${topCourses[0].engagement} enrollments.` : `Track user enrollments to identify top courses.`
        ],
        suggestions: [
          `Promote high-performing courses to encourage active student signups.`,
          `Keep course notes and curriculum updated for active study groups.`
        ]
      };
    }

    return { success: true, insights: result };
  } catch (error) {
    console.error("Error getting dashboard insights:", error);
    return { success: false, error: "An unexpected error occurred while generating insights." };
  }
}

// ---------------------------- TASK SUGGESTIONS ----------------------------
export async function handleGetTaskSuggestions() {
  try {
    await dbConnect();

    // Get real metrics for task suggestions
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Inactive users (users who haven't logged in for 30 days)
    const inactiveUserCount = await Student.countDocuments({
      lastLoginAt: { $lt: thirtyDaysAgo }
    });

    // Unreviewed content (courses that might need review - using courses without recent updates as proxy)
    const unreviewedContentCount = await Course.countDocuments({
      updatedAt: { $lt: thirtyDaysAgo }
    });

    // Failed payments (transactions with failed status)
    const failedPaymentsCount = await Transaction.countDocuments({
      status: 'failed'
    });

    const realInput: TaskSuggestionsInput = {
      inactiveUserCount,
      unreviewedContentCount,
      failedPaymentsCount,
    };

    let result;
    try {
      result = await getTaskSuggestions(realInput);
    } catch (aiError) {
      console.warn("AI task suggestions error, using calculated metrics fallback:", aiError);
      const tasks = [];
      if (failedPaymentsCount > 0) {
        tasks.push({
          title: "Resolve Failed Transactions",
          description: `${failedPaymentsCount} transactions encountered payment issues. Review them to assist students.`,
          actionLabel: "View Orders",
          actionLink: "/dashboard/orders-payments"
        });
      }
      if (inactiveUserCount > 0) {
        tasks.push({
          title: "Re-engage Inactive Students",
          description: `${inactiveUserCount} students have not logged in over 30 days.`,
          actionLabel: "View Students",
          actionLink: "/dashboard/users"
        });
      }
      if (unreviewedContentCount > 0) {
        tasks.push({
          title: "Review Course Curriculum",
          description: `${unreviewedContentCount} courses have not received updates recently.`,
          actionLabel: "View Courses",
          actionLink: "/dashboard/courses"
        });
      }
      result = { tasks };
    }

    return { success: true, suggestions: result };
  } catch (error) {
    console.error("Error getting task suggestions:", error);
    return { success: false, error: "An unexpected error occurred while generating task suggestions." };
  }
}

// ==================== AUTH FUNCTIONS REMOVED ====================
// All authentication logic has been migrated to Express backend
// Use the following endpoints instead:
// - POST /api/admin/auth/login (regular admins)
// - POST /api/admin/auth/verify-otp (regular admins)
// - POST /api/admin/admin-auth/login (system admin)
// - POST /api/admin/admin-auth/verify-otp (system admin)
