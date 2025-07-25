import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { PlacementDrive, Student } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/drives/[id]/results - Get drive results
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
      .populate('companyId', 'name industry')
      .select('jobTitle companyId results registeredStudents driveDate status')
      .lean() as any;

    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    // Get student details for results
    const studentIds = drive.results.map((result: any) => result.studentId);
    const students = await Student.find({ _id: { $in: studentIds }, accountId })
      .select('name rollNumber branch cgpa email')
      .lean();

    // Map results with student details
    const resultsWithDetails = drive.results.map((result: any) => {
      const student = students.find((s: any) => s._id.toString() === result.studentId.toString());
      return {
        ...result,
        student: student || null,
      };
    });

    // Calculate statistics
    const totalRegistered = drive.registeredStudents.length;
    const totalResults = drive.results.length;
    const selectedCount = drive.results.filter((r: any) => r.status === 'selected').length;
    const rejectedCount = drive.results.filter((r: any) => r.status === 'rejected').length;
    const pendingCount = totalRegistered - totalResults;

    const responseData = {
      driveId: id,
      jobTitle: drive.jobTitle,
      company: drive.companyId,
      driveDate: drive.driveDate,
      status: drive.status,
      results: resultsWithDetails,
      statistics: {
        totalRegistered,
        totalResults,
        selected: selectedCount,
        rejected: rejectedCount,
        pending: pendingCount,
        selectionRate: totalRegistered > 0 ? ((selectedCount / totalRegistered) * 100).toFixed(2) : '0',
      }
    };

    return createSuccessResponse(responseData, 'Drive results retrieved successfully');

  } catch (error) {
    console.error('Get drive results error:', error);
    return createErrorResponse('Failed to retrieve drive results', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/drives/[id]/results - Submit drive results
export async function POST(
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
    const { results } = body; // Array of { studentId, status, score, feedback, ctc }

    // Validate results data
    if (!results || !Array.isArray(results) || results.length === 0) {
      return createErrorResponse('Results data is required and must be an array', 400, 'INVALID_RESULTS');
    }

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId });
    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    // Check if drive is completed
    if (drive.status !== 'completed') {
      return createErrorResponse('Cannot submit results for drive that is not completed', 400, 'DRIVE_NOT_COMPLETED');
    }

    // Validate each result
    const validStatuses = ['selected', 'rejected', 'waitlisted'];
    const processedResults = [];
    const studentIds = [];

    for (const result of results) {
      if (!result.studentId || !result.status) {
        return createErrorResponse('Each result must have studentId and status', 400, 'INVALID_RESULT_DATA');
      }

      if (!validStatuses.includes(result.status)) {
        return createErrorResponse(`Invalid status: ${result.status}. Must be one of: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
      }

      // Validate score if provided
      if (result.score !== undefined && (result.score < 0 || result.score > 100)) {
        return createErrorResponse('Score must be between 0 and 100', 400, 'INVALID_SCORE');
      }

      // Validate CTC if provided for selected students
      if (result.status === 'selected' && result.ctc && result.ctc < 0) {
        return createErrorResponse('CTC cannot be negative', 400, 'INVALID_CTC');
      }

      processedResults.push({
        studentId: result.studentId,
        status: result.status,
        score: result.score || null,
        feedback: result.feedback || '',
        ctc: result.ctc || null,
        submittedBy: user.userId,
        submittedAt: new Date(),
      });

      studentIds.push(result.studentId);
    }

    // Verify all students are registered for this drive
    const registeredStudentIds = drive.registeredStudents.map((id: any) => id.toString());
    const invalidStudents = studentIds.filter(id => !registeredStudentIds.includes(id.toString()));
    
    if (invalidStudents.length > 0) {
      return createErrorResponse(`Students not registered for this drive: ${invalidStudents.join(', ')}`, 400, 'INVALID_STUDENTS');
    }

    // Update drive with results
    drive.results = processedResults;
    drive.status = 'results_published';
    await drive.save();

    // Update student placement status
    const selectedStudents = processedResults.filter(r => r.status === 'selected');
    const selectedStudentIds = selectedStudents.map(r => r.studentId);

    if (selectedStudentIds.length > 0) {
      // Update each student individually to handle the ctc mapping
      for (const selectedStudent of selectedStudents) {
        await Student.findByIdAndUpdate(selectedStudent.studentId, {
          $set: { 
            isPlaced: true,
            placementDate: new Date(),
          },
          $push: {
            offers: {
              driveId: id,
              companyId: drive.companyId,
              jobTitle: drive.jobTitle,
              ctc: selectedStudent.ctc || null,
              status: 'accepted',
              date: new Date(),
            }
          }
        });
      }
    }

    // Prepare response data
    const responseData = {
      driveId: id,
      totalResults: processedResults.length,
      selectedCount: selectedStudents.length,
      rejectedCount: processedResults.filter(r => r.status === 'rejected').length,
      waitlistedCount: processedResults.filter(r => r.status === 'waitlisted').length,
      message: 'Results submitted successfully',
    };

    return createSuccessResponse(responseData, 'Drive results submitted successfully', 201);

  } catch (error) {
    console.error('Submit drive results error:', error);
    return createErrorResponse('Failed to submit drive results', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/drives/[id]/results - Update individual result
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
    const { studentId, status, score, feedback, ctc } = body;

    // Validate required fields
    if (!studentId || !status) {
      return createErrorResponse('Student ID and status are required', 400, 'MISSING_FIELDS');
    }

    // Validate status
    const validStatuses = ['selected', 'rejected', 'waitlisted'];
    if (!validStatuses.includes(status)) {
      return createErrorResponse(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId });
    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    // Find existing result
    const existingResultIndex = drive.results.findIndex((r: any) => r.studentId.toString() === studentId);
    
    if (existingResultIndex === -1) {
      return createErrorResponse('Result not found for this student', 404, 'RESULT_NOT_FOUND');
    }

    // Update result
    const updatedResult = {
      ...drive.results[existingResultIndex],
      status,
      score: score !== undefined ? score : drive.results[existingResultIndex].score,
      feedback: feedback !== undefined ? feedback : drive.results[existingResultIndex].feedback,
      ctc: ctc !== undefined ? ctc : drive.results[existingResultIndex].ctc,
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    drive.results[existingResultIndex] = updatedResult;
    await drive.save();

    // Update student placement status if needed
    if (status === 'selected') {
      await Student.findByIdAndUpdate(studentId, {
        $set: { 
          isPlaced: true,
          placementDate: new Date(),
        },
        $push: {
          offers: {
            driveId: id,
            companyId: drive.companyId,
            jobTitle: drive.jobTitle,
            ctc: ctc || null,
            status: 'accepted',
            date: new Date(),
          }
        }
      });
    } else if (status === 'rejected' || status === 'waitlisted') {
      // Remove placement status if previously selected
      await Student.findByIdAndUpdate(studentId, {
        $set: { isPlaced: false },
        $pull: {
          offers: { driveId: id }
        }
      });
    }

    return createSuccessResponse(updatedResult, 'Result updated successfully');

  } catch (error) {
    console.error('Update result error:', error);
    return createErrorResponse('Failed to update result', 500, 'INTERNAL_ERROR');
  }
} 