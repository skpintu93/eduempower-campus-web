import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_SECRET_UINT8 = new TextEncoder().encode(JWT_SECRET);

// JWT Payload interface
export interface JWTPayload {
  userId: string;
  accountId: string;
  email: string;
  name: string;
  role: 'admin' | 'tpo' | 'faculty' | 'coordinator';
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// Token configuration
const TOKEN_EXPIRY = '7d'; // 7 days
const COOKIE_NAME = 'auth-token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: '/',
};

/**
 * Generate JWT token for user authentication
 */
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(JWT_SECRET_UINT8);

    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify JWT token and return decoded payload
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_UINT8);
    
    // Validate required fields
    if (!payload.userId || !payload.accountId || !payload.email || !payload.role) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.userId as string,
      accountId: payload.accountId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'tpo' | 'faculty' | 'coordinator',
      permissions: payload.permissions as string[] | undefined,
      iat: payload.iat as number | undefined,
      exp: payload.exp as number | undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'JWTExpiredError') {
      throw new Error('Token has expired');
    }
    if (error instanceof Error && error.name === 'JWTInvalidError') {
      throw new Error('Invalid token');
    }
    console.error('Error verifying JWT token:', error);
    throw new Error('Failed to verify authentication token');
  }
}

/**
 * Set authentication cookie with JWT token
 */
export async function setAuthCookie(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<void> {
  try {
    const token = await generateToken(payload);
    const cookieStore = await cookies();
    
    cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  } catch (error) {
    console.error('Error setting auth cookie:', error);
    throw new Error('Failed to set authentication cookie');
  }
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch (error) {
    console.error('Error clearing auth cookie:', error);
    // Don't throw error for cookie clearing
  }
}

/**
 * Get JWT token from request cookies
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    return token || null;
  } catch (error) {
    console.error('Error getting token from request:', error);
    return null;
  }
}

/**
 * Get JWT token from cookies (server-side)
 */
export async function getTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    return token || null;
  } catch (error) {
    console.error('Error getting token from cookies:', error);
    return null;
  }
}

/**
 * Verify token from request and return user data
 */
export async function verifyTokenFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return null;

    const payload = await verifyToken(token);
    return payload;
  } catch (error) {
    console.error('Error verifying token from request:', error);
    return null;
  }
}

/**
 * Verify token from cookies and return user data
 */
export async function verifyTokenFromCookies(): Promise<JWTPayload | null> {
  try {
    const token = await getTokenFromCookies();
    if (!token) return null;

    const payload = await verifyToken(token);
    return payload;
  } catch (error) {
    console.error('Error verifying token from cookies:', error);
    return null;
  }
} 