import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import { Company, PlacementDrive } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/companies/[id] - Get company by ID
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
      .select('-__v')
      .lean();

    if (!company) {
      return createErrorResponse('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    return createSuccessResponse(company, 'Company retrieved successfully');

  } catch (error) {
    console.error('Get company error:', error);
    return createErrorResponse('Failed to retrieve company', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/companies/[id] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication with appropriate role
    const user = await requireAuth(request);
    const allowedRoles = ['admin', 'tpo', 'coordinator'];
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
    const {
      name,
      description,
      industry,
      size,
      website,
      logo,
      contactPerson,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      country,
      pincode,
      linkedinUrl,
      foundedYear,
      employeeCount,
      annualRevenue,
    } = body;

    // Connect to database
    await dbConnect();

    // Find company by ID and account
    const company = await Company.findOne({ _id: id, accountId });
    if (!company) {
      return createErrorResponse('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    // Validate email format if provided
    if (contactEmail) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(contactEmail)) {
        return createErrorResponse('Invalid contact email format', 400, 'INVALID_EMAIL');
      }
    }

    // Validate phone format if provided
    if (contactPhone) {
      const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
      if (!phoneRegex.test(contactPhone)) {
        return createErrorResponse('Invalid contact phone format', 400, 'INVALID_PHONE');
      }
    }

    // Validate website format if provided
    if (website) {
      const websiteRegex = /^https?:\/\/.+/;
      if (!websiteRegex.test(website)) {
        return createErrorResponse('Invalid website format. Must start with http:// or https://', 400, 'INVALID_WEBSITE');
      }
    }

    // Check for duplicate company name if provided
    if (name && name !== company.name) {
      const existingCompany = await Company.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') }, 
        accountId,
        _id: { $ne: id }
      });
      if (existingCompany) {
        return createErrorResponse('Company with this name already exists', 409, 'DUPLICATE_COMPANY_NAME');
      }
    }

    // Check for duplicate contact email if provided
    if (contactEmail && contactEmail !== company.contactEmail) {
      const existingEmail = await Company.findOne({ 
        contactEmail: contactEmail.toLowerCase(), 
        accountId,
        _id: { $ne: id }
      });
      if (existingEmail) {
        return createErrorResponse('Company with this contact email already exists', 409, 'DUPLICATE_CONTACT_EMAIL');
      }
    }

    // Update company fields
    const updateFields: any = {};
    
    if (name !== undefined) updateFields.name = name.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (industry !== undefined) updateFields.industry = industry.trim();
    if (size !== undefined) updateFields.size = size;
    if (website !== undefined) updateFields.website = website?.trim();
    if (logo !== undefined) updateFields.logo = logo;
    if (contactPerson !== undefined) updateFields.contactPerson = contactPerson?.trim();
    if (contactEmail !== undefined) updateFields.contactEmail = contactEmail.toLowerCase();
    if (contactPhone !== undefined) updateFields.contactPhone = contactPhone.trim();
    if (address !== undefined) updateFields.address = address?.trim();
    if (city !== undefined) updateFields.city = city?.trim();
    if (state !== undefined) updateFields.state = state?.trim();
    if (country !== undefined) updateFields.country = country?.trim();
    if (pincode !== undefined) updateFields.pincode = pincode?.trim();
    if (linkedinUrl !== undefined) updateFields.linkedinUrl = linkedinUrl?.trim();
    if (foundedYear !== undefined) updateFields.foundedYear = foundedYear ? parseInt(foundedYear) : undefined;
    if (employeeCount !== undefined) updateFields.employeeCount = employeeCount ? parseInt(employeeCount) : undefined;
    if (annualRevenue !== undefined) updateFields.annualRevenue = annualRevenue?.trim();

    // Update company
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-__v');

    return createSuccessResponse(updatedCompany, 'Company updated successfully');

  } catch (error) {
    console.error('Update company error:', error);
    return createErrorResponse('Failed to update company', 500, 'INTERNAL_ERROR');
  }
}

// DELETE /api/companies/[id] - Delete company
export async function DELETE(
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

    // Connect to database
    await dbConnect();

    // Find company by ID and account
    const company = await Company.findOne({ _id: id, accountId });
    if (!company) {
      return createErrorResponse('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    // Check for dependencies (placement drives)
    const hasDrives = await PlacementDrive.exists({ companyId: id, accountId });
    if (hasDrives) {
      return createErrorResponse(
        'Cannot delete company with existing placement drives. Consider deactivating instead.',
        400,
        'HAS_DRIVES'
      );
    }

    // Delete company
    await Company.findByIdAndDelete(id);

    return createSuccessResponse(
      { message: 'Company deleted successfully' },
      'Company deleted successfully'
    );

  } catch (error) {
    console.error('Delete company error:', error);
    return createErrorResponse('Failed to delete company', 500, 'INTERNAL_ERROR');
  }
} 