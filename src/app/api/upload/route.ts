import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import dbConnect from '@/lib/mongoose';

// POST /api/upload - Handle file uploads
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    
    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;

    // Validate file
    if (!file) {
      return createErrorResponse('No file provided', 400, 'NO_FILE');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return createErrorResponse('File size exceeds 10MB limit', 400, 'FILE_TOO_LARGE');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse(
        'File type not allowed. Supported types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT',
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${timestamp}_${randomString}.${fileExtension}`;

    // Create file metadata
    const fileMetadata = {
      originalName: file.name,
      filename: uniqueFilename,
      size: file.size,
      type: file.type,
      category: category || 'general',
      description: description || '',
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
      uploadedBy: user.userId,
      accountId,
      uploadDate: new Date(),
      url: `/uploads/${uniqueFilename}`, // This would be the actual file URL
      isPublic: false,
      downloadCount: 0,
    };

    // In a real implementation, you would:
    // 1. Upload file to cloud storage (AWS S3, Google Cloud Storage, etc.)
    // 2. Store metadata in database
    // 3. Return file information

    // For now, we'll simulate the upload process
    const uploadedFile = {
      id: `file_${timestamp}_${randomString}`,
      ...fileMetadata,
      status: 'uploaded',
    };

    // Prepare response data
    const responseData = {
      file: uploadedFile,
      message: 'File uploaded successfully',
      uploadInfo: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: uploadedFile.url,
      }
    };

    return createSuccessResponse(responseData, 'File uploaded successfully', 201);

  } catch (error) {
    console.error('File upload error:', error);
    return createErrorResponse('Failed to upload file', 500, 'INTERNAL_ERROR');
  }
}

// GET /api/upload - Get upload configuration and limits
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    
    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    // Return upload configuration
    const responseData = {
      limits: {
        maxFileSize: '10MB',
        maxFilesPerUpload: 1,
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'text/plain',
        ],
        allowedExtensions: [
          '.jpg', '.jpeg', '.png', '.gif', '.webp',
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'
        ],
      },
      categories: [
        'student_documents',
        'company_logos',
        'training_materials',
        'assessment_files',
        'certificates',
        'reports',
        'general',
      ],
      uploadUrl: '/api/upload',
      supportedFeatures: [
        'drag_and_drop',
        'progress_tracking',
        'file_preview',
        'metadata_editing',
      ]
    };

    return createSuccessResponse(responseData, 'Upload configuration retrieved successfully');

  } catch (error) {
    console.error('Get upload config error:', error);
    return createErrorResponse('Failed to retrieve upload configuration', 500, 'INTERNAL_ERROR');
  }
} 