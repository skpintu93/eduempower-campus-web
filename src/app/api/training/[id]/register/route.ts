import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/request-helpers";
import dbConnect from "@/lib/mongoose";
import Training from "@/models/Training";
import Student from "@/models/Student";
import { z } from "zod";

const registrationSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
});

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

    // Validate input
    const validationResult = registrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { studentId } = validationResult.data;

    // Find training
    const training = await Training.findOne({
      _id: params.id,
      accountId,
    });

    if (!training) {
      return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
    }

    // Check if training is active and accepting registrations
    if (!training.isActive) {
      return createErrorResponse('Training is not active', 400, 'TRAINING_INACTIVE');
    }

    if (training.status !== "upcoming") {
      return createErrorResponse('Training is not accepting registrations', 400, 'REGISTRATION_CLOSED');
    }

    // Check if registration deadline has passed
    if (new Date() > training.startDate) {
      return createErrorResponse('Registration deadline has passed', 400, 'DEADLINE_PASSED');
    }

    // Find student
    const student = await Student.findOne({
      _id: studentId,
      accountId,
    });

    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Check if student is already registered
    const isAlreadyRegistered = training.registeredStudents?.some(
      (registration: any) => registration.studentId.toString() === studentId
    );

    if (isAlreadyRegistered) {
      return createErrorResponse('Student is already registered for this training', 400, 'ALREADY_REGISTERED');
    }

    // Check capacity
    const currentRegistrations = training.registeredStudents?.length || 0;
    if (currentRegistrations >= training.maxParticipants) {
      return createErrorResponse('Training is at full capacity', 400, 'CAPACITY_FULL');
    }

    // Register student
    if (!training.registeredStudents) {
      training.registeredStudents = [];
    }

    training.registeredStudents.push({
      studentId: studentId,
      registeredAt: new Date(),
    });

    await training.save();

    // Update student's training status
    if (!student.trainingStatus) {
      student.trainingStatus = [];
    }

    student.trainingStatus.push({
      trainingId: training._id,
      status: "registered",
    });

    await student.save();

    return createSuccessResponse({
      studentId,
      registeredAt: new Date(),
      trainingId: training._id,
    }, 'Student registered successfully');
  } catch (error) {
    console.error("Error registering student for training:", error);
    return createErrorResponse('Failed to register student for training', 500, 'INTERNAL_ERROR');
  }
}

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

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return createErrorResponse('Student ID is required', 400, 'MISSING_PARAMETER');
    }

    // Find training
    const training = await Training.findOne({
      _id: params.id,
      accountId,
    });

    if (!training) {
      return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
    }

    // Check if training allows withdrawals
    if (training.status === "ongoing" || training.status === "completed") {
      return createErrorResponse('Cannot withdraw from ongoing or completed training', 400, 'INVALID_OPERATION');
    }

    // Find and remove registration
    const registrationIndex = training.registeredStudents?.findIndex(
      (registration: any) => registration.studentId.toString() === studentId
    );

    if (registrationIndex === -1 || registrationIndex === undefined) {
      return createErrorResponse('Student is not registered for this training', 404, 'NOT_REGISTERED');
    }

    training.registeredStudents.splice(registrationIndex, 1);
    await training.save();

    // Update student's training status
    const student = await Student.findOne({
      _id: studentId,
      accountId,
    });

    if (student && student.trainingStatus) {
      const trainingStatusIndex = student.trainingStatus.findIndex(
        (status: any) => status.trainingId.toString() === params.id
      );

      if (trainingStatusIndex !== -1) {
        student.trainingStatus.splice(trainingStatusIndex, 1);
        await student.save();
      }
    }

    return createSuccessResponse(null, 'Student withdrawn from training successfully');
  } catch (error) {
    console.error("Error withdrawing student from training:", error);
    return createErrorResponse('Failed to withdraw student from training', 500, 'INTERNAL_ERROR');
  }
} 