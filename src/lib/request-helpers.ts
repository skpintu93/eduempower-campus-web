import { NextRequest, NextResponse } from 'next/server';
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

 