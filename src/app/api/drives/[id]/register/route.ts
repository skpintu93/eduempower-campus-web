import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { PlacementDrive, Student } from '@/models';
import dbConnect from '@/lib/mongoose';

// POST /api/drives/[id]/register - Register student for placement drive
export async function POST(
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

    // Parse request body
    const body = await request.json();
    const { studentId } = body;

    // Validate student ID
    if (!studentId) {
      return createErrorResponse('Student ID is required', 400, 'MISSING_STUDENT_ID');
    }

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId, isActive: true });
    if (!drive) {
      return createErrorResponse('Placement drive not found or inactive', 404, 'DRIVE_NOT_FOUND');
    }

    // Check if drive is open for registration
    if (drive.status !== 'open') {
      return createErrorResponse('Drive is not open for registration', 400, 'DRIVE_NOT_OPEN');
    }

    // Check registration deadline
    const now = new Date();
    if (now > drive.registrationDeadline) {
      return createErrorResponse('Registration deadline has passed', 400, 'REGISTRATION_CLOSED');
    }

    // Find student by ID and account
    const student = await Student.findOne({ _id: studentId, accountId });
    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Check if student is already registered
    if (drive.registeredStudents.includes(studentId)) {
      return createErrorResponse('Student is already registered for this drive', 409, 'ALREADY_REGISTERED');
    }

    // Check eligibility criteria
    const eligibilityChecks = [];

    // Check CGPA requirement
    if (student.cgpa < drive.minCGPA) {
      eligibilityChecks.push(`CGPA requirement not met. Required: ${drive.minCGPA}, Current: ${student.cgpa}`);
    }

    // Check backlogs requirement
    if (student.backlogs > drive.maxBacklogs) {
      eligibilityChecks.push(`Backlogs exceed limit. Maximum allowed: ${drive.maxBacklogs}, Current: ${student.backlogs}`);
    }

    // Check branch eligibility
    if (!drive.eligibleBranches.includes(student.branch)) {
      eligibilityChecks.push(`Branch not eligible. Eligible branches: ${drive.eligibleBranches.join(', ')}`);
    }

    // Check semester eligibility
    if (drive.eligibleSemesters.length > 0 && !drive.eligibleSemesters.includes(student.semester)) {
      eligibilityChecks.push(`Semester not eligible. Eligible semesters: ${drive.eligibleSemesters.join(', ')}`);
    }

    // Check if student is already placed
    if (student.isPlaced) {
      eligibilityChecks.push('Student is already placed');
    }

    // If any eligibility checks failed
    if (eligibilityChecks.length > 0) {
      return createErrorResponse(
        `Student not eligible for this drive: ${eligibilityChecks.join('; ')}`,
        400,
        'NOT_ELIGIBLE'
      );
    }

    // Add student to registered list
    drive.registeredStudents.push(studentId);
    await drive.save();

    // Update student's registered drives
    student.registeredDrives.push({
      driveId: id,
      registrationDate: now,
      status: 'registered'
    });
    await student.save();

    // Prepare response data
    const responseData = {
      driveId: id,
      studentId,
      registrationDate: now,
      eligibilityStatus: 'eligible',
      message: 'Successfully registered for placement drive'
    };

    return createSuccessResponse(responseData, 'Successfully registered for placement drive', 201);

  } catch (error) {
    console.error('Drive registration error:', error);
    return createErrorResponse('Failed to register for placement drive', 500, 'INTERNAL_ERROR');
  }
}

// DELETE /api/drives/[id]/register - Unregister student from placement drive
export async function DELETE(
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

    // Parse request body
    const body = await request.json();
    const { studentId } = body;

    // Validate student ID
    if (!studentId) {
      return createErrorResponse('Student ID is required', 400, 'MISSING_STUDENT_ID');
    }

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId });
    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    // Check if student is registered
    if (!drive.registeredStudents.includes(studentId)) {
      return createErrorResponse('Student is not registered for this drive', 404, 'NOT_REGISTERED');
    }

    // Check if drive has started (can't unregister after drive starts)
    const now = new Date();
    if (now >= drive.driveDate) {
      return createErrorResponse('Cannot unregister after drive has started', 400, 'DRIVE_STARTED');
    }

    // Remove student from registered list
    drive.registeredStudents = drive.registeredStudents.filter((id: any) => id.toString() !== studentId);
    await drive.save();

    // Update student's registered drives
    const student = await Student.findOne({ _id: studentId, accountId });
    if (student) {
      student.registeredDrives = student.registeredDrives.filter(
        (drive: any) => drive.driveId.toString() !== id
      );
      await student.save();
    }

    return createSuccessResponse(
      { message: 'Successfully unregistered from placement drive' },
      'Successfully unregistered from placement drive'
    );

  } catch (error) {
    console.error('Drive unregistration error:', error);
    return createErrorResponse('Failed to unregister from placement drive', 500, 'INTERNAL_ERROR');
  }
} 