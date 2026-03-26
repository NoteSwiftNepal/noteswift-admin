import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define protected routes
const protectedRoutes = ['/dashboard'];
const adminAuthRoutes = ['/admin/login', '/admin/otp'];
const regularAuthRoutes = ['/login', '/login/otp'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminAuthRoute = adminAuthRoutes.some(route => pathname === route);
  const isRegularAuthRoute = regularAuthRoutes.some(route => pathname === route);

  // Get tokens from cookies or headers (admin system uses localStorage, but we can check headers)
  const adminToken = request.cookies.get('admin_token')?.value ||
                    request.headers.get('authorization')?.replace('Bearer ', '');

  // For protected routes, check authentication
  if (isProtectedRoute) {
    if (!adminToken) {
      // Redirect to regular login (normal admins use /login)
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify the JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
      const { payload } = await jwtVerify(adminToken, secret);

      // Check if it's an admin token
      if (payload.type !== 'admin') {
        // Not an admin token, redirect to regular login
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Token is valid, allow access
      return NextResponse.next();
    } catch (error) {
      // Token is invalid or expired, redirect to regular login
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin_token');
      return response;
    }
  }

  // If already authenticated, redirect to dashboard from login pages
  if ((pathname === '/login' || pathname === '/login/otp') && adminToken) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
      const { payload } = await jwtVerify(adminToken, secret);

      if (payload.type === 'admin') {
        // Already authenticated admin, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      // Invalid token, clear it
      const response = NextResponse.next();
      response.cookies.delete('admin_token');
      return response;
    }
  }

  // Prevent regular admins from accessing system admin login page
  if (pathname === '/admin/login' || pathname === '/admin/otp') {
    // Only system admins should use this route
    // Regular admins should be redirected to /login
    // Note: System admin access is validated on the backend
    return NextResponse.next();
  }

  // If accessing admin auth routes while already authenticated as system admin, redirect to dashboard
  if (isAdminAuthRoute && adminToken) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
      const { payload } = await jwtVerify(adminToken, secret);

      if (payload.type === 'admin') {
        // Admin is already authenticated, redirect to dashboard
        const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
    } catch (error) {
      // Invalid token, clear it and continue to login
      const response = NextResponse.next();
      response.cookies.delete('admin_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};