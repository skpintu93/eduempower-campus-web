import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/edge-helpers";
import dbConnect from "@/lib/mongoose";
import Training from "@/models/Training";
import { z } from "zod";

const trainingSchema = z.object({
  title: z.string().min(1, "Training title is required").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  type: z.enum(["internal", "external"]),
  category: z.string().min(1, "Category is required").max(100, "Category too long"),
  duration: z.number().min(1, "Duration must be at least 1 hour"),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  schedule: z.array(z.object({
    day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    time: z.string().min(1, "Time is required"),
  })),
  venue: z.string().optional(),
  trainerName: z.string().min(1, "Trainer name is required"),
  trainerEmail: z.string().email("Invalid trainer email"),
  maxParticipants: z.number().min(1, "Max participants must be at least 1"),
  isActive: z.boolean().default(true),
  status: z.enum(["upcoming", "ongoing", "completed"]).default("upcoming"),
  quizEnabled: z.boolean().default(false),
  certificateTemplate: z.string().optional(),
  completionCriteria: z.string().optional(),
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
    const sortBy = searchParams.get("sortBy") || "startDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query
    const query: any = { accountId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { trainerName: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
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

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const trainings = await Training.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("registeredStudents", "name email rollNumber")
      .lean();

    const total = await Training.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate statistics
    const stats = await Training.aggregate([
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

    return createSuccessResponse({
      trainings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        total,
        ...statusStats,
      },
    }, 'Trainings retrieved successfully');
  } catch (error) {
    console.error("Error fetching trainings:", error);
    return createErrorResponse('Failed to retrieve trainings', 500, 'INTERNAL_ERROR');
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
    const validationResult = trainingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for date conflicts if venue is provided
    if (data.venue) {
      const existingTraining = await Training.findOne({
        accountId,
        venue: data.venue,
        status: { $in: ["upcoming", "ongoing"] },
        $or: [
          {
            startDate: { $lte: new Date(data.endDate) },
            endDate: { $gte: new Date(data.startDate) },
          },
        ],
      });

      if (existingTraining) {
        return NextResponse.json(
          { error: "Training schedule conflicts with existing training at this venue" },
          { status: 400 }
        );
      }
    }

    // Create training
    const training = new Training({
      ...data,
      accountId,
      createdBy: user.userId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });

    await training.save();

    return createSuccessResponse(training, 'Training created successfully', 201);
  } catch (error) {
    console.error("Error creating training:", error);
    return createErrorResponse('Failed to create training', 500, 'INTERNAL_ERROR');
  }
} 