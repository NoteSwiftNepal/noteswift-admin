/**
 * Centralized API Configuration for Admin Dashboard
 * All API endpoints point to the Express backend
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:5000';

// export const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  BASE: API_BASE_URL,
  
  // ==================== AUTH (Regular Admins) ====================
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/admin/auth/login`,
    VERIFY_OTP: `${API_BASE_URL}/api/admin/auth/verify-otp`,
    COMPLETE_LOGIN: `${API_BASE_URL}/api/admin/auth/complete-login`,
    SESSION: `${API_BASE_URL}/api/admin/auth/session`,
    REFRESH: `${API_BASE_URL}/api/admin/auth/session/refresh`,
    LOGOUT: `${API_BASE_URL}/api/admin/auth/logout`,
    SETUP_PHONE: `${API_BASE_URL}/api/admin/auth/setup-phone`,
    // Passwordless mobile-number + OTP login — unified across system_admin
    // and regular admins, so this single pair serves both login portals.
    OTP_LOGIN_REQUEST: `${API_BASE_URL}/api/admin/auth/otp-login/request`,
    OTP_LOGIN_VERIFY: `${API_BASE_URL}/api/admin/auth/otp-login/verify`,
    // Self-service Account Settings — same pair of routes for every admin
    // role, unified under the regular /auth prefix.
    UPDATE_PHONE: `${API_BASE_URL}/api/admin/auth/profile/phone`,
    UPDATE_EMAIL: `${API_BASE_URL}/api/admin/auth/profile/email`,
    UPDATE_PASSWORD: `${API_BASE_URL}/api/admin/auth/profile/password`,
  },

  // ==================== ADMIN AUTH (System Admin) ====================
  ADMIN_AUTH: {
    LOGIN: `${API_BASE_URL}/api/admin/admin-auth/login`,
    VERIFY_OTP: `${API_BASE_URL}/api/admin/admin-auth/verify-otp`,
    VERIFY_INVITATION: `${API_BASE_URL}/api/admin/admin-auth/verify-invitation`,
    COMPLETE_SIGNUP: `${API_BASE_URL}/api/admin/admin-auth/complete-signup`,
    PROFILE: `${API_BASE_URL}/api/admin/admin-auth/profile`,
  },

  // ==================== TEACHERS ====================
  TEACHERS: {
    LIST: `${API_BASE_URL}/api/admin/teachers`,
    DROPDOWN: `${API_BASE_URL}/api/admin/admin/teachers`, // Lightweight for dropdowns
    GET: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}`,
    APPROVE: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}/approve`,
    REJECT: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}/reject`,
    BAN: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}/ban`,
    REMOVE: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}/remove`,
    ASSIGN: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}/assign`,
    REMOVE_ASSIGNMENT: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}/remove-assignment`,
    ASSIGN_SCHOOL: (id: string) => `${API_BASE_URL}/api/admin/teachers/${id}/assign-school`,
  },

  // ==================== COURSES ====================
  COURSES: {
    LIST: `${API_BASE_URL}/api/admin/courses`, // Full course data
    DROPDOWN: `${API_BASE_URL}/api/admin/admin/courses`, // Lightweight for dropdowns
    CREATE: `${API_BASE_URL}/api/admin/courses`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/courses/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/courses/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/admin/courses/${id}`,
    UPDATE_CHAPTER: (courseId: string, subjectId: string, moduleId: string) =>
      `${API_BASE_URL}/api/admin/courses/${courseId}/subjects/${subjectId}/modules/${moduleId}`,
    DELETE_CHAPTER: (courseId: string, subjectId: string, moduleId: string) =>
      `${API_BASE_URL}/api/admin/courses/${courseId}/subjects/${subjectId}/modules/${moduleId}`,
    DELETE_SUBJECT: (courseId: string, subjectId: string) =>
      `${API_BASE_URL}/api/admin/courses/${courseId}/subjects/${subjectId}`,
    UPLOAD_THUMBNAIL: (courseId: string) => `${API_BASE_URL}/api/admin/courses/${courseId}/thumbnail`,
  },

  // ==================== NOTIFICATIONS ====================
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/api/admin/notifications`,
    CREATE: `${API_BASE_URL}/api/admin/notifications`,
    DELETE: (id: string) => `${API_BASE_URL}/api/admin/notifications/${id}`,
    ACTIVE_HOMEPAGE: `${API_BASE_URL}/api/admin/notifications/active/homepage`,
  },

  // ==================== RECOMMENDATIONS ====================
  RECOMMENDATIONS: {
    ANALYZE: `${API_BASE_URL}/api/admin/recommendations`,
    STATS: `${API_BASE_URL}/api/admin/recommendations`,
    CHANGES: `${API_BASE_URL}/api/admin/recommendations/course-changes`,
    ANALYZE_ALL: `${API_BASE_URL}/api/admin/recommendations/analyze-all`,
  },

  // ==================== AUDIT LOGS ====================
  AUDIT_LOGS: {
    LIST: `${API_BASE_URL}/api/admin/audit-logs`,
    CREATE: `${API_BASE_URL}/api/admin/audit-logs`,
  },

  // ==================== DASHBOARD ====================
  DASHBOARD: {
    OVERVIEW: `${API_BASE_URL}/api/admin/dashboard`,
  },

  // ==================== USERS ====================
  USERS: {
    LIST: `${API_BASE_URL}/api/admin/users`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
  },

  // ==================== HOMEPAGE SETTINGS ====================
  HOMEPAGE: {
    SETTINGS: `${API_BASE_URL}/api/admin/homepage-settings`,
  },

  // ==================== PROMO BANNERS ====================
  PROMO_BANNERS: {
    LIST: `${API_BASE_URL}/api/admin/promo-banners`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/promo-banners/${id}`,
    CREATE: `${API_BASE_URL}/api/admin/promo-banners`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/promo-banners/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/admin/promo-banners/${id}`,
    UPLOAD_IMAGE: `${API_BASE_URL}/api/admin/promo-banners/upload-image`,
  },

  // ==================== REVENUE ====================
  REVENUE: {
    OVERVIEW: `${API_BASE_URL}/api/admin/revenue/overview`,
  },

  // ==================== ADMIN MANAGEMENT ====================
  ADMINS: {
    LIST: `${API_BASE_URL}/api/admin/admins`,
    INVITE: `${API_BASE_URL}/api/admin/admins/invite`,
    REMOVE: `${API_BASE_URL}/api/admin/admins/remove`,
    SET_SUPER_ADMIN: `${API_BASE_URL}/api/admin/admins/set-super-admin`,
    DEMOTE_SUPER_ADMIN: `${API_BASE_URL}/api/admin/admins/demote-super-admin`,
  },

  // ==================== SCHOOL MANAGEMENT ====================
  SCHOOLS: {
    LIST: `${API_BASE_URL}/api/admin/schools`,
    DROPDOWN: `${API_BASE_URL}/api/admin/schools/dropdown`,
    CREATE: `${API_BASE_URL}/api/admin/schools`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/schools/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/schools/${id}`,
    DEACTIVATE: (id: string) => `${API_BASE_URL}/api/admin/schools/${id}/deactivate`,
  },

  // ==================== APP UPDATE =================

  // ==================== APP UPDATE ====================
  APP_UPDATE: {
    CREATE: `${API_BASE_URL}/api/admin/app-update`,
    DEACTIVATE: `${API_BASE_URL}/api/admin/app-update/deactivate`,
    STATUS: `${API_BASE_URL}/api/admin/app-update`,
  },


  // ==================== ORDERS & PAYMENTS ====================
  ORDERS_PAYMENTS: {
    TRANSACTIONS: {
      LIST: `${API_BASE_URL}/api/admin/orders-payments/transactions`,
      GET: (id: string) => `${API_BASE_URL}/api/admin/orders-payments/transactions/${id}`,
      CREATE: `${API_BASE_URL}/api/admin/orders-payments/transaction`,
    },
    CODES: {
      LIST: `${API_BASE_URL}/api/admin/orders-payments/codes`,
      GET: (id: string) => `${API_BASE_URL}/api/admin/orders-payments/codes/${id}`,
      BULK_CREATE: `${API_BASE_URL}/api/admin/orders-payments/codes/bulk`,
    },
  },

  // ==================== SUBJECT CONTENT ====================
  SUBJECT_CONTENT: {
    GET: `${API_BASE_URL}/api/admin/subject-content`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/subject-content/${id}`,
  },

  // ==================== REPORTS ====================
  REPORTS: {
    OVERVIEW: `${API_BASE_URL}/api/admin/reports/overview`,
  },

  // ==================== LIVE CLASSES ====================
  LIVE_CLASSES: {
    LIST: `${API_BASE_URL}/api/admin/live-classes`,
    STATS: `${API_BASE_URL}/api/admin/live-classes/stats`,
    ORPHANED: `${API_BASE_URL}/api/admin/live-classes/orphaned`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/live-classes/${id}`,
    TEACHERS: `${API_BASE_URL}/api/admin/live-classes/teachers`,
    SUBJECTS: `${API_BASE_URL}/api/admin/live-classes/subjects`,
  },

  // ==================== ARCHIVES ====================
  ARCHIVES: {
    STATS: `${API_BASE_URL}/api/admin/archives/stats`,
    SUBJECTS: `${API_BASE_URL}/api/admin/archives/subjects`,
    LIVE_CLASSES: `${API_BASE_URL}/api/admin/archives/live-classes`,
    TEACHER_ASSIGNMENTS: `${API_BASE_URL}/api/admin/archives/teacher-assignments`,
    RESTORE_SUBJECT: (id: string) => `${API_BASE_URL}/api/admin/archives/subjects/${id}/restore`,
    RESTORE_LIVE_CLASS: (id: string) => `${API_BASE_URL}/api/admin/archives/live-classes/${id}/restore`,
    RESTORE_TEACHER_ASSIGNMENT: (id: string) => `${API_BASE_URL}/api/admin/archives/teacher-assignments/${id}/restore`,
    PERMANENT_DELETE_SUBJECT: (id: string) => `${API_BASE_URL}/api/admin/archives/subjects/${id}/permanent-delete`,
    PERMANENT_DELETE_LIVE_CLASS: (id: string) => `${API_BASE_URL}/api/admin/archives/live-classes/${id}/permanent-delete`,
    PERMANENT_DELETE_TEACHER_ASSIGNMENT: (id: string) => `${API_BASE_URL}/api/admin/archives/teacher-assignments/${id}/permanent-delete`,
  },
};

/**
 * Helper function to create fetch options with credentials
 * IMPORTANT: Always include credentials: 'include' for httpOnly cookies!
 */
export const createFetchOptions = (method: string = 'GET', body?: any): RequestInit => {
  const options: RequestInit = {
    method,
    credentials: 'include', // Essential for sending httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add JWT token from localStorage if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminToken');
    if (token && options.headers) {
      (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
};

/**
 * Example usage:
 * 
 * // GET request
 * const response = await fetch(API_ENDPOINTS.TEACHERS.LIST, createFetchOptions('GET'));
 * 
 * // POST request
 * const response = await fetch(API_ENDPOINTS.TEACHERS.APPROVE('123'), createFetchOptions('POST', { reason: 'Good' }));
 * 
 * // With query params
 * const response = await fetch(`${API_ENDPOINTS.TEACHERS.LIST}?status=pending_approval`, createFetchOptions('GET'));
 */
