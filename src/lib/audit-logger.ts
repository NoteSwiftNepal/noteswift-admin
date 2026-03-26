import { NextRequest } from 'next/server';

export interface AuditLogData {
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
  status?: 'success' | 'failure' | 'warning';
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    location?: string;
    oldValue?: any;
    newValue?: any;
    additionalData?: Record<string, any>;
    [key: string]: any; // Allow additional properties
  };
}

class AuditLogger {
  private async logToAPI(logData: AuditLogData): Promise<void> {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(API_ENDPOINTS.AUDIT_LOGS.CREATE, createFetchOptions('POST', logData));

      if (!response.ok) {
        console.error('Failed to log audit event:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  // Authentication & Access Logs
  async logLogin(userId: string, userType: 'admin' | 'teacher' | 'student', userName: string, userEmail: string, success: boolean, metadata?: any) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      userEmail,
      action: success ? 'login_success' : 'login_failure',
      category: 'authentication',
      details: success ? `User ${userName} logged in successfully` : `Failed login attempt for ${userEmail}`,
      status: success ? 'success' : 'failure',
      metadata
    });
  }

  async logLogout(userId: string, userType: 'admin' | 'teacher' | 'student', userName: string, userEmail: string) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      userEmail,
      action: 'logout',
      category: 'authentication',
      details: `User ${userName} logged out`,
      status: 'success'
    });
  }

  async logPasswordReset(userEmail: string, success: boolean) {
    await this.logToAPI({
      userType: 'system',
      userName: 'System',
      userEmail,
      action: success ? 'password_reset_success' : 'password_reset_failure',
      category: 'authentication',
      details: success ? `Password reset successful for ${userEmail}` : `Password reset failed for ${userEmail}`,
      status: success ? 'success' : 'failure'
    });
  }

  async logUserRegistration(userId: string, userType: 'teacher' | 'student', userName: string, userEmail: string) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      userEmail,
      action: 'user_registration',
      category: 'authentication',
      details: `New ${userType} registered: ${userName} (${userEmail})`,
      status: 'success'
    });
  }

  async logAccountLock(userId: string, userType: 'admin' | 'teacher' | 'student', userName: string, userEmail: string, locked: boolean) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      userEmail,
      action: locked ? 'account_locked' : 'account_unlocked',
      category: 'authentication',
      details: `Account ${locked ? 'locked' : 'unlocked'} for ${userName}`,
      status: locked ? 'warning' : 'success'
    });
  }

  // User Management Activities
  async logUserCreated(adminId: string, adminName: string, targetUserId: string, targetUserType: 'teacher' | 'student', targetUserName: string) {
    await this.logToAPI({
      userId: adminId,
      userType: 'admin',
      userName: adminName,
      action: 'user_created',
      category: 'user_management',
      resourceType: targetUserType,
      resourceId: targetUserId,
      resourceName: targetUserName,
      details: `Admin ${adminName} created ${targetUserType}: ${targetUserName}`,
      status: 'success'
    });
  }

  async logUserUpdated(adminId: string, adminName: string, targetUserId: string, targetUserType: 'teacher' | 'student', targetUserName: string, changes: any) {
    await this.logToAPI({
      userId: adminId,
      userType: 'admin',
      userName: adminName,
      action: 'user_updated',
      category: 'user_management',
      resourceType: targetUserType,
      resourceId: targetUserId,
      resourceName: targetUserName,
      details: `Admin ${adminName} updated ${targetUserType}: ${targetUserName}`,
      status: 'success',
      metadata: { changes }
    });
  }

  async logUserDeleted(adminId: string, adminName: string, targetUserId: string, targetUserType: 'teacher' | 'student', targetUserName: string) {
    await this.logToAPI({
      userId: adminId,
      userType: 'admin',
      userName: adminName,
      action: 'user_deleted',
      category: 'user_management',
      resourceType: targetUserType,
      resourceId: targetUserId,
      resourceName: targetUserName,
      details: `Admin ${adminName} deleted ${targetUserType}: ${targetUserName}`,
      status: 'warning'
    });
  }

  async logUserActivated(adminId: string, adminName: string, targetUserId: string, targetUserType: 'teacher' | 'student', targetUserName: string, activated: boolean) {
    await this.logToAPI({
      userId: adminId,
      userType: 'admin',
      userName: adminName,
      action: activated ? 'user_activated' : 'user_deactivated',
      category: 'user_management',
      resourceType: targetUserType,
      resourceId: targetUserId,
      resourceName: targetUserName,
      details: `Admin ${adminName} ${activated ? 'activated' : 'deactivated'} ${targetUserType}: ${targetUserName}`,
      status: 'success'
    });
  }

  async logRoleChanged(adminId: string, adminName: string, targetUserId: string, targetUserType: 'teacher' | 'student', targetUserName: string, oldRole: string, newRole: string) {
    await this.logToAPI({
      userId: adminId,
      userType: 'admin',
      userName: adminName,
      action: 'role_changed',
      category: 'user_management',
      resourceType: targetUserType,
      resourceId: targetUserId,
      resourceName: targetUserName,
      details: `Admin ${adminName} changed role for ${targetUserName} from ${oldRole} to ${newRole}`,
      status: 'success',
      metadata: { oldRole, newRole }
    });
  }

  // Course & Content Activities
  async logCourseCreated(userId: string, userType: 'admin' | 'teacher', userName: string, courseId: string, courseName: string) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      action: 'course_created',
      category: 'course_content',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `${userType} ${userName} created course: ${courseName}`,
      status: 'success'
    });
  }

  async logCourseUpdated(userId: string, userType: 'admin' | 'teacher', userName: string, courseId: string, courseName: string, changes: any) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      action: 'course_updated',
      category: 'course_content',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `${userType} ${userName} updated course: ${courseName}`,
      status: 'success',
      metadata: { changes }
    });
  }

  async logCourseDeleted(userId: string, userType: 'admin' | 'teacher', userName: string, courseId: string, courseName: string) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      action: 'course_deleted',
      category: 'course_content',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `${userType} ${userName} deleted course: ${courseName}`,
      status: 'warning'
    });
  }

  async logInstructorAssigned(adminId: string, adminName: string, courseId: string, courseName: string, instructorId: string, instructorName: string) {
    await this.logToAPI({
      userId: adminId,
      userType: 'admin',
      userName: adminName,
      action: 'instructor_assigned',
      category: 'course_content',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `Admin ${adminName} assigned instructor ${instructorName} to course: ${courseName}`,
      status: 'success',
      metadata: { instructorId, instructorName }
    });
  }

  async logContentUploaded(userId: string, userType: 'admin' | 'teacher', userName: string, courseId: string, courseName: string, contentType: string, fileName: string) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      action: 'content_uploaded',
      category: 'course_content',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `${userType} ${userName} uploaded ${contentType}: ${fileName} to course: ${courseName}`,
      status: 'success',
      metadata: { contentType, fileName }
    });
  }

  // Enrollment & Participation
  async logStudentEnrolled(studentId: string, studentName: string, courseId: string, courseName: string, autoEnrolled: boolean = false) {
    await this.logToAPI({
      userId: studentId,
      userType: 'student',
      userName: studentName,
      action: 'student_enrolled',
      category: 'enrollment',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `Student ${studentName} ${autoEnrolled ? 'auto-enrolled' : 'enrolled'} in course: ${courseName}`,
      status: 'success'
    });
  }

  async logStudentUnenrolled(studentId: string, studentName: string, courseId: string, courseName: string) {
    await this.logToAPI({
      userId: studentId,
      userType: 'student',
      userName: studentName,
      action: 'student_unenrolled',
      category: 'enrollment',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `Student ${studentName} unenrolled from course: ${courseName}`,
      status: 'warning'
    });
  }

  async logGradeUpdated(instructorId: string, instructorName: string, studentId: string, studentName: string, courseId: string, courseName: string, assignmentName: string, oldGrade?: number, newGrade?: number) {
    await this.logToAPI({
      userId: instructorId,
      userType: 'teacher',
      userName: instructorName,
      action: 'grade_updated',
      category: 'enrollment',
      resourceType: 'course',
      resourceId: courseId,
      resourceName: courseName,
      details: `Instructor ${instructorName} updated grade for ${studentName} in ${courseName} - ${assignmentName}`,
      status: 'success',
      metadata: { studentId, studentName, assignmentName, oldGrade, newGrade }
    });
  }

  // Payment & Subscription Activities
  async logPaymentProcessed(userId: string, userType: 'student' | 'teacher', userName: string, amount: number, currency: string, success: boolean, transactionId?: string) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      action: success ? 'payment_success' : 'payment_failed',
      category: 'payment',
      details: `${success ? 'Successful' : 'Failed'} payment of ${currency} ${amount} by ${userName}`,
      status: success ? 'success' : 'failure',
      metadata: { amount, currency, transactionId }
    });
  }

  async logSubscriptionChanged(userId: string, userType: 'student' | 'teacher', userName: string, oldPlan: string, newPlan: string) {
    await this.logToAPI({
      userId,
      userType,
      userName,
      action: 'subscription_changed',
      category: 'payment',
      details: `${userName} changed subscription from ${oldPlan} to ${newPlan}`,
      status: 'success',
      metadata: { oldPlan, newPlan }
    });
  }

  // Communication Activities
  async logAnnouncementSent(adminId: string, adminName: string, title: string, recipientCount: number, recipientType: string) {
    await this.logToAPI({
      userId: adminId,
      userType: 'admin',
      userName: adminName,
      action: 'announcement_sent',
      category: 'communication',
      details: `Admin ${adminName} sent announcement "${title}" to ${recipientCount} ${recipientType}`,
      status: 'success',
      metadata: { title, recipientCount, recipientType }
    });
  }

  async logMessageSent(senderId: string, senderType: 'admin' | 'teacher', senderName: string, recipientId: string, recipientName: string, messageType: string) {
    await this.logToAPI({
      userId: senderId,
      userType: senderType,
      userName: senderName,
      action: 'message_sent',
      category: 'communication',
      details: `${senderType} ${senderName} sent ${messageType} to ${recipientName}`,
      status: 'success',
      metadata: { recipientId, recipientName, messageType }
    });
  }

  // Generic logging method for custom events
  async logCustom(logData: AuditLogData) {
    await this.logToAPI(logData);
  }

  // System events
  async logSystemEvent(action: string, details: string, metadata?: any) {
    await this.logToAPI({
      userType: 'system',
      userName: 'System',
      action,
      category: 'system',
      details,
      status: 'success',
      metadata
    });
  }
}

export const auditLogger = new AuditLogger();
export default auditLogger;