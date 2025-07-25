import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import { Company, PlacementDrive, Student } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/dashboard/quick-actions - Get quick actions data
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    
    // Get account ID
    const accountId = await getAccountFromHeaders(request);
    if (!accountId) {
      return createErrorResponse('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }

    // Connect to database
    await dbConnect();

    // Get current date for filtering
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get pending company approvals
    const pendingCompanies = await Company.find({ 
      accountId, 
      isApproved: false,
      isActive: true 
    })
    .select('name industry contactEmail createdAt')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    // Get upcoming drives (next 7 days)
    const upcomingDrives = await PlacementDrive.find({
      accountId,
      driveDate: { $gte: today, $lte: nextWeek },
      isActive: true,
      status: { $in: ['open', 'upcoming'] }
    })
    .populate('companyId', 'name')
    .select('jobTitle companyId driveDate registrationDeadline registeredStudents')
    .sort({ driveDate: 1 })
    .limit(5)
    .lean();

    // Get drives with registration deadlines today/tomorrow
    const urgentDrives = await PlacementDrive.find({
      accountId,
      registrationDeadline: { $gte: today, $lte: tomorrow },
      isActive: true,
      status: 'open'
    })
    .populate('companyId', 'name')
    .select('jobTitle companyId registrationDeadline registeredStudents')
    .sort({ registrationDeadline: 1 })
    .lean();

    // Get recent student registrations (last 24 hours)
    const recentRegistrations = await Student.find({
      accountId,
      'registeredDrives.registrationDate': { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    })
    .select('name rollNumber branch registeredDrives')
    .sort({ 'registeredDrives.registrationDate': -1 })
    .limit(10)
    .lean();

    // Get students with low CGPA (below 6.0) who might need attention
    const studentsNeedingAttention = await Student.find({
      accountId,
      cgpa: { $lt: 6.0 },
      isPlaced: false
    })
    .select('name rollNumber branch cgpa backlogs')
    .sort({ cgpa: 1 })
    .limit(5)
    .lean();

    // Get drives with low registration numbers
    const drivesWithLowRegistration = await PlacementDrive.find({
      accountId,
      isActive: true,
      status: 'open',
      registrationDeadline: { $gt: now }
    })
    .populate('companyId', 'name')
    .select('jobTitle companyId registrationDeadline registeredStudents')
    .lean();

    const drivesNeedingPromotion = drivesWithLowRegistration
      .filter((drive: any) => drive.registeredStudents.length < 10)
      .sort((a: any, b: any) => a.registeredStudents.length - b.registeredStudents.length)
      .slice(0, 5);

    // Prepare quick actions based on user role
    const quickActions = [];

    // Admin and TPO actions
    if (['admin', 'tpo'].includes(user.role)) {
      if (pendingCompanies.length > 0) {
        quickActions.push({
          id: 'approve-companies',
          title: 'Approve Companies',
          description: `${pendingCompanies.length} companies pending approval`,
          action: 'approve_companies',
          priority: 'high',
          count: pendingCompanies.length,
          link: '/admin/companies/pending',
        });
      }

      if (urgentDrives.length > 0) {
        quickActions.push({
          id: 'urgent-drives',
          title: 'Urgent Drive Deadlines',
          description: `${urgentDrives.length} drives with registration deadlines today/tomorrow`,
          action: 'urgent_drives',
          priority: 'high',
          count: urgentDrives.length,
          link: '/admin/drives/urgent',
        });
      }

      if (drivesNeedingPromotion.length > 0) {
        quickActions.push({
          id: 'promote-drives',
          title: 'Promote Drives',
          description: `${drivesNeedingPromotion.length} drives with low registration numbers`,
          action: 'promote_drives',
          priority: 'medium',
          count: drivesNeedingPromotion.length,
          link: '/admin/drives/promote',
        });
      }
    }

    // Faculty actions
    if (['admin', 'tpo', 'faculty'].includes(user.role)) {
      if (studentsNeedingAttention.length > 0) {
        quickActions.push({
          id: 'student-attention',
          title: 'Students Needing Attention',
          description: `${studentsNeedingAttention.length} students with CGPA below 6.0`,
          action: 'student_attention',
          priority: 'medium',
          count: studentsNeedingAttention.length,
          link: '/faculty/students/attention',
        });
      }
    }

    // General actions
    quickActions.push(
      {
        id: 'add-student',
        title: 'Add New Student',
        description: 'Register a new student',
        action: 'add_student',
        priority: 'normal',
        link: '/students/add',
      },
      {
        id: 'create-drive',
        title: 'Create Placement Drive',
        description: 'Schedule a new placement drive',
        action: 'create_drive',
        priority: 'normal',
        link: '/drives/create',
      },
      {
        id: 'add-company',
        title: 'Add New Company',
        description: 'Register a new company',
        action: 'add_company',
        priority: 'normal',
        link: '/companies/add',
      }
    );

    // Prepare urgent notifications
    const urgentNotifications: any[] = [];

    // Company approval notifications
    pendingCompanies.forEach((company: any) => {
      const daysPending = Math.floor((now.getTime() - new Date(company.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      if (daysPending >= 3) {
        urgentNotifications.push({
          id: `company-${company._id}`,
          type: 'company_approval',
          title: 'Company Approval Pending',
          message: `${company.name} has been pending approval for ${daysPending} days`,
          priority: 'high',
          timestamp: company.createdAt,
          action: 'approve_company',
          link: `/admin/companies/${company._id}/approve`,
        });
      }
    });

    // Drive deadline notifications
    urgentDrives.forEach((drive: any) => {
      const hoursLeft = Math.floor((new Date(drive.registrationDeadline).getTime() - now.getTime()) / (60 * 60 * 1000));
      urgentNotifications.push({
        id: `drive-${drive._id}`,
        type: 'drive_deadline',
        title: 'Registration Deadline Approaching',
        message: `${drive.jobTitle} registration closes in ${hoursLeft} hours`,
        priority: 'high',
        timestamp: drive.registrationDeadline,
        action: 'view_drive',
        link: `/drives/${drive._id}`,
      });
    });

    // Low registration notifications
    drivesNeedingPromotion.forEach((drive: any) => {
      urgentNotifications.push({
        id: `promote-${drive._id}`,
        type: 'low_registration',
        title: 'Low Drive Registration',
        message: `${drive.jobTitle} has only ${drive.registeredStudents.length} registrations`,
        priority: 'medium',
        timestamp: new Date(),
        action: 'promote_drive',
        link: `/drives/${drive._id}/promote`,
      });
    });

    // Sort notifications by priority and timestamp
    urgentNotifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Prepare response data
    const responseData = {
      quickActions: quickActions.slice(0, 8), // Limit to 8 actions
      urgentNotifications: urgentNotifications.slice(0, 10), // Limit to 10 notifications
      pendingApprovals: {
        companies: pendingCompanies.length,
        total: pendingCompanies.length,
      },
      upcomingEvents: {
        drives: upcomingDrives.length,
        urgentDeadlines: urgentDrives.length,
      },
      recentActivity: {
        registrations: recentRegistrations.length,
        studentsNeedingAttention: studentsNeedingAttention.length,
      },
      summary: {
        totalActions: quickActions.length,
        totalNotifications: urgentNotifications.length,
        highPriorityActions: quickActions.filter(a => a.priority === 'high').length,
        highPriorityNotifications: urgentNotifications.filter(n => n.priority === 'high').length,
      }
    };

    return createSuccessResponse(responseData, 'Quick actions retrieved successfully');

  } catch (error) {
    console.error('Get quick actions error:', error);
    return createErrorResponse('Failed to retrieve quick actions', 500, 'INTERNAL_ERROR');
  }
} 