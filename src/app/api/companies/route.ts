import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { Company } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/companies - List companies with pagination, filtering, and search
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    
    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const industry = searchParams.get('industry') || '';
    const size = searchParams.get('size') || '';
    const approvalStatus = searchParams.get('approvalStatus') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return createErrorResponse('Invalid pagination parameters', 400, 'INVALID_PAGINATION');
    }

    // Connect to database
    await dbConnect();

    // Build query
    const query: any = { accountId };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { website: { $regex: search, $options: 'i' } },
      ];
    }

    // Add filters
    if (industry) query.industry = industry;
    if (size) query.size = size;
    if (approvalStatus) query.isApproved = approvalStatus === 'approved';

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Company.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Prepare response data
    const responseData = {
      companies,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search,
        industry,
        size,
        approvalStatus,
        sortBy,
        sortOrder,
      }
    };

    return createSuccessResponse(responseData, 'Companies retrieved successfully');

  } catch (error) {
    console.error('Get companies error:', error);
    return createErrorResponse('Failed to retrieve companies', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/companies - Create new company
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!name || !description || !industry || !contactEmail || !contactPhone) {
      return createErrorResponse('Missing required fields', 400, 'MISSING_FIELDS');
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(contactEmail)) {
      return createErrorResponse('Invalid contact email format', 400, 'INVALID_EMAIL');
    }

    // Validate phone format
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(contactPhone)) {
      return createErrorResponse('Invalid contact phone format', 400, 'INVALID_PHONE');
    }

    // Validate website format if provided
    if (website) {
      const websiteRegex = /^https?:\/\/.+/;
      if (!websiteRegex.test(website)) {
        return createErrorResponse('Invalid website format. Must start with http:// or https://', 400, 'INVALID_WEBSITE');
      }
    }

    // Connect to database
    await dbConnect();

    // Check for duplicate company name in the same account
    const existingCompany = await Company.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      accountId 
    });
    if (existingCompany) {
      return createErrorResponse('Company with this name already exists', 409, 'DUPLICATE_COMPANY_NAME');
    }

    // Check for duplicate contact email in the same account
    const existingEmail = await Company.findOne({ 
      contactEmail: contactEmail.toLowerCase(), 
      accountId 
    });
    if (existingEmail) {
      return createErrorResponse('Company with this contact email already exists', 409, 'DUPLICATE_CONTACT_EMAIL');
    }

    // Create new company
    const newCompany = new Company({
      name: name.trim(),
      description: description.trim(),
      industry: industry.trim(),
      size: size || 'medium',
      website: website?.trim(),
      logo: logo,
      contactPerson: contactPerson?.trim(),
      contactEmail: contactEmail.toLowerCase(),
      contactPhone: contactPhone.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      country: country?.trim() || 'India',
      pincode: pincode?.trim(),
      linkedinUrl: linkedinUrl?.trim(),
      foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
      employeeCount: employeeCount ? parseInt(employeeCount) : undefined,
      annualRevenue: annualRevenue?.trim(),
      accountId,
      isApproved: false, // Default to pending approval
      isActive: true,
      drives: [],
      createdAt: new Date(),
    });

    // Save company
    await newCompany.save();

    // Return created company (without sensitive fields)
    const companyResponse = {
      id: newCompany._id,
      name: newCompany.name,
      description: newCompany.description,
      industry: newCompany.industry,
      size: newCompany.size,
      website: newCompany.website,
      logo: newCompany.logo,
      contactPerson: newCompany.contactPerson,
      contactEmail: newCompany.contactEmail,
      contactPhone: newCompany.contactPhone,
      city: newCompany.city,
      state: newCompany.state,
      country: newCompany.country,
      isApproved: newCompany.isApproved,
      isActive: newCompany.isActive,
      createdAt: newCompany.createdAt,
    };

    return createSuccessResponse(companyResponse, 'Company created successfully', 201);

  } catch (error) {
    console.error('Create company error:', error);
    return createErrorResponse('Failed to create company', 500, 'INTERNAL_ERROR');
  }
} 