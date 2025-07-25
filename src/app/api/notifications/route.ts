import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/request-helpers";
import dbConnect from "@/lib/mongoose";
import Notification from "@/models/Notification";
import { z } from "zod";

const notificationSchema = z.object({
  title: z.string().min(1, "Notification title is required").max(200, "Title too long"),
  message: z.string().min(1, "Notification message is required").max(2000, "Message too long"),
  type: z.enum(["info", "success", "warning", "error"]),
  category: z.enum(["drive", "training", "assessment", "general"]).default("general"),
  userIds: z.array(z.string()).optional(),
  studentIds: z.array(z.string()).optional(),
  allStudents: z.boolean().default(false),
  allStaff: z.boolean().default(false),
  scheduledFor: z.string().optional(),
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
    const category = searchParams.get("category") || "";
    const priority = searchParams.get("priority") || "";
    const read = searchParams.get("read") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query
    const query: any = { accountId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (read !== "") {
      query.read = read === "true";
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const notifications = await Notification.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("recipients", "name email")
      .populate("createdBy", "name email")
      .lean();

    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate statistics
    const stats = await Notification.aggregate([
      { $match: { accountId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = stats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    // Calculate unread count
    const unreadCount = await Notification.countDocuments({
      accountId,
      read: false,
    });

    // Calculate category statistics
    const categoryStats = await Notification.aggregate([
      { $match: { accountId } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryCounts = categoryStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    return createSuccessResponse({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        total,
        unreadCount,
        ...typeStats,
        categories: categoryCounts,
      },
    }, 'Notifications retrieved successfully');
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return createErrorResponse('Failed to retrieve notifications', 500, 'INTERNAL_ERROR');
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
    const validationResult = notificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create notification
    const notification = new Notification({
      ...data,
      accountId,
      ...(data.scheduledFor && { scheduledFor: new Date(data.scheduledFor) }),
    });

    await notification.save();

    // If notification is not scheduled, send immediately
    if (!data.scheduledFor || new Date(data.scheduledFor) <= new Date()) {
      // In a real application, you would send notifications through different channels
      // For now, we'll just mark it as sent
      notification.emailSent = true;
      notification.smsSent = true;
      await notification.save();
    }

    return createSuccessResponse(notification, 'Notification created successfully', 201);
  } catch (error) {
    console.error("Error creating notification:", error);
    return createErrorResponse('Failed to create notification', 500, 'INTERNAL_ERROR');
  }
} 