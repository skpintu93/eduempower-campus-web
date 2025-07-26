import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setAuthCookie, generateToken } from '@/lib/edge-jwt';
import { createErrorResponse, createSuccessResponse, checkRateLimit } from '@/lib/edge-helpers';
import { AuthResponse, AuthUser } from '@/types/auth';
import { User, Account } from '@/models';
import dbConnect from '@/lib/mongoose';

// Zod schema for signup request validation
const SignupSchema = z.object({
  userName: z.string()
    .min(2, 'User name must be at least 2 characters')
    .max(100, 'User name cannot exceed 100 characters')
    .trim(),
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  instituteName: z.string()
    .min(2, 'Institute name must be at least 2 characters')
    .max(100, 'Institute name cannot exceed 100 characters')
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
});

type SignupData = z.infer<typeof SignupSchema>;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - more restrictive for public signup
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`account-register:${clientIP}`, 2, 60 * 60 * 1000)) { // 2 attempts per hour
      return createErrorResponse('Too many registration attempts. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Parse and validate request body with Zod
    const body = await request.json();
    const validationResult = SignupSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      return createErrorResponse(`Validation failed: ${errors}`, 400, 'VALIDATION_ERROR');
    }

    const { userName, email, instituteName, password } = validationResult.data;

    // Connect to database
    await dbConnect();

    // Check if user already exists globally (across all accounts)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return createErrorResponse('User with this email already exists', 409, 'USER_EXISTS');
    }

    // Generate a unique domain from institute name
    const baseDomain = instituteName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 8); // Keep it short to fit validation
    const timestamp = Date.now().toString().slice(-4);
    const uniqueDomain = `${baseDomain}${timestamp}.com`;

    // Create account first
    const newAccount = new Account({
      name: instituteName.trim(),
      domains: [uniqueDomain],
      accountType: 'college', // Default to college
      signupType: 'free', // Default to free tier
      settings: {
        theme: 'light',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        logo: '',
        email: {
          primaryEmail: email.toLowerCase(),
          noreplyEmail: `noreply@${uniqueDomain}`
        }
      },
      address: {
        pincode: '000000', // Placeholder - can be updated later
        addressLine: 'Address to be updated',
        city: 'City to be updated',
        district: 'District to be updated',
        state: 'State to be updated',
        country: 'India'
      },
      accreditation: 'To be updated',
      yearEstablished: new Date().getFullYear(),
      totalStudents: 100, // Default value
      departments: ['General'], // Default department
      isActive: true
    });

    // Save account
    await newAccount.save();

    // Create user with admin role
    const newUser = new User({
      name: userName.trim(),
      email: email.toLowerCase(),
      password,
      role: 'admin', // Auto-assign admin role
      accountId: newAccount._id,
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

    return createSuccessResponse(authResponse, 'Account and user created successfully', 201);

  } catch (error) {
    console.error('Account registration error:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
} 