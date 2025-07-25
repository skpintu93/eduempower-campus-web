import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import { PlacementDrive, Student } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/drives/[id]/eligible-students - Get eligible students for drive
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const branch = searchParams.get('branch') || '';
    const semester = searchParams.get('semester') || '';
    const minCGPA = searchParams.get('minCGPA') || '';
    const maxCGPA = searchParams.get('maxCGPA') || '';
    const sortBy = searchParams.get('sortBy') || 'cgpa';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return createErrorResponse('Invalid pagination parameters', 400, 'INVALID_PAGINATION');
    }

    // Connect to database
    await dbConnect();

    // Find drive by ID and account
    const drive = await PlacementDrive.findOne({ _id: id, accountId })
      .populate('companyId', 'name industry')
      .select('jobTitle companyId minCGPA maxBacklogs eligibleBranches eligibleSemesters requiredSkills registrationDeadline')
      .lean() as any;

    if (!drive) {
      return createErrorResponse('Placement drive not found', 404, 'DRIVE_NOT_FOUND');
    }

    // Check if registration is still open
    const now = new Date();
    if (now > drive.registrationDeadline) {
      return createErrorResponse('Registration deadline has passed', 400, 'REGISTRATION_CLOSED');
    }

    // Build eligibility query
    const eligibilityQuery: any = { 
      accountId,
      isPlaced: false, // Only unplaced students
    };

    // Apply CGPA filter
    eligibilityQuery.cgpa = { $gte: drive.minCGPA };

    // Apply backlogs filter
    eligibilityQuery.backlogs = { $lte: drive.maxBacklogs };

    // Apply branch filter
    if (drive.eligibleBranches && drive.eligibleBranches.length > 0) {
      eligibilityQuery.branch = { $in: drive.eligibleBranches };
    }

    // Apply semester filter
    if (drive.eligibleSemesters && drive.eligibleSemesters.length > 0) {
      eligibilityQuery.semester = { $in: drive.eligibleSemesters };
    }

    // Add search filter
    if (search) {
      eligibilityQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Add additional filters
    if (branch) eligibilityQuery.branch = branch;
    if (semester) eligibilityQuery.semester = parseInt(semester);
    if (minCGPA) eligibilityQuery.cgpa.$gte = parseFloat(minCGPA);
    if (maxCGPA) eligibilityQuery.cgpa.$lte = parseFloat(maxCGPA);

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [students, total] = await Promise.all([
      Student.find(eligibilityQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('name rollNumber branch semester cgpa backlogs email phone technicalSkills softSkills')
        .lean(),
      Student.countDocuments(eligibilityQuery)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Check if students are already registered for this drive
    const registeredStudentIds = drive.registeredStudents || [];
    const studentsWithRegistrationStatus = students.map((student: any) => {
      const isRegistered = registeredStudentIds.some((id: any) => id.toString() === student._id.toString());
      
      // Calculate skill match score
      let skillMatchScore = 0;
      if (drive.requiredSkills && drive.requiredSkills.length > 0) {
        const studentSkills = [
          ...(student.technicalSkills || []),
          ...(student.softSkills || [])
        ];
        
        const matchingSkills = drive.requiredSkills.filter((skill: string) =>
          studentSkills.some(studentSkill => 
            studentSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        
        skillMatchScore = (matchingSkills.length / drive.requiredSkills.length) * 100;
      }

      return {
        ...student,
        isRegistered,
        skillMatchScore: Math.round(skillMatchScore),
        eligibilityStatus: 'eligible',
        eligibilityReason: 'Meets all criteria',
      };
    });

    // Sort by skill match score if available
    if (drive.requiredSkills && drive.requiredSkills.length > 0) {
      studentsWithRegistrationStatus.sort((a, b) => b.skillMatchScore - a.skillMatchScore);
    }

    // Prepare response data
    const responseData = {
      driveId: id,
      jobTitle: drive.jobTitle,
      company: drive.companyId,
      eligibilityCriteria: {
        minCGPA: drive.minCGPA,
        maxBacklogs: drive.maxBacklogs,
        eligibleBranches: drive.eligibleBranches,
        eligibleSemesters: drive.eligibleSemesters,
        requiredSkills: drive.requiredSkills,
        registrationDeadline: drive.registrationDeadline,
      },
      students: studentsWithRegistrationStatus,
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
        branch,
        semester,
        minCGPA,
        maxCGPA,
        sortBy,
        sortOrder,
      },
      statistics: {
        totalEligible: total,
        registeredCount: studentsWithRegistrationStatus.filter(s => s.isRegistered).length,
        unregisteredCount: studentsWithRegistrationStatus.filter(s => !s.isRegistered).length,
        averageCGPA: students.length > 0 
          ? (students.reduce((sum, student) => sum + student.cgpa, 0) / students.length).toFixed(2)
          : 0,
        averageSkillMatch: studentsWithRegistrationStatus.length > 0
          ? (studentsWithRegistrationStatus.reduce((sum, student) => sum + student.skillMatchScore, 0) / studentsWithRegistrationStatus.length).toFixed(2)
          : 0,
      }
    };

    return createSuccessResponse(responseData, 'Eligible students retrieved successfully');

  } catch (error) {
    console.error('Get eligible students error:', error);
    return createErrorResponse('Failed to retrieve eligible students', 500, 'INTERNAL_ERROR');
  }
} 