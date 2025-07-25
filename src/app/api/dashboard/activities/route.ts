import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { Student, PlacementDrive, Company } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/dashboard/activities - Get recent activities
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || ''; // student, drive, company, all
    const action = searchParams.get('action') || ''; // created, updated, deleted, etc.

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return createErrorResponse('Invalid pagination parameters', 400, 'INVALID_PAGINATION');
    }

    // Connect to database
    await dbConnect();

    // Get current date for filtering
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Build activities array
    const activities: any[] = [];

    // Get recent student activities
    if (!type || type === 'student' || type === 'all') {
      const recentStudents = await Student.find({ 
        accountId, 
        createdAt: { $gte: thirtyDaysAgo } 
      })
      .select('name rollNumber branch createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

      recentStudents.forEach(student => {
        activities.push({
          id: `student-${student._id}`,
          type: 'student',
          action: 'created',
          title: 'New Student Added',
          description: `${student.name} (${student.rollNumber}) from ${student.branch} branch`,
          entityId: student._id,
          entityName: student.name,
          timestamp: student.createdAt,
          priority: 'medium',
        });
      });
    }

    // Get recent placement drive activities
    if (!type || type === 'drive' || type === 'all') {
      const recentDrives = await PlacementDrive.find({ 
        accountId, 
        createdAt: { $gte: thirtyDaysAgo } 
      })
      .populate('companyId', 'name')
      .select('jobTitle companyId status createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

      recentDrives.forEach(drive => {
        activities.push({
          id: `drive-${drive._id}`,
          type: 'drive',
          action: 'created',
          title: 'New Placement Drive',
          description: `${drive.jobTitle} at ${drive.companyId?.name || 'Unknown Company'}`,
          entityId: drive._id,
          entityName: drive.jobTitle,
          timestamp: drive.createdAt,
          priority: 'high',
          metadata: {
            company: drive.companyId?.name,
            status: drive.status,
          },
        });
      });

      // Get drives with status changes
      const drivesWithUpdates = await PlacementDrive.find({ 
        accountId, 
        updatedAt: { $gte: thirtyDaysAgo, $gt: '$createdAt' } 
      })
      .populate('companyId', 'name')
      .select('jobTitle companyId status updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

      drivesWithUpdates.forEach(drive => {
        activities.push({
          id: `drive-update-${drive._id}`,
          type: 'drive',
          action: 'updated',
          title: 'Drive Status Updated',
          description: `${drive.jobTitle} status changed to ${drive.status}`,
          entityId: drive._id,
          entityName: drive.jobTitle,
          timestamp: drive.updatedAt,
          priority: 'medium',
          metadata: {
            company: drive.companyId?.name,
            status: drive.status,
          },
        });
      });
    }

    // Get recent company activities
    if (!type || type === 'company' || type === 'all') {
      const recentCompanies = await Company.find({ 
        accountId, 
        createdAt: { $gte: thirtyDaysAgo } 
      })
      .select('name industry isApproved createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

      recentCompanies.forEach(company => {
        activities.push({
          id: `company-${company._id}`,
          type: 'company',
          action: 'created',
          title: 'New Company Registered',
          description: `${company.name} (${company.industry}) - ${company.isApproved ? 'Approved' : 'Pending Approval'}`,
          entityId: company._id,
          entityName: company.name,
          timestamp: company.createdAt,
          priority: company.isApproved ? 'medium' : 'high',
          metadata: {
            industry: company.industry,
            approvalStatus: company.isApproved ? 'approved' : 'pending',
          },
        });
      });

      // Get companies with approval status changes
      const companiesWithApprovalChanges = await Company.find({ 
        accountId, 
        $or: [
          { approvalDate: { $gte: thirtyDaysAgo } },
          { rejectionDate: { $gte: thirtyDaysAgo } }
        ]
      })
      .select('name industry isApproved approvalDate rejectionDate')
      .sort({ approvalDate: -1, rejectionDate: -1 })
      .limit(5)
      .lean();

      companiesWithApprovalChanges.forEach(company => {
        const action = company.isApproved ? 'approved' : 'rejected';
        const timestamp = company.isApproved ? company.approvalDate : company.rejectionDate;
        
        activities.push({
          id: `company-${action}-${company._id}`,
          type: 'company',
          action,
          title: `Company ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          description: `${company.name} was ${action}`,
          entityId: company._id,
          entityName: company.name,
          timestamp,
          priority: 'high',
          metadata: {
            industry: company.industry,
            approvalStatus: company.isApproved ? 'approved' : 'rejected',
          },
        });
      });
    }

    // Get placement activities (students getting placed)
    const recentPlacements = await Student.find({ 
      accountId, 
      isPlaced: true,
      placementDate: { $gte: thirtyDaysAgo }
    })
    .select('name rollNumber branch placementDate')
    .sort({ placementDate: -1 })
    .limit(10)
    .lean();

    recentPlacements.forEach(student => {
      activities.push({
        id: `placement-${student._id}`,
        type: 'placement',
        action: 'placed',
        title: 'Student Placed',
        description: `${student.name} (${student.rollNumber}) from ${student.branch} branch got placed`,
        entityId: student._id,
        entityName: student.name,
        timestamp: student.placementDate,
        priority: 'high',
        metadata: {
          branch: student.branch,
          rollNumber: student.rollNumber,
        },
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply action filter if specified
    let filteredActivities = activities;
    if (action) {
      filteredActivities = activities.filter(activity => activity.action === action);
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedActivities = filteredActivities.slice(skip, skip + limit);
    const total = filteredActivities.length;

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Group activities by date
    const groupedActivities = paginatedActivities.reduce((groups: any, activity) => {
      const date = new Date(activity.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    }, {});

    // Prepare response data
    const responseData = {
      activities: paginatedActivities,
      groupedActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        type,
        action,
      },
      summary: {
        totalActivities: total,
        recentPlacements: recentPlacements.length,
        pendingApprovals: activities.filter(a => 
          a.type === 'company' && a.metadata?.approvalStatus === 'pending'
        ).length,
        upcomingDrives: activities.filter(a => 
          a.type === 'drive' && a.metadata?.status === 'upcoming'
        ).length,
      }
    };

    return createSuccessResponse(responseData, 'Recent activities retrieved successfully');

  } catch (error) {
    console.error('Get activities error:', error);
    return createErrorResponse('Failed to retrieve recent activities', 500, 'INTERNAL_ERROR');
  }
} 