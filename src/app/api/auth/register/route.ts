import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie, generateToken } from '@/lib/edge-jwt';
import { createErrorResponse, createSuccessResponse, checkRateLimit, getAccountFromHeaders } from '@/lib/edge-helpers';
import { validateAccount } from '@/lib/request-helpers';
import { RegisterData, AuthResponse, AuthUser } from '@/types/auth';
import { User, Account } from '@/models';
import dbConnect from '@/lib/mongoose';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`register:${clientIP}`, 3, 60 * 60 * 1000)) { // 3 attempts per hour
      return createErrorResponse('Too many registration attempts. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    const accountId = await getAccountFromHeaders(request);

    // Parse request body
    const body = await request.json();
    const { name, email, password, role, phone }: RegisterData = body;

    // Validate required fields
    if (!name || !email || !password || !role || !accountId) {
      return createErrorResponse('Name, email, password, role, and accountId are required', 400, 'MISSING_FIELDS');
    }

    // Validate field types
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof role !== 'string') {
      return createErrorResponse('Invalid field types', 400, 'INVALID_TYPES');
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 100) {
      return createErrorResponse('Name must be between 2 and 100 characters', 400, 'INVALID_NAME');
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Password validation
    if (password.length < 8) {
      return createErrorResponse('Password must be at least 8 characters long', 400, 'PASSWORD_TOO_SHORT');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      return createErrorResponse('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', 400, 'PASSWORD_TOO_WEAK');
    }

    // Role validation
    const validRoles = ['admin', 'tpo', 'faculty', 'coordinator'];
    if (!validRoles.includes(role)) {
      return createErrorResponse('Invalid role', 400, 'INVALID_ROLE');
    }

    // Connect to database
    await dbConnect();

    // Validate account exists and is active
    const accountExists = await validateAccount(accountId);
    if (!accountExists) {
      return createErrorResponse('Invalid account or account is not active', 400, 'INVALID_ACCOUNT');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      accountId 
    });
    
    if (existingUser) {
      return createErrorResponse('User with this email already exists', 409, 'USER_EXISTS');
    }

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role,
      accountId,
      phone: phone?.trim(),
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
    });

    // Save user (password will be hashed by pre-save middleware)
    await newUser.save();

    // Generate JWT payload
    const jwtPayload = {
      userId: newUser._id.toString(),
      accountId: newUser.accountId.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      permissions: [], // Will be populated based on role
    };

    // Generate token
    const token = await generateToken(jwtPayload);

    // Set authentication cookie
    await setAuthCookie(jwtPayload);

    // Prepare user data for response
    const authUser: AuthUser = {
      id: newUser._id.toString(),
      accountId: newUser.accountId.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      profilePic: newUser.profilePic,
      isActive: newUser.isActive,
      emailVerified: newUser.emailVerified,
      phoneVerified: newUser.phoneVerified,
    };

    // Prepare response
    const authResponse: AuthResponse = {
      user: authUser,
      token,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    };

    return createSuccessResponse(authResponse, 'Registration successful', 201);

  } catch (error) {
    console.error('Registration error:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
} 