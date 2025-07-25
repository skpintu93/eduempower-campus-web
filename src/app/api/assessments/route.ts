import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/edge-helpers";
import dbConnect from "@/lib/mongoose";
import Assessment from "@/models/Assessment";
import { z } from "zod";

const assessmentSchema = z.object({
  title: z.string().min(1, "Assessment title is required").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  type: z.enum(["aptitude", "technical", "coding", "interview", "group_discussion", "other"]),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  totalMarks: z.number().min(1, "Total marks must be at least 1"),
  passingMarks: z.number().min(0, "Passing marks cannot be negative"),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  venue: z.string().min(1, "Venue is required"),
  maxParticipants: z.number().min(1, "Max participants must be at least 1"),
  instructions: z.array(z.string()).optional(),
  criteria: z.object({
    cgpa: z.number().min(0).max(10).optional(),
    backlogs: z.number().min(0).optional(),
    branches: z.array(z.string()).optional(),
    semesters: z.array(z.number()).optional(),
  }).optional(),
  associatedDrive: z.string().optional(),
  associatedTraining: z.string().optional(),
  status: z.enum(["draft", "published", "ongoing", "completed", "cancelled"]).default("draft"),
});

export async function GET(request: NextRequest) {
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const associatedDrive = searchParams.get("associatedDrive") || "";
    const associatedTraining = searchParams.get("associatedTraining") || "";
    const sortBy = searchParams.get("sortBy") || "startDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query
    const query: any = { accountId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { venue: { $regex: search, $options: "i" } },
      ];
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (associatedDrive) {
      query.associatedDrive = associatedDrive;
    }

    if (associatedTraining) {
      query.associatedTraining = associatedTraining;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const assessments = await Assessment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("associatedDrive", "title company")
      .populate("associatedTraining", "title")
      .populate("participants", "name email rollNumber")
      .lean();

    const total = await Assessment.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate statistics
    const stats = await Assessment.aggregate([
      { $match: { accountId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = stats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    // Calculate type statistics
    const typeStats = await Assessment.aggregate([
      { $match: { accountId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const typeCounts = typeStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    return createSuccessResponse({
      assessments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        total,
        ...statusStats,
        types: typeCounts,
      },
    }, 'Assessments retrieved successfully');
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return createErrorResponse('Failed to retrieve assessments', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
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
    const validationResult = assessmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate passing marks
    if (data.passingMarks > data.totalMarks) {
      return NextResponse.json(
        { error: "Passing marks cannot exceed total marks" },
        { status: 400 }
      );
    }

    // Check for date conflicts
    const existingAssessment = await Assessment.findOne({
      accountId,
      venue: data.venue,
      status: { $in: ["published", "ongoing"] },
      $or: [
        {
          startDate: { $lte: new Date(data.endDate) },
          endDate: { $gte: new Date(data.startDate) },
        },
      ],
    });

    if (existingAssessment) {
      return NextResponse.json(
        { error: "Assessment schedule conflicts with existing assessment at this venue" },
        { status: 400 }
      );
    }

    // Create assessment
    const assessment = new Assessment({
      ...data,
      accountId,
      createdBy: user.userId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });

    await assessment.save();

    return createSuccessResponse(assessment, 'Assessment created successfully', 201);
  } catch (error) {
    console.error("Error creating assessment:", error);
    return createErrorResponse('Failed to create assessment', 500, 'INTERNAL_ERROR');
  }
} 