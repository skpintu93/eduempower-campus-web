import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/request-helpers";
import dbConnect from "@/lib/mongoose";
import Notification from "@/models/Notification";
import { z } from "zod";

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().default(false),
  category: z.enum(["drive", "training", "assessment", "general"]).optional(),
  type: z.enum(["info", "success", "warning", "error"]).optional(),
});

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
    const validationResult = markReadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { notificationIds, markAll, category, type } = validationResult.data;

    let query: any = { accountId };

    if (markAll) {
      // Mark all unread notifications as read
      if (category) {
        query.category = category;
      }
      if (type) {
        query.type = type;
      }
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      query._id = { $in: notificationIds };
    } else {
      return createErrorResponse('Either notificationIds or markAll must be provided', 400, 'MISSING_PARAMETER');
    }

    // Find notifications to update
    const notifications = await Notification.find(query);

    if (notifications.length === 0) {
      return createSuccessResponse({
        updatedCount: 0,
        notifications: [],
      }, 'No notifications found to mark as read');
    }

    const results = {
      totalNotifications: notifications.length,
      updatedCount: 0,
      errors: [] as string[],
    };

    // Update each notification
    for (const notification of notifications) {
      try {
        // Check if user has already read this notification
        const alreadyRead = notification.inAppRead?.some(
          (read: any) => read.userId.toString() === user.userId
        );

        if (!alreadyRead) {
          // Add user to read list
          if (!notification.inAppRead) {
            notification.inAppRead = [];
          }

          notification.inAppRead.push({
            userId: user.userId,
            readAt: new Date(),
          });

          await notification.save();
          results.updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating notification ${notification._id}:`, error);
        results.errors.push(`Failed to update notification ${notification._id}`);
      }
    }

    return createSuccessResponse(results, 'Notifications marked as read successfully');
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return createErrorResponse('Failed to mark notifications as read', 500, 'INTERNAL_ERROR');
  }
}

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
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    // Build query for unread notifications
    const query: any = { accountId };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    // Find notifications that the user hasn't read
    const unreadNotifications = await Notification.find(query).lean();

    // Filter notifications that the user hasn't read
    const userUnreadNotifications = unreadNotifications.filter((notification: any) => {
      return !notification.inAppRead?.some(
        (read: any) => read.userId.toString() === user.userId
      );
    });

    // Calculate statistics
    const totalUnread = userUnreadNotifications.length;
    const categoryStats = userUnreadNotifications.reduce((acc: any, notification: any) => {
      acc[notification.category] = (acc[notification.category] || 0) + 1;
      return acc;
    }, {});

    const typeStats = userUnreadNotifications.reduce((acc: any, notification: any) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {});

    return createSuccessResponse({
      unreadNotifications: userUnreadNotifications.map((notification: any) => ({
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category,
        createdAt: notification.createdAt,
      })),
      stats: {
        totalUnread,
        categoryStats,
        typeStats,
      },
    }, 'Unread notifications retrieved successfully');
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return createErrorResponse('Failed to retrieve unread notifications', 500, 'INTERNAL_ERROR');
  }
} 