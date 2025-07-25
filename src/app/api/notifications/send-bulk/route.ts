import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/edge-helpers";
import dbConnect from "@/lib/mongoose";
import Notification from "@/models/Notification";
import Student from "@/models/Student";
import User from "@/models/User";
import { z } from "zod";

const bulkNotificationSchema = z.object({
  title: z.string().min(1, "Notification title is required").max(200, "Title too long"),
  message: z.string().min(1, "Notification message is required").max(2000, "Message too long"),
  type: z.enum(["info", "success", "warning", "error"]),
  category: z.enum(["drive", "training", "assessment", "general"]).default("general"),
  recipients: z.object({
    allStudents: z.boolean().default(false),
    allStaff: z.boolean().default(false),
    studentIds: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
    branches: z.array(z.string()).optional(),
    semesters: z.array(z.number()).optional(),
    roles: z.array(z.enum(["admin", "tpo", "faculty", "coordinator"])).optional(),
  }),
  channels: z.array(z.enum(["email", "sms", "in_app"])).default(["in_app"]),
  scheduledFor: z.string().optional(),
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
    const validationResult = bulkNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Determine recipients based on criteria
    let studentIds: string[] = [];
    let userIds: string[] = [];

    // Get students based on criteria
    if (data.recipients.allStudents) {
      const allStudents = await Student.find({ accountId }).select("_id");
      studentIds = allStudents.map((student: any) => student._id.toString());
    } else if (data.recipients.studentIds && data.recipients.studentIds.length > 0) {
      studentIds = data.recipients.studentIds;
    } else if (data.recipients.branches || data.recipients.semesters) {
      const studentQuery: any = { accountId };
      
      if (data.recipients.branches && data.recipients.branches.length > 0) {
        studentQuery.branch = { $in: data.recipients.branches };
      }
      
      if (data.recipients.semesters && data.recipients.semesters.length > 0) {
        studentQuery.semester = { $in: data.recipients.semesters };
      }

      const filteredStudents = await Student.find(studentQuery).select("_id");
      studentIds = filteredStudents.map((student: any) => student._id.toString());
    }

    // Get users based on criteria
    if (data.recipients.allStaff) {
      const allStaff = await User.find({ accountId }).select("_id");
      userIds = allStaff.map((user: any) => user._id.toString());
    } else if (data.recipients.userIds && data.recipients.userIds.length > 0) {
      userIds = data.recipients.userIds;
    } else if (data.recipients.roles && data.recipients.roles.length > 0) {
      const filteredUsers = await User.find({
        accountId,
        role: { $in: data.recipients.roles },
      }).select("_id");
      userIds = filteredUsers.map((user: any) => user._id.toString());
    }

    // Validate that at least one recipient is specified
    if (studentIds.length === 0 && userIds.length === 0) {
      return createErrorResponse('No recipients found based on the specified criteria', 400, 'NO_RECIPIENTS');
    }

    // Create notifications
    const notifications = [];
    const results = {
      totalRecipients: studentIds.length + userIds.length,
      notificationsCreated: 0,
      errors: [] as string[],
    };

    try {
      // Create notification for students
      if (studentIds.length > 0) {
        const studentNotification = new Notification({
          title: data.title,
          message: data.message,
          type: data.type,
          category: data.category,
          studentIds: studentIds,
          allStudents: data.recipients.allStudents,
          allStaff: false,
          accountId,
          ...(data.scheduledFor && { scheduledFor: new Date(data.scheduledFor) }),
        });

        await studentNotification.save();
        notifications.push(studentNotification);
        results.notificationsCreated++;
      }

      // Create notification for users
      if (userIds.length > 0) {
        const userNotification = new Notification({
          title: data.title,
          message: data.message,
          type: data.type,
          category: data.category,
          userIds: userIds,
          allStudents: false,
          allStaff: data.recipients.allStaff,
          accountId,
          ...(data.scheduledFor && { scheduledFor: new Date(data.scheduledFor) }),
        });

        await userNotification.save();
        notifications.push(userNotification);
        results.notificationsCreated++;
      }

      // Send notifications immediately if not scheduled
      if (!data.scheduledFor || new Date(data.scheduledFor) <= new Date()) {
        for (const notification of notifications) {
          // In a real application, you would send through different channels
          if (data.channels.includes("email")) {
            notification.emailSent = true;
          }
          if (data.channels.includes("sms")) {
            notification.smsSent = true;
          }
          await notification.save();
        }
      }

      return createSuccessResponse({
        ...results,
        notifications: notifications.map((n: any) => ({
          id: n._id,
          title: n.title,
          recipients: n.studentIds?.length || n.userIds?.length || 0,
          scheduled: !!n.scheduledFor,
        })),
      }, 'Bulk notifications sent successfully');
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      results.errors.push("Failed to create notifications");
      
      return NextResponse.json({
        success: false,
        error: 'Some notifications failed to send',
        code: 'PARTIAL_FAILURE',
        results,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error sending bulk notifications:", error);
    return createErrorResponse('Failed to send bulk notifications', 500, 'INTERNAL_ERROR');
  }
} 