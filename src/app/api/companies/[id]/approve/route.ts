import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { Company } from '@/models';
import dbConnect from '@/lib/mongoose';

// POST /api/companies/[id]/approve - Approve or reject company
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication with appropriate role
    const user = await requireAuth(request);
    const allowedRoles = ['admin', 'tpo'];
    if (!allowedRoles.includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    const { id } = params;

    // Validate company ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid company ID', 400, 'INVALID_ID');
    }

    // Parse request body
    const body = await request.json();
    const { action, reason } = body; // action: 'approve' or 'reject'

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return createErrorResponse('Invalid action. Must be "approve" or "reject"', 400, 'INVALID_ACTION');
    }

    // Connect to database
    await dbConnect();

    // Find company by ID and account
    const company = await Company.findOne({ _id: id, accountId });
    if (!company) {
      return createErrorResponse('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    // Check if company is already in the requested state
    if (action === 'approve' && company.isApproved) {
      return createErrorResponse('Company is already approved', 400, 'ALREADY_APPROVED');
    }

    if (action === 'reject' && !company.isApproved) {
      return createErrorResponse('Company is already rejected', 400, 'ALREADY_REJECTED');
    }

    // Update company approval status
    const updateData: any = {
      isApproved: action === 'approve',
      approvalDate: new Date(),
      approvedBy: user.userId,
      approvalReason: reason || '',
    };

    // If rejecting, add rejection details
    if (action === 'reject') {
      updateData.rejectionReason = reason || 'No reason provided';
      updateData.rejectedBy = user.userId;
      updateData.rejectionDate = new Date();
    }

    // Update company
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v');

    // Prepare response data
    const responseData = {
      companyId: id,
      action,
      status: action === 'approve' ? 'approved' : 'rejected',
      reason: reason || '',
      approvedBy: user.userId,
      approvalDate: updateData.approvalDate,
      message: `Company ${action}d successfully`,
    };

    return createSuccessResponse(responseData, `Company ${action}d successfully`);

  } catch (error) {
    console.error('Company approval error:', error);
    return createErrorResponse('Failed to process company approval', 500, 'INTERNAL_ERROR');
  }
}

// GET /api/companies/[id]/approve - Get company approval status
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

    const { id } = params;

    // Validate company ID
    if (!id || id === 'undefined' || id === 'null') {
      return createErrorResponse('Invalid company ID', 400, 'INVALID_ID');
    }

    // Connect to database
    await dbConnect();

    // Find company by ID and account
    const company = await Company.findOne({ _id: id, accountId })
      .select('isApproved approvalDate approvedBy approvalReason rejectionReason rejectedBy rejectionDate')
      .lean() as any;

    if (!company) {
      return createErrorResponse('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    // Prepare response data
    const responseData = {
      companyId: id,
      isApproved: company.isApproved,
      status: company.isApproved ? 'approved' : 'pending',
      approvalDate: company.approvalDate,
      approvedBy: company.approvedBy,
      approvalReason: company.approvalReason,
      rejectionReason: company.rejectionReason,
      rejectedBy: company.rejectedBy,
      rejectionDate: company.rejectionDate,
    };

    return createSuccessResponse(responseData, 'Company approval status retrieved successfully');

  } catch (error) {
    console.error('Get company approval status error:', error);
    return createErrorResponse('Failed to retrieve company approval status', 500, 'INTERNAL_ERROR');
  }
} 