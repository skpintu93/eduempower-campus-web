import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from "@/lib/request-helpers";
import dbConnect from "@/lib/mongoose";
import Student from "@/models/Student";
import { z } from "zod";

const documentSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  type: z.enum(["resume", "certificate", "transcript", "photo", "other"]),
  description: z.string().optional(),
});

const allowedFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const maxFileSize = 5 * 1024 * 1024; // 5MB

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

    const student = await Student.findById(params.id).populate("accountId");
    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Check if user has access to this student
    if (accountId !== student.accountId.toString()) {
      return createErrorResponse('Access denied', 403, 'ACCESS_DENIED');
    }

    const documents = student.documents || [];
    
    return createSuccessResponse({
      documents,
      count: documents.length,
    }, 'Student documents retrieved successfully');
  } catch (error) {
    console.error("Error fetching student documents:", error);
    return createErrorResponse('Failed to retrieve student documents', 500, 'INTERNAL_ERROR');
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

    const student = await Student.findById(params.id).populate("accountId");
    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Check if user has access to this student
    if (accountId !== student.accountId.toString()) {
      return createErrorResponse('Access denied', 403, 'ACCESS_DENIED');
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const type = formData.get("type") as string;
    const description = formData.get("description") as string;

    // Validate input
    const validationResult = documentSchema.safeParse({
      title,
      type,
      description,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    if (!file) {
      return createErrorResponse('File is required', 400, 'MISSING_FILE');
    }

    // Validate file type
    if (!allowedFileTypes.includes(file.type)) {
      return createErrorResponse('Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX', 400, 'INVALID_FILE_TYPE');
    }

    // Validate file size
    if (file.size > maxFileSize) {
      return createErrorResponse('File size too large. Maximum size: 5MB', 400, 'FILE_TOO_LARGE');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${student.rollNumber}_${type}_${timestamp}.${fileExtension}`;

    // In a real application, you would upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
    // For now, we'll store file metadata and simulate upload
    const documentData = {
      name: validationResult.data.title,
      url: `/uploads/${fileName}`, // This would be the actual file URL
      type: validationResult.data.type,
    };

    // Add document to student
    if (!student.documents) {
      student.documents = [];
    }
    student.documents.push(documentData);
    await student.save();

    return createSuccessResponse(documentData, 'Document uploaded successfully');
  } catch (error) {
    console.error("Error uploading document:", error);
    return createErrorResponse('Failed to upload document', 500, 'INTERNAL_ERROR');
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

    const student = await Student.findById(params.id).populate("accountId");
    if (!student) {
      return createErrorResponse('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // Check if user has access to this student
    if (accountId !== student.accountId.toString()) {
      return createErrorResponse('Access denied', 403, 'ACCESS_DENIED');
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return createErrorResponse('Document ID is required', 400, 'MISSING_PARAMETER');
    }

    // Find and remove the document
    const documentIndex = student.documents?.findIndex(
      (doc: any) => doc._id.toString() === documentId
    );

    if (documentIndex === -1 || documentIndex === undefined) {
      return createErrorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // In a real application, you would also delete the file from cloud storage
    student.documents.splice(documentIndex, 1);
    await student.save();

    return createSuccessResponse(null, 'Document deleted successfully');
  } catch (error) {
    console.error("Error deleting document:", error);
    return createErrorResponse('Failed to delete document', 500, 'INTERNAL_ERROR');
  }
} 