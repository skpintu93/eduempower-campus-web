import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/edge-helpers";
import dbConnect from "@/lib/mongoose";
import Assessment from "@/models/Assessment";
import { z } from "zod";

const updateAssessmentSchema = z.object({
  title: z.string().min(1, "Assessment title is required").max(200, "Title too long").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  type: z.enum(["aptitude", "technical", "coding", "interview", "group_discussion", "other"]).optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute").optional(),
  totalMarks: z.number().min(1, "Total marks must be at least 1").optional(),
  passingMarks: z.number().min(0, "Passing marks cannot be negative").optional(),
  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.string().datetime("Invalid end date").optional(),
  venue: z.string().min(1, "Venue is required").optional(),
  maxParticipants: z.number().min(1, "Max participants must be at least 1").optional(),
  instructions: z.array(z.string()).optional(),
  criteria: z.object({
    cgpa: z.number().min(0).max(10).optional(),
    backlogs: z.number().min(0).optional(),
    branches: z.array(z.string()).optional(),
    semesters: z.array(z.number()).optional(),
  }).optional(),
  associatedDrive: z.string().optional(),
  associatedTraining: z.string().optional(),
  status: z.enum(["draft", "published", "ongoing", "completed", "cancelled"]).optional(),
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

    const assessment = await Assessment.findOne({
      _id: params.id,
      accountId,
    })
    .populate("associatedDrive", "title company")
    .populate("associatedTraining", "title")
    .populate("participants", "name email rollNumber branch")
    .populate("scores.studentId", "name email rollNumber")
    .lean() as any;

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Calculate statistics
    const participantCount = assessment.participants?.length || 0;
    const scoreCount = assessment.scores?.length || 0;
    const averageScore = assessment.scores && assessment.scores.length > 0
      ? assessment.scores.reduce((sum: number, score: any) => sum + score.marks, 0) / assessment.scores.length
      : 0;
    const passCount = assessment.scores?.filter((score: any) => score.marks >= assessment.passingMarks).length || 0;
    const passRate = scoreCount > 0 ? (passCount / scoreCount) * 100 : 0;

    return createSuccessResponse({
      ...assessment,
      stats: {
        participantCount,
        scoreCount,
        averageScore: Math.round(averageScore * 100) / 100,
        passCount,
        passRate: Math.round(passRate * 100) / 100,
      },
    }, 'Assessment retrieved successfully');
  } catch (error) {
    console.error("Error fetching assessment:", error);
    return createErrorResponse('Failed to retrieve assessment', 500, 'INTERNAL_ERROR');
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

    const assessment = await Assessment.findOne({
      _id: params.id,
      accountId,
    });

    if (!assessment) {
      return createErrorResponse('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateAssessmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate passing marks if both are provided
    if (data.passingMarks !== undefined && data.totalMarks !== undefined) {
      if (data.passingMarks > data.totalMarks) {
        return NextResponse.json(
          { error: "Passing marks cannot exceed total marks" },
          { status: 400 }
        );
      }
    } else if (data.passingMarks !== undefined) {
      if (data.passingMarks > assessment.totalMarks) {
        return NextResponse.json(
          { error: "Passing marks cannot exceed total marks" },
          { status: 400 }
        );
      }
    } else if (data.totalMarks !== undefined) {
      if (assessment.passingMarks > data.totalMarks) {
        return NextResponse.json(
          { error: "Passing marks cannot exceed total marks" },
          { status: 400 }
        );
      }
    }

    // Check for date conflicts if dates are being updated
    if (data.startDate || data.endDate) {
      const startDate = data.startDate ? new Date(data.startDate) : assessment.startDate;
      const endDate = data.endDate ? new Date(data.endDate) : assessment.endDate;
      const venue = data.venue || assessment.venue;

      const existingAssessment = await Assessment.findOne({
        _id: { $ne: params.id },
        accountId,
        venue: venue,
        status: { $in: ["published", "ongoing"] },
        $or: [
          {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
          },
        ],
      });

      if (existingAssessment) {
        return NextResponse.json(
          { error: "Assessment schedule conflicts with existing assessment at this venue" },
          { status: 400 }
        );
      }
    }

    // Update assessment
    const updatedAssessment = await Assessment.findByIdAndUpdate(
      params.id,
      {
        ...data,
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
      },
      { new: true, runValidators: true }
    ).populate("associatedDrive", "title company")
     .populate("associatedTraining", "title");

    return createSuccessResponse(updatedAssessment, 'Assessment updated successfully');
  } catch (error) {
    console.error("Error updating assessment:", error);
    return createErrorResponse('Failed to update assessment', 500, 'INTERNAL_ERROR');
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

    const assessment = await Assessment.findOne({
      _id: params.id,
      accountId,
    });

    if (!assessment) {
      return createErrorResponse('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
    }

    // Check if assessment can be deleted
    if (assessment.status === "ongoing" || assessment.status === "completed") {
      return NextResponse.json(
        { error: "Cannot delete ongoing or completed assessment" },
        { status: 400 }
      );
    }

    if (assessment.participants && assessment.participants.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete assessment with participants" },
        { status: 400 }
      );
    }

    await Assessment.findByIdAndDelete(params.id);

    return createSuccessResponse(null, 'Assessment deleted successfully');
  } catch (error) {
    console.error("Error deleting assessment:", error);
    return createErrorResponse('Failed to delete assessment', 500, 'INTERNAL_ERROR');
  }
} 