import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenFromRequest } from './edge-jwt';
import { JWTPayload, Permission, ErrorResponse } from '../types/auth';
import { Account, User } from '../models';
import dbConnect from './mongoose';

// Standard error responses
export const createErrorResponse = (
  message: string,
  status: number = 400,
  code?: string
): NextResponse<ErrorResponse> => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(7),
  };

  return NextResponse.json(errorResponse, { status });
};

export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<{ success: true; data: T; message?: string }> => {
  return NextResponse.json(
    { success: true, data, message },
    { status }
  );
};

// Account extraction from headers
export async function getAccountFromHeaders(request: NextRequest): Promise<string | null> {
  try {
    // First try to get from JWT token
    const payload = await verifyTokenFromRequest(request);
    if (payload?.accountId) {
      return payload.accountId;
    }

    // Fallback to custom header
    const accountId = request.headers.get('x-account-id');
    return accountId;
  } catch (error) {
    console.error('Error extracting account from headers:', error);
    return null;
  }
}

// User extraction from headers
export async function getUserFromHeaders(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const payload = await verifyTokenFromRequest(request);
    return payload;
  } catch (error) {
    console.error('Error extracting user from headers:', error);
    return null;
  }
}

// Require authentication middleware
export async function requireAuth(request: NextRequest): Promise<JWTPayload> {
  const user = await getUserFromHeaders(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

// Require specific role middleware
export async function requireRole(
  request: NextRequest,
  roles: string[]
): Promise<JWTPayload> {
  const user = await requireAuth(request);
  
  if (!roles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${roles.join(', ')}`);
  }

  return user;
}

// Require specific permission middleware
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<JWTPayload> {
  const user = await requireAuth(request);
  
  // Check if user has the required permission
  if (!user.permissions?.includes(permission)) {
    throw new Error(`Access denied. Required permission: ${permission}`);
  }

  return user;
}

// Validate account exists
export async function validateAccount(accountId: string): Promise<boolean> {
  try {
    await dbConnect();
    const account = await Account.findById(accountId);
    return !!account && account.isActive;
  } catch (error) {
    console.error('Error validating account:', error);
    return false;
  }
}

// Validate user exists and belongs to account
export async function validateUser(userId: string, accountId: string): Promise<boolean> {
  try {
    await dbConnect();
    const user = await User.findOne({ _id: userId, accountId, isActive: true });
    return !!user;
  } catch (error) {
    console.error('Error validating user:', error);
    return false;
  }
}

// Get user permissions based on role
export function getRolePermissions(role: string): Permission[] {
  const permissions: Record<string, Permission[]> = {
    admin: [
      'users:read', 'users:write',
      'students:read', 'students:write',
      'companies:read', 'companies:write',
      'drives:read', 'drives:write',
      'trainings:read', 'trainings:write',
      'assessments:read', 'assessments:write',
      'notifications:read', 'notifications:write',
      'reports:read',
      'settings:read', 'settings:write'
    ],
    tpo: [
      'students:read', 'students:write',
      'companies:read', 'companies:write',
      'drives:read', 'drives:write',
      'trainings:read', 'trainings:write',
      'assessments:read', 'assessments:write',
      'notifications:read', 'notifications:write',
      'reports:read',
      'settings:read'
    ],
    faculty: [
      'students:read',
      'trainings:read', 'trainings:write',
      'assessments:read', 'assessments:write',
      'notifications:read'
    ],
    coordinator: [
      'students:read',
      'trainings:read',
      'assessments:read',
      'notifications:read'
    ]
  };

  return permissions[role] || [];
}

// Check if user has permission
export function hasPermission(userPermissions: string[], requiredPermission: Permission): boolean {
  return userPermissions.includes(requiredPermission);
}

// Check if user has any of the required permissions
export function hasAnyPermission(userPermissions: string[], requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

// Check if user has all required permissions
export function hasAllPermissions(userPermissions: string[], requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Request validation helper
export function validateRequest<T>(
  request: NextRequest,
  schema: (data: any) => data is T
): T | null {
  try {
    const data = request.json ? request.json() : {};
    return schema(data) ? data : null;
  } catch (error) {
    console.error('Error validating request:', error);
    return null;
  }
} 