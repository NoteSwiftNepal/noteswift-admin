import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface AdminSession {
  adminId: string;
  username: string;
  loginTime: number;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create a secure JWT token for admin session
 */
export async function createAdminSession(sessionData: AdminSession): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);

  const token = await new SignJWT({
    ...sessionData,
    type: 'admin_session'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() + SESSION_DURATION)
    .sign(secret);

  return token;
}

/**
 * Verify and decode admin session token
 */
export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Validate token type and required fields
    if (payload.type !== 'admin_session' || !payload.adminId || !payload.username) {
      return null;
    }

    return {
      adminId: payload.adminId as string,
      username: payload.username as string,
      loginTime: payload.loginTime as number,
      deviceFingerprint: payload.deviceFingerprint as string,
      ipAddress: payload.ipAddress as string,
      userAgent: payload.userAgent as string,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Generate a device fingerprint for additional security
 */
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 10, 10);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    !!window.indexedDB,
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform,
  ].join('|');

  // Simple hash function for fingerprint
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Check if the current session is valid and matches device
 */
export async function validateCurrentSession(): Promise<boolean> {
  try {
    const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
    // Since the cookie is httpOnly, we can't read it directly
    // Instead, we make an API call to validate the session server-side
    const response = await fetch(API_ENDPOINTS.AUTH.SESSION, createFetchOptions('GET'));

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
}

/**
 * Clear admin session
 */
export async function clearAdminSession(): Promise<void> {
  try {
    const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
    // Make API call to clear the server-side session
    await fetch(API_ENDPOINTS.AUTH.LOGOUT, createFetchOptions('POST'));
  } catch (error) {
    console.error('Error clearing server session:', error);
  }

  // Clear localStorage backup
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_session_backup');
    localStorage.removeItem('isAuthenticated');
  }
}

/**
 * Get client-side session info for UI purposes
 */
export function getClientSessionInfo(): { isAuthenticated: boolean; username?: string; loginTime?: number } {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false };
  }

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const sessionBackup = localStorage.getItem('admin_session_backup');

  if (!isAuthenticated || !sessionBackup) {
    return { isAuthenticated: false };
  }

  try {
    const sessionData = JSON.parse(sessionBackup);
    return {
      isAuthenticated: true,
      username: sessionData.username,
      loginTime: sessionData.loginTime,
    };
  } catch {
    return { isAuthenticated: false };
  }
}