import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getRolePermissions } from './lib/edge-helpers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_SECRET_UINT8 = new TextEncoder().encode(JWT_SECRET);

// JWT Payload interface
interface JWTPayload {
  userId: string;
  accountId: string;
  email: string;
  name: string;
  role: 'admin' | 'tpo' | 'faculty' | 'coordinator';
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/verify-account',
    '/api/test-db',
  ];

  // Check if the current path is a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get the token from cookies (our auth system uses cookies)
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login if no token is present
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET_UINT8);
    
    // Validate required fields
    if (!payload.userId || !payload.accountId || !payload.email || !payload.role) {
      throw new Error('Invalid token payload');
    }

    const jwtPayload = {
      userId: payload.userId as string,
      accountId: payload.accountId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'tpo' | 'faculty' | 'coordinator',
      permissions: payload.permissions as string[] | undefined,
    };

    // Get role permissions
    const permissions = getRolePermissions(jwtPayload.role);
    
    // Add user info to headers for API routes
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', jwtPayload.userId);
      requestHeaders.set('x-account-id', jwtPayload.accountId);
      requestHeaders.set('x-user-email', jwtPayload.email);
      requestHeaders.set('x-user-name', jwtPayload.name);
      requestHeaders.set('x-user-role', jwtPayload.role);
      requestHeaders.set('x-user-permissions', JSON.stringify(permissions));
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // For protected pages, continue with the request
    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Clear the invalid token cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 