import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/request-helpers";
import dbConnect from "@/lib/mongoose";
import Student from "@/models/Student";
import { z } from "zod";

const documentQuerySchema = z.object({
  category: z.enum(["resume", "certificate", "transcript", "photo", "other"]).optional(),
  studentId: z.string().optional(),
  uploadedBy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
    const category = searchParams.get("category") || "";
    const studentId = searchParams.get("studentId") || "";
    const uploadedBy = searchParams.get("uploadedBy") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const sortBy = searchParams.get("sortBy") || "uploadedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query
    const query: any = { accountId };

    if (search) {
      query.$or = [
        { "documents.name": { $regex: search, $options: "i" } },
        { "documents.description": { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query["documents.type"] = category;
    }

    if (studentId) {
      query._id = studentId;
    }

    if (uploadedBy) {
      query["documents.uploadedBy"] = uploadedBy;
    }

    if (startDate && endDate) {
      query["documents.uploadedAt"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const students = await Student.find(query)
      .populate("accountId", "name")
      .lean();

    // Extract and flatten documents
    const allDocuments: any[] = [];
    students.forEach((student: any) => {
      if (student.documents && student.documents.length > 0) {
        student.documents.forEach((doc: any) => {
          allDocuments.push({
            ...doc,
            studentId: student._id,
            studentName: student.name,
            studentRollNumber: student.rollNumber,
            studentBranch: student.branch,
          });
        });
      }
    });

    // Apply additional filtering and sorting
    let filteredDocuments = allDocuments;

    if (search) {
      filteredDocuments = filteredDocuments.filter((doc: any) =>
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      filteredDocuments = filteredDocuments.filter((doc: any) => doc.type === category);
    }

    if (uploadedBy) {
      filteredDocuments = filteredDocuments.filter((doc: any) => doc.uploadedBy === uploadedBy);
    }

    // Sort documents
    filteredDocuments.sort((a: any, b: any) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === "desc") {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = filteredDocuments.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedDocuments = filteredDocuments.slice(skip, skip + limit);

    // Calculate statistics
    const categoryStats = filteredDocuments.reduce((acc: any, doc: any) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {});

    const totalSize = filteredDocuments.reduce((sum: number, doc: any) => sum + (doc.fileSize || 0), 0);
    const averageSize = total > 0 ? totalSize / total : 0;

    return createSuccessResponse({
      documents: paginatedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        total,
        totalSize,
        averageSize: Math.round(averageSize / 1024), // KB
        categoryStats,
      },
    }, 'Documents retrieved successfully');
  } catch (error) {
    console.error("Error fetching documents:", error);
    return createErrorResponse('Failed to retrieve documents', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(request: NextRequest) {
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
    const documentId = searchParams.get("documentId");
    const studentId = searchParams.get("studentId");
    const category = searchParams.get("category");

    if (!documentId && !studentId && !category) {
      return createErrorResponse('Either documentId, studentId, or category must be provided', 400, 'MISSING_PARAMETER');
    }

    let query: any = { accountId };
    let results = {
      deletedCount: 0,
      errors: [] as string[],
    };

    if (documentId && studentId) {
      // Delete specific document
      const student = await Student.findOne({
        _id: studentId,
        accountId,
      });

      if (!student) {
        return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
      }

      const documentIndex = student.documents?.findIndex(
        (doc: any) => doc._id.toString() === documentId
      );

      if (documentIndex === -1 || documentIndex === undefined) {
        return createErrorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      student.documents.splice(documentIndex, 1);
      await student.save();
      results.deletedCount = 1;
    } else if (studentId) {
      // Delete all documents for a student
      const student = await Student.findOne({
        _id: studentId,
        accountId,
      });

      if (!student) {
        return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
      }

      const documentCount = student.documents?.length || 0;
      student.documents = [];
      await student.save();
      results.deletedCount = documentCount;
    } else if (category) {
      // Delete all documents of a specific category
      const students = await Student.find({
        accountId,
        "documents.type": category,
      });

      for (const student of students) {
        const originalCount = student.documents?.length || 0;
        student.documents = student.documents?.filter((doc: any) => doc.type !== category) || [];
        await student.save();
        results.deletedCount += originalCount - (student.documents?.length || 0);
      }
    }

    return createSuccessResponse(results, 'Documents deleted successfully');
  } catch (error) {
    console.error("Error deleting documents:", error);
    return createErrorResponse('Failed to delete documents', 500, 'INTERNAL_ERROR');
  }
} 