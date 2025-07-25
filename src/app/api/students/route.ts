import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { Student, Account } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/students - List students with pagination, filtering, and search
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
    const branch = searchParams.get('branch') || '';
    const semester = searchParams.get('semester') || '';
    const minCGPA = searchParams.get('minCGPA') || '';
    const maxCGPA = searchParams.get('maxCGPA') || '';
    const isPlaced = searchParams.get('isPlaced') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
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
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Add filters
    if (branch) query.branch = branch;
    if (semester) query.semester = parseInt(semester);
    if (minCGPA) query.cgpa = { $gte: parseFloat(minCGPA) };
    if (maxCGPA) {
      if (query.cgpa) {
        query.cgpa.$lte = parseFloat(maxCGPA);
      } else {
        query.cgpa = { $lte: parseFloat(maxCGPA) };
      }
    }
    if (isPlaced !== '') query.isPlaced = isPlaced === 'true';

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [students, total] = await Promise.all([
      Student.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Student.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Prepare response data
    const responseData = {
      students,
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
        isPlaced,
        sortBy,
        sortOrder,
      }
    };

    return createSuccessResponse(responseData, 'Students retrieved successfully');

  } catch (error) {
    console.error('Get students error:', error);
    return createErrorResponse('Failed to retrieve students', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/students - Create new student
export async function POST(request: NextRequest) {
  try {
    // Require authentication with appropriate role
    const user = await requireAuth(request);
    const allowedRoles = ['admin', 'tpo', 'faculty'];
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
      name,
      email,
      phone,
      rollNumber,
      branch,
      semester,
      cgpa,
      backlogs = 0,
      batchYear,
      section,
      dateOfBirth,
      gender,
      technicalSkills = [],
      softSkills = [],
      languages = [],
    } = body;

    // Validate required fields
    if (!name || !email || !phone || !rollNumber || !branch || !semester || !cgpa || !batchYear) {
      return createErrorResponse('Missing required fields', 400, 'MISSING_FIELDS');
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Validate phone format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return createErrorResponse('Invalid phone number format', 400, 'INVALID_PHONE');
    }

    // Validate CGPA range
    if (cgpa < 0 || cgpa > 10) {
      return createErrorResponse('CGPA must be between 0 and 10', 400, 'INVALID_CGPA');
    }

    // Validate semester range
    if (semester < 1 || semester > 8) {
      return createErrorResponse('Semester must be between 1 and 8', 400, 'INVALID_SEMESTER');
    }

    // Connect to database
    await dbConnect();

    // Check for duplicate roll number in the same account
    const existingRollNumber = await Student.findOne({ rollNumber, accountId });
    if (existingRollNumber) {
      return createErrorResponse('Student with this roll number already exists', 409, 'DUPLICATE_ROLL_NUMBER');
    }

    // Check for duplicate email in the same account
    const existingEmail = await Student.findOne({ email: email.toLowerCase(), accountId });
    if (existingEmail) {
      return createErrorResponse('Student with this email already exists', 409, 'DUPLICATE_EMAIL');
    }

    // Create new student
    const newStudent = new Student({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      rollNumber: rollNumber.trim(),
      branch: branch.trim(),
      semester,
      cgpa,
      backlogs,
      batchYear,
      section: section?.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      technicalSkills,
      softSkills,
      languages,
      accountId,
      isPlaced: false,
      registeredDrives: [],
      offers: [],
      trainingStatus: [],
    });

    // Save student
    await newStudent.save();

    // Return created student (without sensitive fields)
    const studentResponse = {
      id: newStudent._id,
      name: newStudent.name,
      email: newStudent.email,
      phone: newStudent.phone,
      rollNumber: newStudent.rollNumber,
      branch: newStudent.branch,
      semester: newStudent.semester,
      cgpa: newStudent.cgpa,
      backlogs: newStudent.backlogs,
      batchYear: newStudent.batchYear,
      section: newStudent.section,
      isPlaced: newStudent.isPlaced,
      createdAt: newStudent.createdAt,
    };

    return createSuccessResponse(studentResponse, 'Student created successfully', 201);

  } catch (error) {
    console.error('Create student error:', error);
    return createErrorResponse('Failed to create student', 500, 'INTERNAL_ERROR');
  }
} 