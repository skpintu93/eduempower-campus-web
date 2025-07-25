import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenFromRequest } from '@/lib/edge-jwt';
import { createErrorResponse, createSuccessResponse, getRolePermissions } from '@/lib/request-helpers';
import { AuthUser } from '@/types/auth';
import { User, Account } from '@/models';
import dbConnect from '@/lib/mongoose';

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token from request
    const payload = await verifyTokenFromRequest(request);
    
    if (!payload) {
      return createErrorResponse('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Connect to database
    await dbConnect();

    // Get user from database to ensure they still exist and are active
    const user = await User.findById(payload.userId).populate('accountId');
    
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      return createErrorResponse('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Verify account is still active
    const account = await Account.findById(user.accountId);
    if (!account || !account.isActive) {
      return createErrorResponse('Account is not active', 401, 'ACCOUNT_INACTIVE');
    }

    // Get role permissions
    const permissions = getRolePermissions(user.role);

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

    // Return user data with permissions
    return createSuccessResponse({
      user: authUser,
      permissions,
      account: {
        id: account._id.toString(),
        name: account.name,
        accountType: account.accountType,
        isActive: account.isActive,
      }
    }, 'Token verified successfully');

  } catch (error) {
    console.error('Verify account error:', error);
    
    if (error instanceof Error && error.message.includes('expired')) {
      return createErrorResponse('Token has expired', 401, 'TOKEN_EXPIRED');
    }
    
    if (error instanceof Error && error.message.includes('Invalid token')) {
      return createErrorResponse('Invalid token', 401, 'INVALID_TOKEN');
    }

    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// Also handle POST requests for compatibility
export async function POST(request: NextRequest) {
  return GET(request);
} 