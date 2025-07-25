import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/edge-helpers";
import dbConnect from "@/lib/mongoose";
import Assessment from "@/models/Assessment";
import Student from "@/models/Student";
import { z } from "zod";

const scoreSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  marks: z.number().min(0, "Marks cannot be negative"),
  feedback: z.string().optional(),
  remarks: z.string().optional(),
});

const bulkScoreSchema = z.object({
  scores: z.array(z.object({
    studentId: z.string().min(1, "Student ID is required"),
    marks: z.number().min(0, "Marks cannot be negative"),
    feedback: z.string().optional(),
    remarks: z.string().optional(),
  })),
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

    // Find assessment
    const assessment = await Assessment.findOne({
      _id: params.id,
      accountId,
    })
    .populate("scores.studentId", "name email rollNumber branch")
    .populate("participants", "name email rollNumber branch")
    .lean() as any;

    if (!assessment) {
      return createErrorResponse('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
    }

    let scores = assessment.scores || [];

    // Filter by student if provided
    if (studentId) {
      scores = scores.filter((score: any) => 
        score.studentId._id.toString() === studentId
      );
    }

    // Calculate statistics
    const totalScores = scores.length;
    const averageScore = totalScores > 0
      ? scores.reduce((sum: number, score: any) => sum + score.marks, 0) / totalScores
      : 0;
    const maxScore = totalScores > 0 ? Math.max(...scores.map((score: any) => score.marks)) : 0;
    const minScore = totalScores > 0 ? Math.min(...scores.map((score: any) => score.marks)) : 0;
    const passCount = scores.filter((score: any) => score.marks >= assessment.passingMarks).length;
    const passRate = totalScores > 0 ? (passCount / totalScores) * 100 : 0;

    // Score distribution
    const scoreRanges = [
      { range: "90-100", count: 0 },
      { range: "80-89", count: 0 },
      { range: "70-79", count: 0 },
      { range: "60-69", count: 0 },
      { range: "50-59", count: 0 },
      { range: "40-49", count: 0 },
      { range: "30-39", count: 0 },
      { range: "0-29", count: 0 },
    ];

    scores.forEach((score: any) => {
      const marks = score.marks;
      if (marks >= 90) scoreRanges[0].count++;
      else if (marks >= 80) scoreRanges[1].count++;
      else if (marks >= 70) scoreRanges[2].count++;
      else if (marks >= 60) scoreRanges[3].count++;
      else if (marks >= 50) scoreRanges[4].count++;
      else if (marks >= 40) scoreRanges[5].count++;
      else if (marks >= 30) scoreRanges[6].count++;
      else scoreRanges[7].count++;
    });

    return createSuccessResponse({
      scores,
      participants: assessment.participants || [],
      stats: {
        totalScores,
        averageScore: Math.round(averageScore * 100) / 100,
        maxScore,
        minScore,
        passCount,
        passRate: Math.round(passRate * 100) / 100,
        scoreRanges,
      },
      assessment: {
        id: assessment._id,
        title: assessment.title,
        totalMarks: assessment.totalMarks,
        passingMarks: assessment.passingMarks,
        status: assessment.status,
      },
    }, 'Assessment scores retrieved successfully');
  } catch (error) {
    console.error("Error fetching assessment scores:", error);
    return createErrorResponse('Failed to retrieve assessment scores', 500, 'INTERNAL_ERROR');
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

    // Check if it's bulk score submission or single score
    const isBulkSubmission = body.scores && Array.isArray(body.scores);

    if (isBulkSubmission) {
      // Handle bulk score submission
      const validationResult = bulkScoreSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { scores } = validationResult.data;

      // Find assessment
      const assessment = await Assessment.findOne({
        _id: params.id,
        accountId,
      });

      if (!assessment) {
        return createErrorResponse('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
      }

      // Check if assessment is completed
      if (assessment.status !== "completed") {
        return NextResponse.json(
          { error: "Scores can only be submitted for completed assessments" },
          { status: 400 }
        );
      }

      // Validate that all students are participants
      const participantIds = assessment.participants?.map(
        (participant: any) => participant.toString()
      ) || [];

      const invalidStudents = scores.filter(
        (score) => !participantIds.includes(score.studentId)
      );

      if (invalidStudents.length > 0) {
        return NextResponse.json(
          { error: "Some students are not participants in this assessment" },
          { status: 400 }
        );
      }

      // Validate marks
      const invalidMarks = scores.filter(
        (score) => score.marks > assessment.totalMarks
      );

      if (invalidMarks.length > 0) {
        return NextResponse.json(
          { error: "Some scores exceed the total marks" },
          { status: 400 }
        );
      }

      // Initialize scores array if not exists
      if (!assessment.scores) {
        assessment.scores = [];
      }

      const results = [];

      for (const scoreData of scores) {
        // Check if score already exists
        const existingScoreIndex = assessment.scores.findIndex(
          (score: any) => score.studentId.toString() === scoreData.studentId
        );

        const scoreRecord = {
          studentId: scoreData.studentId,
          marks: scoreData.marks,
          feedback: scoreData.feedback || "",
          remarks: scoreData.remarks || "",
          submittedBy: user.userId,
          submittedAt: new Date(),
        };

        if (existingScoreIndex !== -1) {
          // Update existing score
          assessment.scores[existingScoreIndex] = scoreRecord;
          results.push({ studentId: scoreData.studentId, action: "updated" });
        } else {
          // Add new score
          assessment.scores.push(scoreRecord);
          results.push({ studentId: scoreData.studentId, action: "added" });
        }
      }

      await assessment.save();

      return NextResponse.json({
        success: true,
        message: "Bulk scores submitted successfully",
        results,
      });
    } else {
      // Handle single score submission
      const validationResult = scoreSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { studentId, marks, feedback, remarks } = validationResult.data;

      // Find assessment
      const assessment = await Assessment.findOne({
        _id: params.id,
        accountId,
      });

      if (!assessment) {
        return createErrorResponse('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
      }

      // Check if assessment is completed
      if (assessment.status !== "completed") {
        return NextResponse.json(
          { error: "Scores can only be submitted for completed assessments" },
          { status: 400 }
        );
      }

      // Check if student is a participant
      const isParticipant = assessment.participants?.some(
        (participant: any) => participant.toString() === studentId
      );

      if (!isParticipant) {
        return NextResponse.json(
          { error: "Student is not a participant in this assessment" },
          { status: 400 }
        );
      }

      // Validate marks
      if (marks > assessment.totalMarks) {
        return NextResponse.json(
          { error: "Score cannot exceed total marks" },
          { status: 400 }
        );
      }

      // Initialize scores array if not exists
      if (!assessment.scores) {
        assessment.scores = [];
      }

      // Check if score already exists
      const existingScoreIndex = assessment.scores.findIndex(
        (score: any) => score.studentId.toString() === studentId
      );

              const scoreRecord = {
          studentId,
          marks,
          feedback: feedback || "",
          remarks: remarks || "",
          submittedBy: user.userId,
          submittedAt: new Date(),
        };

      if (existingScoreIndex !== -1) {
        // Update existing score
        assessment.scores[existingScoreIndex] = scoreRecord;
      } else {
        // Add new score
        assessment.scores.push(scoreRecord);
      }

      await assessment.save();

      return NextResponse.json({
        success: true,
        message: "Score submitted successfully",
        score: scoreRecord,
      });
    }
  } catch (error) {
    console.error("Error submitting assessment scores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 