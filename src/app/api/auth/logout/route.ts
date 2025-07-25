import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/edge-jwt';
import { createSuccessResponse } from '@/lib/request-helpers';

export async function POST(request: NextRequest) {
  try {
    // Clear authentication cookie
    await clearAuthCookie();

    // Return success response
    return createSuccessResponse(
      { message: 'Logged out successfully' },
      'Logout successful'
    );

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, try to clear the cookie
    try {
      await clearAuthCookie();
    } catch (clearError) {
      console.error('Error clearing auth cookie:', clearError);
    }

    // Return success anyway since the main goal is to log out
    return createSuccessResponse(
      { message: 'Logged out successfully' },
      'Logout successful'
    );
  }
}

// Also handle GET requests for logout (for compatibility)
export async function GET(request: NextRequest) {
  return POST(request);
} 