import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/request-helpers";
import dbConnect from "@/lib/mongoose";
import Training from "@/models/Training";
import { z } from "zod";

const updateTrainingSchema = z.object({
  title: z.string().min(1, "Training title is required").max(200, "Title too long").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  type: z.enum(["internal", "external"]).optional(),
  category: z.string().min(1, "Category is required").max(100, "Category too long").optional(),
  duration: z.number().min(1, "Duration must be at least 1 hour").optional(),
  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.string().datetime("Invalid end date").optional(),
  schedule: z.array(z.object({
    day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    time: z.string().min(1, "Time is required"),
  })).optional(),
  venue: z.string().optional(),
  trainerName: z.string().min(1, "Trainer name is required").optional(),
  trainerEmail: z.string().email("Invalid trainer email").optional(),
  maxParticipants: z.number().min(1, "Max participants must be at least 1").optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["upcoming", "ongoing", "completed"]).optional(),
  quizEnabled: z.boolean().optional(),
  certificateTemplate: z.string().optional(),
  completionCriteria: z.string().optional(),
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

    const training = await Training.findOne({
      _id: params.id,
      accountId,
    })
    .populate("registeredStudents.studentId", "name email rollNumber branch")
    .populate("attendance.studentId", "name email rollNumber")
    .lean() as any;

    if (!training) {
      return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
    }

    // Calculate statistics
    const registeredCount = training.registeredStudents?.length || 0;
    const attendanceStats = training.attendance?.reduce((acc: any, record: any) => {
      if (record.present) {
        acc.present++;
      } else {
        acc.absent++;
      }
      return acc;
    }, { present: 0, absent: 0 }) || { present: 0, absent: 0 };

    const attendanceRate = registeredCount > 0 ? (attendanceStats.present / registeredCount) * 100 : 0;

    return createSuccessResponse({
      training: {
        ...training,
        stats: {
          registeredCount,
          attendanceStats,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        },
      },
    }, 'Training retrieved successfully');
  } catch (error) {
    console.error("Error fetching training:", error);
    return createErrorResponse('Failed to retrieve training', 500, 'INTERNAL_ERROR');
  }
}

export async function PUT(
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

    const training = await Training.findOne({
      _id: params.id,
      accountId,
    });

    if (!training) {
      return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateTrainingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for date conflicts if dates are being updated
    if (data.startDate || data.endDate) {
      const startDate = data.startDate ? new Date(data.startDate) : training.startDate;
      const endDate = data.endDate ? new Date(data.endDate) : training.endDate;
      const venue = data.venue || training.venue;

      if (venue) {
        const existingTraining = await Training.findOne({
          _id: { $ne: params.id },
          accountId,
          venue: venue,
          status: { $in: ["upcoming", "ongoing"] },
          $or: [
            {
              startDate: { $lte: endDate },
              endDate: { $gte: startDate },
            },
          ],
        });

        if (existingTraining) {
          return createErrorResponse('Training schedule conflicts with existing training at this venue', 400, 'SCHEDULE_CONFLICT');
        }
      }
    }

    // Update training
    const updatedTraining = await Training.findByIdAndUpdate(
      params.id,
      {
        ...data,
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
      },
      { new: true, runValidators: true }
    ).populate("registeredStudents.studentId", "name email rollNumber");

    return createSuccessResponse(updatedTraining, 'Training updated successfully');
  } catch (error) {
    console.error("Error updating training:", error);
    return createErrorResponse('Failed to update training', 500, 'INTERNAL_ERROR');
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

    const training = await Training.findOne({
      _id: params.id,
      accountId,
    });

    if (!training) {
      return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
    }

    // Check if training can be deleted
    if (training.status === "ongoing") {
      return createErrorResponse('Cannot delete ongoing training', 400, 'INVALID_OPERATION');
    }

    if (training.registeredStudents && training.registeredStudents.length > 0) {
      return createErrorResponse('Cannot delete training with registered students', 400, 'INVALID_OPERATION');
    }

    await Training.findByIdAndDelete(params.id);

    return createSuccessResponse(null, 'Training deleted successfully');
  } catch (error) {
    console.error("Error deleting training:", error);
    return createErrorResponse('Failed to delete training', 500, 'INTERNAL_ERROR');
  }
} 