import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { Student } from '@/models';
import dbConnect from '@/lib/mongoose';

// POST /api/students/bulk-import - Bulk import students from CSV/Excel
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
    const { students, options = {} } = body;

    // Validate students data
    if (!students || !Array.isArray(students) || students.length === 0) {
      return createErrorResponse('Students data is required and must be an array', 400, 'INVALID_DATA');
    }

    if (students.length > 1000) {
      return createErrorResponse('Maximum 1000 students can be imported at once', 400, 'TOO_MANY_STUDENTS');
    }

    // Connect to database
    await dbConnect();

    const results = {
      total: students.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      duplicates: [] as any[],
      imported: [] as any[],
    };

    // Process students in batches
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < students.length; i += batchSize) {
      batches.push(students.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchResults = await processStudentBatch(batch, accountId, options);
      
      results.successful += batchResults.successful;
      results.failed += batchResults.failed;
      results.errors.push(...batchResults.errors);
      results.duplicates.push(...batchResults.duplicates);
      results.imported.push(...batchResults.imported);
    }

    // Prepare response data
    const responseData = {
      importId: `import_${Date.now()}_${user.userId}`,
      summary: {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        successRate: results.total > 0 ? ((results.successful / results.total) * 100).toFixed(2) : '0',
      },
      details: {
        errors: results.errors.slice(0, 10), // Limit error details
        duplicates: results.duplicates.slice(0, 10), // Limit duplicate details
        imported: results.imported.slice(0, 10), // Limit imported details
      },
      message: `Import completed. ${results.successful} students imported successfully, ${results.failed} failed.`,
    };

    return createSuccessResponse(responseData, 'Bulk import completed', 201);

  } catch (error) {
    console.error('Bulk import error:', error);
    return createErrorResponse('Failed to process bulk import', 500, 'INTERNAL_ERROR');
  }
}

// Helper function to process a batch of students
async function processStudentBatch(students: any[], accountId: string, options: any) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as any[],
    duplicates: [] as any[],
    imported: [] as any[],
  };

  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];
    const rowNumber = i + 1;

    try {
      // Validate required fields
      const validationResult = validateStudentData(studentData, rowNumber);
      if (!validationResult.isValid) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: validationResult.error,
          data: studentData,
        });
        continue;
      }

      // Check for duplicates
      const duplicateCheck = await checkDuplicates(studentData, accountId);
      if (duplicateCheck.hasDuplicates) {
        results.failed++;
        results.duplicates.push({
          row: rowNumber,
          type: duplicateCheck.type,
          existingData: duplicateCheck.existingData,
          newData: studentData,
        });
        continue;
      }

      // Create student
      const newStudent = new Student({
        name: studentData.name.trim(),
        email: studentData.email.toLowerCase(),
        phone: studentData.phone?.trim(),
        rollNumber: studentData.rollNumber.trim(),
        branch: studentData.branch.trim(),
        semester: parseInt(studentData.semester),
        cgpa: parseFloat(studentData.cgpa),
        backlogs: parseInt(studentData.backlogs || '0'),
        batchYear: parseInt(studentData.batchYear),
        gender: studentData.gender || 'not_specified',
        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : undefined,
        address: studentData.address?.trim(),
        city: studentData.city?.trim(),
        state: studentData.state?.trim(),
        pincode: studentData.pincode?.trim(),
        technicalSkills: studentData.technicalSkills ? studentData.technicalSkills.split(',').map((s: string) => s.trim()) : [],
        softSkills: studentData.softSkills ? studentData.softSkills.split(',').map((s: string) => s.trim()) : [],
        linkedinUrl: studentData.linkedinUrl?.trim(),
        githubUrl: studentData.githubUrl?.trim(),
        portfolioUrl: studentData.portfolioUrl?.trim(),
        accountId,
        isPlaced: false,
        isActive: true,
        registeredDrives: [],
        offers: [],
        createdAt: new Date(),
      });

      await newStudent.save();

      results.successful++;
      results.imported.push({
        row: rowNumber,
        studentId: newStudent._id,
        name: newStudent.name,
        rollNumber: newStudent.rollNumber,
        email: newStudent.email,
      });

    } catch (error) {
      results.failed++;
      results.errors.push({
        row: rowNumber,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: studentData,
      });
    }
  }

  return results;
}

// Helper function to validate student data
function validateStudentData(data: any, rowNumber: number) {
  // Check required fields
  const requiredFields = ['name', 'email', 'rollNumber', 'branch', 'semester', 'cgpa', 'batchYear'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return {
        isValid: false,
        error: `Missing required field: ${field}`,
      };
    }
  }

  // Validate email format
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(data.email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  // Validate phone format if provided
  if (data.phone) {
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(data.phone)) {
      return {
        isValid: false,
        error: 'Invalid phone format',
      };
    }
  }

  // Validate numeric fields
  const semester = parseInt(data.semester);
  if (isNaN(semester) || semester < 1 || semester > 8) {
    return {
      isValid: false,
      error: 'Semester must be between 1 and 8',
    };
  }

  const cgpa = parseFloat(data.cgpa);
  if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
    return {
      isValid: false,
      error: 'CGPA must be between 0 and 10',
    };
  }

  const batchYear = parseInt(data.batchYear);
  const currentYear = new Date().getFullYear();
  if (isNaN(batchYear) || batchYear < currentYear - 10 || batchYear > currentYear + 2) {
    return {
      isValid: false,
      error: 'Batch year must be reasonable',
    };
  }

  // Validate backlogs if provided
  if (data.backlogs) {
    const backlogs = parseInt(data.backlogs);
    if (isNaN(backlogs) || backlogs < 0) {
      return {
        isValid: false,
        error: 'Backlogs must be a non-negative number',
      };
    }
  }

  return { isValid: true };
}

// Helper function to check for duplicates
async function checkDuplicates(data: any, accountId: string) {
  // Check for duplicate roll number
  const existingRollNumber = await Student.findOne({ 
    rollNumber: data.rollNumber.trim(), 
    accountId 
  });

  if (existingRollNumber) {
    return {
      hasDuplicates: true,
      type: 'rollNumber',
      existingData: {
        id: existingRollNumber._id,
        name: existingRollNumber.name,
        email: existingRollNumber.email,
        rollNumber: existingRollNumber.rollNumber,
      },
    };
  }

  // Check for duplicate email
  const existingEmail = await Student.findOne({ 
    email: data.email.toLowerCase(), 
    accountId 
  });

  if (existingEmail) {
    return {
      hasDuplicates: true,
      type: 'email',
      existingData: {
        id: existingEmail._id,
        name: existingEmail.name,
        email: existingEmail.email,
        rollNumber: existingEmail.rollNumber,
      },
    };
  }

  return { hasDuplicates: false };
}

// GET /api/students/bulk-import - Get import template
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    
    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    // Return CSV template
    const csvTemplate = `name,email,phone,rollNumber,branch,semester,cgpa,backlogs,batchYear,gender,dateOfBirth,address,city,state,pincode,technicalSkills,softSkills,linkedinUrl,githubUrl,portfolioUrl
John Doe,john.doe@example.com,9876543210,2021CS001,Computer Science,6,8.5,0,2021,male,2000-01-01,123 Main St,Mumbai,Maharashtra,400001,"JavaScript,Python,React","Leadership,Communication",https://linkedin.com/in/johndoe,https://github.com/johndoe,https://johndoe.dev
Jane Smith,jane.smith@example.com,9876543211,2021CS002,Computer Science,6,8.2,1,2021,female,2000-02-15,456 Oak Ave,Delhi,Delhi,110001,"Java,Spring Boot,MySQL","Teamwork,Problem Solving",https://linkedin.com/in/janesmith,https://github.com/janesmith,https://janesmith.dev`;

    const responseData = {
      template: csvTemplate,
      requiredFields: [
        'name', 'email', 'rollNumber', 'branch', 'semester', 'cgpa', 'batchYear'
      ],
      optionalFields: [
        'phone', 'backlogs', 'gender', 'dateOfBirth', 'address', 'city', 'state', 
        'pincode', 'technicalSkills', 'softSkills', 'linkedinUrl', 'githubUrl', 'portfolioUrl'
      ],
      fieldDescriptions: {
        name: 'Full name of the student',
        email: 'Valid email address (must be unique)',
        phone: 'Phone number (optional)',
        rollNumber: 'Student roll number (must be unique)',
        branch: 'Academic branch (e.g., Computer Science, Mechanical)',
        semester: 'Current semester (1-8)',
        cgpa: 'Current CGPA (0-10)',
        backlogs: 'Number of backlogs (optional, default: 0)',
        batchYear: 'Batch year (e.g., 2021)',
        gender: 'Gender (male/female/other/not_specified)',
        dateOfBirth: 'Date of birth (YYYY-MM-DD format)',
        address: 'Address (optional)',
        city: 'City (optional)',
        state: 'State (optional)',
        pincode: 'Pincode (optional)',
        technicalSkills: 'Comma-separated technical skills (optional)',
        softSkills: 'Comma-separated soft skills (optional)',
        linkedinUrl: 'LinkedIn profile URL (optional)',
        githubUrl: 'GitHub profile URL (optional)',
        portfolioUrl: 'Portfolio website URL (optional)',
      },
      validationRules: {
        maxStudents: 1000,
        maxFileSize: '10MB',
        supportedFormats: ['CSV', 'Excel'],
        emailFormat: 'Must be valid email format',
        rollNumberFormat: 'Must be unique within account',
        cgpaRange: '0-10',
        semesterRange: '1-8',
        batchYearRange: 'Current year - 10 to current year + 2',
      }
    };

    return createSuccessResponse(responseData, 'Import template retrieved successfully');

  } catch (error) {
    console.error('Get import template error:', error);
    return createErrorResponse('Failed to retrieve import template', 500, 'INTERNAL_ERROR');
  }
} 