import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import { Company, PlacementDrive } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/companies/[id]/drives - Get drives for a specific company
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const jobType = searchParams.get('jobType') || '';
    const minCTC = searchParams.get('minCTC') || '';
    const maxCTC = searchParams.get('maxCTC') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'driveDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return createErrorResponse('Invalid pagination parameters', 400, 'INVALID_PAGINATION');
    }

    // Connect to database
    await dbConnect();

    // Verify company exists and belongs to account
    const company = await Company.findOne({ _id: id, accountId })
      .select('name industry isApproved')
      .lean() as any;

    if (!company) {
      return createErrorResponse('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    // Build query for drives
    const query: any = { 
      companyId: id, 
      accountId 
    };

    // Add search filter
    if (search) {
      query.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { jobDescription: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    // Add filters
    if (status) query.status = status;
    if (jobType) query.jobType = jobType;
    if (minCTC) query.ctc = { $gte: parseFloat(minCTC) };
    if (maxCTC) {
      if (query.ctc) {
        query.ctc.$lte = parseFloat(maxCTC);
      } else {
        query.ctc = { $lte: parseFloat(maxCTC) };
      }
    }

    // Add date range filter
    if (startDate || endDate) {
      query.driveDate = {};
      if (startDate) query.driveDate.$gte = new Date(startDate);
      if (endDate) query.driveDate.$lte = new Date(endDate);
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [drives, total] = await Promise.all([
      PlacementDrive.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      PlacementDrive.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Calculate drive statistics
    const driveStats = await PlacementDrive.aggregate([
      { $match: { companyId: id, accountId } },
      {
        $group: {
          _id: null,
          totalDrives: { $sum: 1 },
          totalRegistrations: { $sum: { $size: '$registeredStudents' } },
          totalSelected: { $sum: { $size: { $filter: { input: '$results', cond: { $eq: ['$$this.status', 'selected'] } } } } },
          averageCTC: { $avg: '$ctc' },
          totalCTC: { $sum: '$ctc' },
          drivesByStatus: {
            $push: {
              status: '$status',
              count: 1
            }
          }
        }
      }
    ]);

    // Process status distribution
    const statusDistribution = await PlacementDrive.aggregate([
      { $match: { companyId: id, accountId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Process job type distribution
    const jobTypeDistribution = await PlacementDrive.aggregate([
      { $match: { companyId: id, accountId } },
      { $group: { _id: '$jobType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Process CTC distribution
    const ctcDistribution = await PlacementDrive.aggregate([
      { $match: { companyId: id, accountId, ctc: { $exists: true, $ne: null } } },
      {
        $bucket: {
          groupBy: '$ctc',
          boundaries: [0, 5, 10, 15, 20, 25, 30, 35, 40, 50],
          default: '50+',
          output: {
            count: { $sum: 1 },
            drives: { $push: { jobTitle: '$jobTitle', ctc: '$ctc' } }
          }
        }
      }
    ]);

    // Get recent drives (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentDrives = await PlacementDrive.find({
      companyId: id,
      accountId,
      createdAt: { $gte: sixMonthsAgo }
    })
    .select('jobTitle status driveDate registeredStudents results')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    // Prepare response data
    const responseData = {
      company: {
        id: company._id,
        name: company.name,
        industry: company.industry,
        isApproved: company.isApproved,
      },
      drives,
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
        status,
        jobType,
        minCTC,
        maxCTC,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      },
      statistics: {
        totalDrives: driveStats[0]?.totalDrives || 0,
        totalRegistrations: driveStats[0]?.totalRegistrations || 0,
        totalSelected: driveStats[0]?.totalSelected || 0,
        averageCTC: driveStats[0]?.averageCTC ? parseFloat(driveStats[0].averageCTC.toFixed(2)) : 0,
        totalCTC: driveStats[0]?.totalCTC || 0,
        selectionRate: driveStats[0]?.totalRegistrations > 0 
          ? ((driveStats[0].totalSelected / driveStats[0].totalRegistrations) * 100).toFixed(2)
          : '0',
        averageRegistrationsPerDrive: driveStats[0]?.totalDrives > 0
          ? (driveStats[0].totalRegistrations / driveStats[0].totalDrives).toFixed(2)
          : '0',
      },
      distributions: {
        status: statusDistribution,
        jobType: jobTypeDistribution,
        ctc: ctcDistribution,
      },
      recentActivity: {
        recentDrives: recentDrives.length,
        drives: recentDrives.map((drive: any) => ({
          jobTitle: drive.jobTitle,
          status: drive.status,
          driveDate: drive.driveDate,
          registrations: drive.registeredStudents.length,
          selected: drive.results ? drive.results.filter((r: any) => r.status === 'selected').length : 0,
        })),
      }
    };

    return createSuccessResponse(responseData, 'Company drives retrieved successfully');

  } catch (error) {
    console.error('Get company drives error:', error);
    return createErrorResponse('Failed to retrieve company drives', 500, 'INTERNAL_ERROR');
  }
} 