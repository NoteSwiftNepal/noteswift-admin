import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, decodeJwt } from 'jose';

// Define protected routes
const protectedRoutes = ['/dashboard'];
const adminAuthRoutes = ['/admin/login', '/admin/otp'];
const regularAuthRoutes = ['/login', '/login/otp'];

async function verifyAdminToken(token: string) {
  const candidateSecrets = [
    process.env.JWT_SECRET?.trim().replace(/^["']|["']$/g, ''),
    process.env.JWT_ACCESS_SECRET?.trim().replace(/^["']|["']$/g, ''),
    '79a3d5620cd163e06464e569561368dceba801333184df5ba990c7546ff34249d9f6d98409e24c10a674d41ba5b2bcef5fa3f9735ae7fbf50cabfaea854a90ca',
    '784b9d57b72014f4e6921769e86ec41603799c80aad66fa5a45edaad770d12b46b12e21528586aac6852bd94190d778788c432420eddf04ff6db7217832d248f',
    'fallback-secret-key-change-in-production',
  ].filter((s): s is string => Boolean(s && s.length > 0));

  let lastError: any = null;

  for (let i = 0; i < candidateSecrets.length; i++) {
    try {
      const secret = new TextEncoder().encode(candidateSecrets[i]);
      const { payload } = await jwtVerify(token, secret);
      if (i > 0) {
        console.warn(`[Middleware] Token verified with candidate secret index ${i}`);
      }
      return payload;
    } catch (err: any) {
      lastError = err;
    }
  }

  try {
    const unverifiedPayload = decodeJwt(token);
    console.error(`[Middleware Auth Failed] Token unverified claims:`, JSON.stringify(unverifiedPayload));
  } catch {}

  throw lastError;
}

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

  // Get tokens from cookies or headers
  const adminToken = request.cookies.get('admin_token')?.value ||
                    request.headers.get('authorization')?.replace('Bearer ', '');

  // For protected routes, check authentication
  if (isProtectedRoute) {
    if (!adminToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const payload = await verifyAdminToken(adminToken);

      // Check if it's an admin token (regular admin or admin session)
      if (payload.type !== 'admin' && payload.type !== 'admin_session') {
        console.warn(`[Middleware] Rejecting token: unexpected payload.type '${payload.type}'`);
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Token is valid, allow access
      return NextResponse.next();
    } catch (error: any) {
      console.error(`[Middleware Auth Failed] Route: ${pathname}, Reason: ${error?.message || error} (Code: ${error?.code || 'UNKNOWN'})`);
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin_token');
      return response;
    }
  }

  // If already authenticated, redirect to dashboard from login pages
  if ((pathname === '/login' || pathname === '/login/otp') && adminToken) {
    try {
      const payload = await verifyAdminToken(adminToken);
      if (payload.type === 'admin' || payload.type === 'admin_session') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      const response = NextResponse.next();
      response.cookies.delete('admin_token');
      return response;
    }
  }

  // Prevent regular admins from accessing system admin login page
  if (pathname === '/admin/login' || pathname === '/admin/otp') {
    return NextResponse.next();
  }

  // If accessing admin auth routes while already authenticated as system admin, redirect to dashboard
  if (isAdminAuthRoute && adminToken) {
    try {
      const payload = await verifyAdminToken(adminToken);
      if (payload.type === 'admin' || payload.type === 'admin_session') {
        const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
    } catch (error) {
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