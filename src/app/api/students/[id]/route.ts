import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import { Student } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/students/[id] - Get student by ID
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

    // Validate student ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid student ID', 400, 'INVALID_ID');
    }

    // Connect to database
    await dbConnect();

    // Find student by ID and account
    const student = await Student.findOne({ _id: id, accountId })
      .select('-__v')
      .lean();

    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    return createSuccessResponse(student, 'Student retrieved successfully');

  } catch (error) {
    console.error('Get student error:', error);
    return createErrorResponse('Failed to retrieve student', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/students/[id] - Update student
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Validate student ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid student ID', 400, 'INVALID_ID');
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
      backlogs,
      batchYear,
      section,
      dateOfBirth,
      gender,
      technicalSkills,
      softSkills,
      languages,
      resume,
      certificates,
      documents,
      isPlaced,
      placementDate,
    } = body;

    // Connect to database
    await dbConnect();

    // Find student by ID and account
    const student = await Student.findOne({ _id: id, accountId });
    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return createErrorResponse('Invalid email format', 400, 'INVALID_EMAIL');
      }
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return createErrorResponse('Invalid phone number format', 400, 'INVALID_PHONE');
      }
    }

    // Validate CGPA range if provided
    if (cgpa !== undefined && (cgpa < 0 || cgpa > 10)) {
      return createErrorResponse('CGPA must be between 0 and 10', 400, 'INVALID_CGPA');
    }

    // Validate semester range if provided
    if (semester !== undefined && (semester < 1 || semester > 8)) {
      return createErrorResponse('Semester must be between 1 and 8', 400, 'INVALID_SEMESTER');
    }

    // Check for duplicate roll number if provided
    if (rollNumber && rollNumber !== student.rollNumber) {
      const existingRollNumber = await Student.findOne({ rollNumber, accountId, _id: { $ne: id } });
      if (existingRollNumber) {
        return createErrorResponse('Student with this roll number already exists', 409, 'DUPLICATE_ROLL_NUMBER');
      }
    }

    // Check for duplicate email if provided
    if (email && email !== student.email) {
      const existingEmail = await Student.findOne({ email: email.toLowerCase(), accountId, _id: { $ne: id } });
      if (existingEmail) {
        return createErrorResponse('Student with this email already exists', 409, 'DUPLICATE_EMAIL');
      }
    }

    // Update student fields
    const updateFields: any = {};
    
    if (name !== undefined) updateFields.name = name.trim();
    if (email !== undefined) updateFields.email = email.toLowerCase();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (rollNumber !== undefined) updateFields.rollNumber = rollNumber.trim();
    if (branch !== undefined) updateFields.branch = branch.trim();
    if (semester !== undefined) updateFields.semester = semester;
    if (cgpa !== undefined) updateFields.cgpa = cgpa;
    if (backlogs !== undefined) updateFields.backlogs = backlogs;
    if (batchYear !== undefined) updateFields.batchYear = batchYear;
    if (section !== undefined) updateFields.section = section?.trim();
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (gender !== undefined) updateFields.gender = gender;
    if (technicalSkills !== undefined) updateFields.technicalSkills = technicalSkills;
    if (softSkills !== undefined) updateFields.softSkills = softSkills;
    if (languages !== undefined) updateFields.languages = languages;
    if (resume !== undefined) updateFields.resume = resume;
    if (certificates !== undefined) updateFields.certificates = certificates;
    if (documents !== undefined) updateFields.documents = documents;
    if (isPlaced !== undefined) updateFields.isPlaced = isPlaced;
    if (placementDate !== undefined) updateFields.placementDate = placementDate ? new Date(placementDate) : undefined;

    // Update student
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-__v');

    return createSuccessResponse(updatedStudent, 'Student updated successfully');

  } catch (error) {
    console.error('Update student error:', error);
    return createErrorResponse('Failed to update student', 500, 'INTERNAL_ERROR');
  }
}

// DELETE /api/students/[id] - Soft delete student
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

    // Validate student ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid student ID', 400, 'INVALID_ID');
    }

    // Connect to database
    await dbConnect();

    // Find student by ID and account
    const student = await Student.findOne({ _id: id, accountId });
    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Check for dependencies (registered drives, offers, etc.)
    const hasDependencies = 
      student.registeredDrives.length > 0 ||
      student.offers.length > 0 ||
      student.trainingStatus.length > 0;

    if (hasDependencies) {
      return createErrorResponse(
        'Cannot delete student with existing placements, drives, or training records. Consider archiving instead.',
        400,
        'HAS_DEPENDENCIES'
      );
    }

    // Soft delete by setting a deleted flag (we'll add this to the model)
    // For now, we'll actually delete the record
    await Student.findByIdAndDelete(id);

    return createSuccessResponse(
      { message: 'Student deleted successfully' },
      'Student deleted successfully'
    );

  } catch (error) {
    console.error('Delete student error:', error);
    return createErrorResponse('Failed to delete student', 500, 'INTERNAL_ERROR');
  }
} 