import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie, generateToken } from '@/lib/edge-jwt';
import { createErrorResponse, createSuccessResponse, checkRateLimit } from '@/lib/request-helpers';
import { LoginCredentials, AuthResponse, AuthUser } from '@/types/auth';
import { User, Account } from '@/models';
import dbConnect from '@/lib/mongoose';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`login:${clientIP}`, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      return createErrorResponse('Too many login attempts. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Parse request body
    const body = await request.json();
    const { email, password }: LoginCredentials = body;

    // Validate input
    if (!email || !password) {
      return createErrorResponse('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return createErrorResponse('Invalid email or password format', 400, 'INVALID_FORMAT');
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Connect to database
    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).populate('accountId');
    
    if (!user) {
      return createErrorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.isActive) {
      return createErrorResponse('Account is deactivated. Please contact administrator.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Check if account is active
    const account = await Account.findById(user.accountId);
    if (!account || !account.isActive) {
      return createErrorResponse('Account is not active. Please contact administrator.', 401, 'ACCOUNT_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return createErrorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT payload
    const jwtPayload = {
      userId: user._id.toString(),
      accountId: user.accountId.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: [], // Will be populated based on role
    };

    // Generate token
    const token = await generateToken(jwtPayload);

    // Set authentication cookie
    await setAuthCookie(jwtPayload);

    // Prepare user data for response
    const authUser: AuthUser = {
      id: user._id.toString(),
      accountId: user.accountId.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      profilePic: user.profilePic,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    };

    // Prepare response
    const authResponse: AuthResponse = {
      user: authUser,
      token,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    };

    return createSuccessResponse(authResponse, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
} 