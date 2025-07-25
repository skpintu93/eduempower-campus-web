import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/edge-helpers";
import dbConnect from "@/lib/mongoose";
import Assessment from "@/models/Assessment";
import { z } from "zod";

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

    // Find assessment with scores and participants
    const assessment = await Assessment.findOne({
      _id: params.id,
      accountId,
    })
    .populate("scores.studentId", "name email rollNumber branch cgpa")
    .populate("participants", "name email rollNumber branch cgpa")
    .lean() as any;

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const scores = assessment.scores || [];
    const participants = assessment.participants || [];

    if (scores.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scores available for this assessment",
        results: {
          rankings: [],
          statistics: {
            totalParticipants: participants.length,
            totalScores: 0,
            averageScore: 0,
            maxScore: 0,
            minScore: 0,
            passCount: 0,
            passRate: 0,
          },
          scoreDistribution: [],
          branchAnalysis: [],
        },
      });
    }

    // Calculate rankings
    const rankings = scores
      .map((score: any) => ({
        student: score.studentId,
        marks: score.marks,
        percentage: (score.marks / assessment.totalMarks) * 100,
        status: score.marks >= assessment.passingMarks ? "pass" : "fail",
        feedback: score.feedback,
        remarks: score.remarks,
        submittedAt: score.submittedAt,
      }))
      .sort((a: any, b: any) => b.marks - a.marks)
      .map((result: any, index: number) => ({
        ...result,
        rank: index + 1,
      }));

    // Calculate statistics
    const totalScores = scores.length;
    const averageScore = scores.reduce((sum: number, score: any) => sum + score.marks, 0) / totalScores;
    const maxScore = Math.max(...scores.map((score: any) => score.marks));
    const minScore = Math.min(...scores.map((score: any) => score.marks));
    const passCount = scores.filter((score: any) => score.marks >= assessment.passingMarks).length;
    const passRate = (passCount / totalScores) * 100;

    // Score distribution
    const scoreRanges = [
      { range: "90-100", count: 0, percentage: 0 },
      { range: "80-89", count: 0, percentage: 0 },
      { range: "70-79", count: 0, percentage: 0 },
      { range: "60-69", count: 0, percentage: 0 },
      { range: "50-59", count: 0, percentage: 0 },
      { range: "40-49", count: 0, percentage: 0 },
      { range: "30-39", count: 0, percentage: 0 },
      { range: "0-29", count: 0, percentage: 0 },
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

    // Calculate percentages
    scoreRanges.forEach((range) => {
      range.percentage = totalScores > 0 ? (range.count / totalScores) * 100 : 0;
    });

    // Branch-wise analysis
    const branchAnalysis = participants.reduce((acc: any, participant: any) => {
      const branch = participant.branch;
      if (!acc[branch]) {
        acc[branch] = {
          branch,
          totalStudents: 0,
          participatedStudents: 0,
          averageScore: 0,
          passCount: 0,
          passRate: 0,
        };
      }
      acc[branch].totalStudents++;

      const studentScore = scores.find((score: any) => 
        score.studentId._id.toString() === participant._id.toString()
      );

      if (studentScore) {
        acc[branch].participatedStudents++;
        acc[branch].averageScore += studentScore.marks;
        if (studentScore.marks >= assessment.passingMarks) {
          acc[branch].passCount++;
        }
      }

      return acc;
    }, {});

    // Calculate branch averages and pass rates
    Object.values(branchAnalysis).forEach((branch: any) => {
      if (branch.participatedStudents > 0) {
        branch.averageScore = branch.averageScore / branch.participatedStudents;
        branch.passRate = (branch.passCount / branch.participatedStudents) * 100;
      }
    });

    // Top performers (top 10)
    const topPerformers = rankings.slice(0, 10);

    // Performance insights
    const insights = {
      totalParticipants: participants.length,
      participatedCount: totalScores,
      participationRate: participants.length > 0 ? (totalScores / participants.length) * 100 : 0,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      difficulty: averageScore >= 80 ? "Easy" : averageScore >= 60 ? "Moderate" : "Difficult",
      topScore: maxScore,
      lowestScore: minScore,
      scoreRange: maxScore - minScore,
    };

    return createSuccessResponse({
      rankings,
      topPerformers,
      statistics: {
        totalParticipants: participants.length,
        totalScores,
        averageScore: Math.round(averageScore * 100) / 100,
        maxScore,
        minScore,
        passCount,
        passRate: Math.round(passRate * 100) / 100,
      },
      scoreDistribution: scoreRanges,
      branchAnalysis: Object.values(branchAnalysis),
      insights,
      assessment: {
        id: assessment._id,
        title: assessment.title,
        type: assessment.type,
        totalMarks: assessment.totalMarks,
        passingMarks: assessment.passingMarks,
        startDate: assessment.startDate,
        endDate: assessment.endDate,
      },
    }, 'Assessment results generated successfully');
  } catch (error) {
    console.error("Error generating assessment results:", error);
    return createErrorResponse('Failed to generate assessment results', 500, 'INTERNAL_ERROR');
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

    // Find assessment
    const assessment = await Assessment.findOne({
      _id: params.id,
      accountId,
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Check if assessment is completed
    if (assessment.status !== "completed") {
      return NextResponse.json(
        { error: "Results can only be generated for completed assessments" },
        { status: 400 }
      );
    }

    // Check if scores exist
    if (!assessment.scores || assessment.scores.length === 0) {
      return NextResponse.json(
        { error: "No scores available to generate results" },
        { status: 400 }
      );
    }

    // Generate result summary
    const totalScores = assessment.scores.length;
    const averageScore = assessment.scores.reduce((sum: number, score: any) => sum + score.marks, 0) / totalScores;
    const passCount = assessment.scores.filter((score: any) => score.marks >= assessment.passingMarks).length;
    const passRate = (passCount / totalScores) * 100;

    // Create result summary
    const resultSummary = {
      assessmentId: assessment._id,
      generatedAt: new Date(),
      generatedBy: user.userId,
      totalParticipants: assessment.participants?.length || 0,
      totalScores,
      averageScore: Math.round(averageScore * 100) / 100,
      passCount,
      passRate: Math.round(passRate * 100) / 100,
      maxScore: Math.max(...assessment.scores.map((score: any) => score.marks)),
      minScore: Math.min(...assessment.scores.map((score: any) => score.marks)),
    };

    // Update assessment with result summary
    assessment.resultSummary = resultSummary;
    await assessment.save();

    return createSuccessResponse(resultSummary, 'Assessment results generated successfully');
  } catch (error) {
    console.error("Error generating assessment results:", error);
    return createErrorResponse('Failed to generate assessment results', 500, 'INTERNAL_ERROR');
  }
} 