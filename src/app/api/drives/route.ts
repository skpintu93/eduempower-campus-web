import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import { PlacementDrive, Company } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/drives - List placement drives with pagination, filtering, and search
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    
    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const companyId = searchParams.get('companyId') || '';
    const status = searchParams.get('status') || '';
    const jobType = searchParams.get('jobType') || '';
    const minCTC = searchParams.get('minCTC') || '';
    const maxCTC = searchParams.get('maxCTC') || '';
    const driveDate = searchParams.get('driveDate') || '';
    const sortBy = searchParams.get('sortBy') || 'driveDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return createErrorResponse('Invalid pagination parameters', 400, 'INVALID_PAGINATION');
    }

    // Connect to database
    await dbConnect();

    // Build query
    const query: any = { accountId };

    // Add search filter
    if (search) {
      query.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { jobDescription: { $regex: search, $options: 'i' } },
        { jobLocation: { $regex: search, $options: 'i' } },
      ];
    }

    // Add filters
    if (companyId) query.companyId = companyId;
    if (status) query.status = status;
    if (jobType) query.jobType = jobType;
    if (driveDate) {
      const date = new Date(driveDate);
      query.driveDate = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      };
    }

    // CTC range filter
    if (minCTC || maxCTC) {
      query['ctc.min'] = {};
      if (minCTC) query['ctc.min'].$gte = parseFloat(minCTC);
      if (maxCTC) query['ctc.max'].$lte = parseFloat(maxCTC);
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [drives, total] = await Promise.all([
      PlacementDrive.find(query)
        .populate('companyId', 'name industry size logo')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      PlacementDrive.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Prepare response data
    const responseData = {
      drives,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search,
        companyId,
        status,
        jobType,
        minCTC,
        maxCTC,
        driveDate,
        sortBy,
        sortOrder,
      }
    };

    return createSuccessResponse(responseData, 'Placement drives retrieved successfully');

  } catch (error) {
    console.error('Get drives error:', error);
    return createErrorResponse('Failed to retrieve placement drives', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/drives - Create new placement drive
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const {
      companyId,
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
    } = body;

    // Validate required fields
    if (!companyId || !jobTitle || !jobDescription || !minCGPA || !maxBacklogs || !eligibleBranches || !registrationDeadline || !driveDate) {
      return createErrorResponse('Missing required fields', 400, 'MISSING_FIELDS');
    }

    // Validate CGPA range
    if (minCGPA < 0 || minCGPA > 10) {
      return createErrorResponse('Minimum CGPA must be between 0 and 10', 400, 'INVALID_CGPA');
    }

    // Validate backlogs
    if (maxBacklogs < 0) {
      return createErrorResponse('Maximum backlogs cannot be negative', 400, 'INVALID_BACKLOGS');
    }

    // Validate dates
    const now = new Date();
    const regDeadline = new Date(registrationDeadline);
    const driveDateObj = new Date(driveDate);

    if (regDeadline <= now) {
      return createErrorResponse('Registration deadline must be in the future', 400, 'INVALID_REGISTRATION_DEADLINE');
    }

    if (driveDateObj <= regDeadline) {
      return createErrorResponse('Drive date must be after registration deadline', 400, 'INVALID_DRIVE_DATE');
    }

    // Connect to database
    await dbConnect();

    // Verify company exists and is approved
    const company = await Company.findOne({ _id: companyId, accountId, isApproved: true });
    if (!company) {
      return createErrorResponse('Company not found or not approved', 404, 'COMPANY_NOT_FOUND');
    }

    // Create new placement drive
    const newDrive = new PlacementDrive({
      companyId,
      jobTitle: jobTitle.trim(),
      jobDescription: jobDescription.trim(),
      jobLocation: jobLocation?.trim(),
      ctc: ctc || { min: 0, max: 0 },
      jobType: jobType || 'full-time',
      minCGPA,
      maxBacklogs,
      eligibleBranches,
      eligibleSemesters: eligibleSemesters || [],
      requiredSkills: requiredSkills || [],
      registrationDeadline: regDeadline,
      testDate: testDate ? new Date(testDate) : undefined,
      interviewRounds: interviewRounds || [],
      driveDate: driveDateObj,
      accountId,
      isActive: true,
      status: 'draft',
      registeredStudents: [],
      results: [],
    });

    // Save drive
    await newDrive.save();

    // Populate company details for response
    await newDrive.populate('companyId', 'name industry size logo');

    // Return created drive
    const driveResponse = {
      id: newDrive._id,
      companyId: newDrive.companyId,
      jobTitle: newDrive.jobTitle,
      jobDescription: newDrive.jobDescription,
      jobLocation: newDrive.jobLocation,
      ctc: newDrive.ctc,
      jobType: newDrive.jobType,
      minCGPA: newDrive.minCGPA,
      maxBacklogs: newDrive.maxBacklogs,
      eligibleBranches: newDrive.eligibleBranches,
      eligibleSemesters: newDrive.eligibleSemesters,
      requiredSkills: newDrive.requiredSkills,
      registrationDeadline: newDrive.registrationDeadline,
      testDate: newDrive.testDate,
      interviewRounds: newDrive.interviewRounds,
      driveDate: newDrive.driveDate,
      isActive: newDrive.isActive,
      status: newDrive.status,
      createdAt: newDrive.createdAt,
    };

    return createSuccessResponse(driveResponse, 'Placement drive created successfully', 201);

  } catch (error) {
    console.error('Create drive error:', error);
    return createErrorResponse('Failed to create placement drive', 500, 'INTERNAL_ERROR');
  }
} 