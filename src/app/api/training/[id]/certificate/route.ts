import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/edge-helpers";
import dbConnect from "@/lib/mongoose";
import Training from "@/models/Training";
import Student from "@/models/Student";
import { z } from "zod";

const certificateSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  issueDate: z.string().datetime("Invalid issue date").optional(),
  certificateNumber: z.string().optional(),
  remarks: z.string().optional(),
});

const bulkCertificateSchema = z.object({
  studentIds: z.array(z.string().min(1, "Student ID is required")),
  issueDate: z.string().datetime("Invalid issue date").optional(),
  remarks: z.string().optional(),
});

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

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    // Find training
    const training = await Training.findOne({
      _id: params.id,
      accountId,
    })
    .populate("registeredStudents.studentId", "name email rollNumber branch")
    .lean() as any;

    if (!training) {
      return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
    }

    // Get certificate data
    const certificates = training.certificates || [];

    let certificateData = certificates;

    // Filter by student if provided
    if (studentId) {
      certificateData = certificates.filter((cert: any) => 
        cert.studentId.toString() === studentId
      );
    }

    // Calculate certificate statistics
    const totalEligible = training.registeredStudents?.length || 0;
    const totalCertificates = certificateData.length;
    const pendingCertificates = totalEligible - totalCertificates;

    return createSuccessResponse({
      certificates: certificateData,
      stats: {
        totalEligible,
        totalCertificates,
        pendingCertificates,
        certificateRate: totalEligible > 0 ? (totalCertificates / totalEligible) * 100 : 0,
      },
      training: {
        id: training._id,
        title: training.title,
        startDate: training.startDate,
        endDate: training.endDate,
        completionCriteria: training.completionCriteria,
      },
    }, 'Certificate data retrieved successfully');
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return createErrorResponse('Failed to retrieve certificate data', 500, 'INTERNAL_ERROR');
  }
}

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

    await dbConnect();

    const body = await request.json();

    // Check if it's bulk certificate generation or single certificate
    const isBulkGeneration = body.studentIds && Array.isArray(body.studentIds);

    if (isBulkGeneration) {
      // Handle bulk certificate generation
      const validationResult = bulkCertificateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { studentIds, issueDate, remarks } = validationResult.data;

      // Find training
      const training = await Training.findOne({
        _id: params.id,
        accountId,
      });

      if (!training) {
        return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
      }

      // Check if training is completed
      if (training.status !== "completed") {
        return createErrorResponse('Certificates can only be generated for completed training', 400, 'INVALID_OPERATION');
      }

      // Validate that all students are registered and eligible
      const registeredStudentIds = training.registeredStudents?.map(
        (registration: any) => registration.studentId.toString()
      ) || [];

      const invalidStudents = studentIds.filter(
        (id) => !registeredStudentIds.includes(id)
      );

      if (invalidStudents.length > 0) {
        return createErrorResponse('Some students are not registered for this training', 400, 'INVALID_STUDENTS');
      }

      // Check completion criteria for each student
      const eligibleStudents = [];
      const ineligibleStudents = [];

      for (const studentId of studentIds) {
        const isEligible = await checkCompletionCriteria(training, studentId);
        if (isEligible) {
          eligibleStudents.push(studentId);
        } else {
          ineligibleStudents.push(studentId);
        }
      }

      if (ineligibleStudents.length > 0) {
        return NextResponse.json(
          { 
            error: "Some students do not meet completion criteria",
            code: 'INELIGIBLE_STUDENTS',
            ineligibleStudents,
            eligibleStudents,
          },
          { status: 400 }
        );
      }

      // Initialize certificates array if not exists
      if (!training.certificates) {
        training.certificates = [];
      }

      const certificateDate = issueDate ? new Date(issueDate) : new Date();
      const results = [];

      for (const studentId of eligibleStudents) {
        // Check if certificate already exists
        const existingCertificate = training.certificates.find(
          (cert: any) => cert.studentId.toString() === studentId
        );

        if (existingCertificate) {
          results.push({ studentId, action: "already_exists" });
          continue;
        }

        // Generate certificate number
        const certificateNumber = generateCertificateNumber(training, studentId);

        const certificateData = {
          studentId,
          certificateNumber,
          issueDate: certificateDate,
          remarks: remarks || "",
          issuedBy: user.userId,
          issuedAt: new Date(),
        };

        training.certificates.push(certificateData);
        results.push({ studentId, action: "generated", certificateNumber });
      }

      await training.save();

      return createSuccessResponse({
        results,
        date: certificateDate,
      }, 'Bulk certificates generated successfully');
    } else {
      // Handle single certificate generation
      const validationResult = certificateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { studentId, issueDate, certificateNumber, remarks } = validationResult.data;

      // Find training
      const training = await Training.findOne({
        _id: params.id,
        accountId,
      });

      if (!training) {
        return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
      }

      // Check if training is completed
      if (training.status !== "completed") {
        return createErrorResponse('Certificates can only be generated for completed training', 400, 'INVALID_OPERATION');
      }

      // Check if student is registered
      const isRegistered = training.registeredStudents?.some(
        (registration: any) => registration.studentId.toString() === studentId
      );

      if (!isRegistered) {
        return createErrorResponse('Student is not registered for this training', 400, 'STUDENT_NOT_REGISTERED');
      }

      // Check completion criteria
      const isEligible = await checkCompletionCriteria(training, studentId);
      if (!isEligible) {
        return createErrorResponse('Student does not meet completion criteria', 400, 'INELIGIBLE_STUDENT');
      }

      // Initialize certificates array if not exists
      if (!training.certificates) {
        training.certificates = [];
      }

      // Check if certificate already exists
      const existingCertificate = training.certificates.find(
        (cert: any) => cert.studentId.toString() === studentId
      );

      if (existingCertificate) {
        return createErrorResponse('Certificate already exists for this student', 400, 'CERTIFICATE_EXISTS');
      }

      const certificateDate = issueDate ? new Date(issueDate) : new Date();
      const generatedCertificateNumber = certificateNumber || generateCertificateNumber(training, studentId);

      const certificateData = {
        studentId,
        certificateNumber: generatedCertificateNumber,
        issueDate: certificateDate,
        remarks: remarks || "",
        issuedBy: user.userId,
        issuedAt: new Date(),
      };

      training.certificates.push(certificateData);
      await training.save();

      return createSuccessResponse(certificateData, 'Certificate generated successfully');
    }
  } catch (error) {
    console.error("Error generating certificate:", error);
    return createErrorResponse('Failed to generate certificate', 500, 'INTERNAL_ERROR');
  }
}

// Helper function to check completion criteria
async function checkCompletionCriteria(training: any, studentId: string): Promise<boolean> {
  // Default criteria: 75% attendance rate
  const defaultAttendanceRate = 75;

  if (!training.attendance) {
    return false;
  }

  // Get student's attendance records
  const studentAttendance = training.attendance.filter(
    (record: any) => record.studentId.toString() === studentId
  );

  if (studentAttendance.length === 0) {
    return false;
  }

  // Calculate attendance rate
  const totalSessions = studentAttendance.length;
  const presentSessions = studentAttendance.filter((record: any) => record.present).length;
  const attendanceRate = (presentSessions / totalSessions) * 100;

  return attendanceRate >= defaultAttendanceRate;
}

// Helper function to generate certificate number
function generateCertificateNumber(training: any, studentId: string): string {
  const trainingId = training._id.toString().slice(-6);
  const studentIdSuffix = studentId.slice(-4);
  const timestamp = Date.now().toString().slice(-6);
  
  return `CERT-${trainingId}-${studentIdSuffix}-${timestamp}`;
} 