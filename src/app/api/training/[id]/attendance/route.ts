import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/request-helpers";
import dbConnect from "@/lib/mongoose";
import Training from "@/models/Training";
import { z } from "zod";

const attendanceSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  date: z.string().datetime("Invalid date format"),
  present: z.boolean(),
  remarks: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  attendance: z.array(z.object({
    studentId: z.string().min(1, "Student ID is required"),
    present: z.boolean(),
    remarks: z.string().optional(),
  })),
  date: z.string().datetime("Invalid date format"),
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
    const date = searchParams.get("date");
    const studentId = searchParams.get("studentId");

    // Find training
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

    let attendanceData = training.attendance || [];

    // Filter by date if provided
    if (date) {
      const targetDate = new Date(date);
      attendanceData = attendanceData.filter((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate.toDateString() === targetDate.toDateString();
      });
    }

    // Filter by student if provided
    if (studentId) {
      attendanceData = attendanceData.filter((record: any) => 
        record.studentId._id.toString() === studentId
      );
    }

    // Calculate attendance statistics
    const totalSessions = attendanceData.length;
    const presentCount = attendanceData.filter((record: any) => record.present).length;
    const absentCount = totalSessions - presentCount;
    const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

    // Group by student for summary
    const studentAttendance = training.registeredStudents?.map((student: any) => {
      const studentAttendanceRecords = attendanceData.filter(
        (record: any) => record.studentId._id.toString() === student.studentId._id.toString()
      );
      
      const studentPresentCount = studentAttendanceRecords.filter((record: any) => record.present).length;
      const studentTotalSessions = studentAttendanceRecords.length;
      const studentAttendanceRate = studentTotalSessions > 0 ? (studentPresentCount / studentTotalSessions) * 100 : 0;

      return {
        student: student.studentId,
        totalSessions: studentTotalSessions,
        presentCount: studentPresentCount,
        absentCount: studentTotalSessions - studentPresentCount,
        attendanceRate: Math.round(studentAttendanceRate * 100) / 100,
        lastAttendance: studentAttendanceRecords.length > 0 ? 
          studentAttendanceRecords[studentAttendanceRecords.length - 1] : null,
      };
    }) || [];

    return createSuccessResponse({
      attendance: attendanceData,
      summary: {
        totalSessions,
        presentCount,
        absentCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
      studentAttendance,
    }, 'Attendance data retrieved successfully');
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return createErrorResponse('Failed to retrieve attendance data', 500, 'INTERNAL_ERROR');
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

    // Check if it's bulk attendance or single attendance
    const isBulkAttendance = body.attendance && Array.isArray(body.attendance);

    if (isBulkAttendance) {
      // Handle bulk attendance
      const validationResult = bulkAttendanceSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { attendance, date } = validationResult.data;

      // Find training
      const training = await Training.findOne({
        _id: params.id,
        accountId,
      });

      if (!training) {
        return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
      }

      // Check if training is ongoing
      if (training.status !== "ongoing") {
        return createErrorResponse('Attendance can only be marked for ongoing training', 400, 'INVALID_OPERATION');
      }

      // Validate that all students are registered
      const registeredStudentIds = training.registeredStudents?.map(
        (registration: any) => registration.studentId.toString()
      ) || [];

      const invalidStudents = attendance.filter(
        (record) => !registeredStudentIds.includes(record.studentId)
      );

      if (invalidStudents.length > 0) {
        return createErrorResponse('Some students are not registered for this training', 400, 'INVALID_STUDENTS');
      }

      // Initialize attendance array if not exists
      if (!training.attendance) {
        training.attendance = [];
      }

      // Add attendance records
      const attendanceDate = new Date(date);
      const results = [];

      for (const record of attendance) {
        // Check if attendance already exists for this student and date
        const existingIndex = training.attendance.findIndex(
          (existing: any) => 
            existing.studentId.toString() === record.studentId &&
            new Date(existing.date).toDateString() === attendanceDate.toDateString()
        );

        const attendanceRecord = {
          studentId: record.studentId,
          date: attendanceDate,
          present: record.present,
          remarks: record.remarks || "",
          markedBy: user.userId,
          markedAt: new Date(),
        };

        if (existingIndex !== -1) {
          // Update existing record
          training.attendance[existingIndex] = attendanceRecord;
          results.push({ studentId: record.studentId, action: "updated" });
        } else {
          // Add new record
          training.attendance.push(attendanceRecord);
          results.push({ studentId: record.studentId, action: "added" });
        }
      }

      await training.save();

      return createSuccessResponse({
        results,
        date: attendanceDate,
      }, 'Bulk attendance marked successfully');
    } else {
      // Handle single attendance
      const validationResult = attendanceSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { studentId, date, present, remarks } = validationResult.data;

      // Find training
      const training = await Training.findOne({
        _id: params.id,
        accountId,
      });

      if (!training) {
        return createErrorResponse('Training not found', 404, 'TRAINING_NOT_FOUND');
      }

      // Check if training is ongoing
      if (training.status !== "ongoing") {
        return createErrorResponse('Attendance can only be marked for ongoing training', 400, 'INVALID_OPERATION');
      }

      // Check if student is registered
      const isRegistered = training.registeredStudents?.some(
        (registration: any) => registration.studentId.toString() === studentId
      );

      if (!isRegistered) {
        return createErrorResponse('Student is not registered for this training', 400, 'STUDENT_NOT_REGISTERED');
      }

      // Initialize attendance array if not exists
      if (!training.attendance) {
        training.attendance = [];
      }

      const attendanceDate = new Date(date);

      // Check if attendance already exists for this student and date
      const existingIndex = training.attendance.findIndex(
        (existing: any) => 
          existing.studentId.toString() === studentId &&
          new Date(existing.date).toDateString() === attendanceDate.toDateString()
      );

      const attendanceRecord = {
        studentId,
        date: attendanceDate,
        present,
        remarks: remarks || "",
        markedBy: user.userId,
        markedAt: new Date(),
      };

      if (existingIndex !== -1) {
        // Update existing record
        training.attendance[existingIndex] = attendanceRecord;
      } else {
        // Add new record
        training.attendance.push(attendanceRecord);
      }

      await training.save();

      return createSuccessResponse(attendanceRecord, 'Attendance marked successfully');
    }
  } catch (error) {
    console.error("Error marking attendance:", error);
    return createErrorResponse('Failed to mark attendance', 500, 'INTERNAL_ERROR');
  }
} 