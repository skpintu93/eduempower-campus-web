import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { PlacementDrive, Company } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/drives/[id] - Get placement drive by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    
    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    const { id } = params;

    // Validate drive ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid drive ID', 400, 'INVALID_ID');
    }

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId })
      .populate('companyId', 'name industry size logo description website')
      .select('-__v')
      .lean();

    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    return createSuccessResponse(drive, 'Placement drive retrieved successfully');

  } catch (error) {
    console.error('Get drive error:', error);
    return createErrorResponse('Failed to retrieve placement drive', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/drives/[id] - Update placement drive
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication with appropriate role
    const user = await requireAuth(request);
    const allowedRoles = ['admin', 'tpo'];
    if (!allowedRoles.includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    const { id } = params;

    // Validate drive ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid drive ID', 400, 'INVALID_ID');
    }

    // Parse request body
    const body = await request.json();
    const {
      jobTitle,
      jobDescription,
      jobLocation,
      ctc,
      jobType,
      minCGPA,
      maxBacklogs,
      eligibleBranches,
      eligibleSemesters,
      requiredSkills,
      registrationDeadline,
      testDate,
      interviewRounds,
      driveDate,
      isActive,
      status,
    } = body;

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId });
    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    // Validate CGPA range if provided
    if (minCGPA !== undefined && (minCGPA < 0 || minCGPA > 10)) {
      return createErrorResponse('Minimum CGPA must be between 0 and 10', 400, 'INVALID_CGPA');
    }

    // Validate backlogs if provided
    if (maxBacklogs !== undefined && maxBacklogs < 0) {
      return createErrorResponse('Maximum backlogs cannot be negative', 400, 'INVALID_BACKLOGS');
    }

    // Validate dates if provided
    if (registrationDeadline || driveDate) {
      const now = new Date();
      
      if (registrationDeadline) {
        const regDeadline = new Date(registrationDeadline);
        if (regDeadline <= now) {
          return createErrorResponse('Registration deadline must be in the future', 400, 'INVALID_REGISTRATION_DEADLINE');
        }
      }

      if (driveDate) {
        const driveDateObj = new Date(driveDate);
        const regDeadline = registrationDeadline ? new Date(registrationDeadline) : drive.registrationDeadline;
        
        if (driveDateObj <= regDeadline) {
          return createErrorResponse('Drive date must be after registration deadline', 400, 'INVALID_DRIVE_DATE');
        }
      }
    }

    // Update drive fields
    const updateFields: any = {};
    
    if (jobTitle !== undefined) updateFields.jobTitle = jobTitle.trim();
    if (jobDescription !== undefined) updateFields.jobDescription = jobDescription.trim();
    if (jobLocation !== undefined) updateFields.jobLocation = jobLocation?.trim();
    if (ctc !== undefined) updateFields.ctc = ctc;
    if (jobType !== undefined) updateFields.jobType = jobType;
    if (minCGPA !== undefined) updateFields.minCGPA = minCGPA;
    if (maxBacklogs !== undefined) updateFields.maxBacklogs = maxBacklogs;
    if (eligibleBranches !== undefined) updateFields.eligibleBranches = eligibleBranches;
    if (eligibleSemesters !== undefined) updateFields.eligibleSemesters = eligibleSemesters;
    if (requiredSkills !== undefined) updateFields.requiredSkills = requiredSkills;
    if (registrationDeadline !== undefined) updateFields.registrationDeadline = new Date(registrationDeadline);
    if (testDate !== undefined) updateFields.testDate = testDate ? new Date(testDate) : undefined;
    if (interviewRounds !== undefined) updateFields.interviewRounds = interviewRounds;
    if (driveDate !== undefined) updateFields.driveDate = new Date(driveDate);
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (status !== undefined) updateFields.status = status;

    // Update drive
    const updatedDrive = await PlacementDrive.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
    .populate('companyId', 'name industry size logo')
    .select('-__v');

    return createSuccessResponse(updatedDrive, 'Placement drive updated successfully');

  } catch (error) {
    console.error('Update drive error:', error);
    return createErrorResponse('Failed to update placement drive', 500, 'INTERNAL_ERROR');
  }
}

// DELETE /api/drives/[id] - Delete placement drive
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication with appropriate role
    const user = await requireAuth(request);
    const allowedRoles = ['admin', 'tpo'];
    if (!allowedRoles.includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    const { id } = params;

    // Validate drive ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid drive ID', 400, 'INVALID_ID');
    }

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId });
    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    // Check for dependencies (registered students)
    if (drive.registeredStudents.length > 0) {
      return createErrorResponse(
        'Cannot delete drive with registered students. Consider deactivating instead.',
        400,
        'HAS_REGISTERED_STUDENTS'
      );
    }

    // Delete drive
    await PlacementDrive.findByIdAndDelete(id);

    return createSuccessResponse(
      { message: 'Placement drive deleted successfully' },
      'Placement drive deleted successfully'
    );

  } catch (error) {
    console.error('Delete drive error:', error);
    return createErrorResponse('Failed to delete placement drive', 500, 'INTERNAL_ERROR');
  }
} 