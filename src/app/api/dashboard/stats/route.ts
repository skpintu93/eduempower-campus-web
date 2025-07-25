import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/edge-helpers';
import { Student, PlacementDrive, Company, Training } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/dashboard/stats - Get dashboard statistics
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

    // Get current date and calculate date ranges
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const lastMonth = new Date(currentYear, currentMonth - 1, 1);

    // Student Statistics
    const [
      totalStudents,
      placedStudents,
      unplacedStudents,
      studentsThisYear,
      studentsThisMonth,
      studentsByBranch,
      studentsBySemester,
      averageCGPA,
      topPerformers,
    ] = await Promise.all([
      // Total students
      Student.countDocuments({ accountId }),
      
      // Placed students
      Student.countDocuments({ accountId, isPlaced: true }),
      
      // Unplaced students
      Student.countDocuments({ accountId, isPlaced: false }),
      
      // Students added this year
      Student.countDocuments({ 
        accountId, 
        createdAt: { $gte: startOfYear } 
      }),
      
      // Students added this month
      Student.countDocuments({ 
        accountId, 
        createdAt: { $gte: startOfMonth } 
      }),
      
      // Students by branch
      Student.aggregate([
        { $match: { accountId } },
        { $group: { _id: '$branch', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Students by semester
      Student.aggregate([
        { $match: { accountId } },
        { $group: { _id: '$semester', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      
      // Average CGPA
      Student.aggregate([
        { $match: { accountId } },
        { $group: { _id: null, avgCGPA: { $avg: '$cgpa' } } }
      ]),
      
      // Top performers (CGPA >= 8.0)
      Student.find({ accountId, cgpa: { $gte: 8.0 } })
        .select('name rollNumber branch cgpa')
        .sort({ cgpa: -1 })
        .limit(10)
        .lean(),
    ]);

    // Placement Drive Statistics
    const [
      totalDrives,
      activeDrives,
      completedDrives,
      upcomingDrives,
      drivesThisYear,
      drivesThisMonth,
      drivesByStatus,
      drivesByCompany,
      totalRegistrations,
    ] = await Promise.all([
      // Total drives
      PlacementDrive.countDocuments({ accountId }),
      
      // Active drives
      PlacementDrive.countDocuments({ accountId, isActive: true }),
      
      // Completed drives
      PlacementDrive.countDocuments({ 
        accountId, 
        driveDate: { $lt: now },
        status: 'completed'
      }),
      
      // Upcoming drives
      PlacementDrive.countDocuments({ 
        accountId, 
        driveDate: { $gt: now },
        isActive: true
      }),
      
      // Drives this year
      PlacementDrive.countDocuments({ 
        accountId, 
        createdAt: { $gte: startOfYear } 
      }),
      
      // Drives this month
      PlacementDrive.countDocuments({ 
        accountId, 
        createdAt: { $gte: startOfMonth } 
      }),
      
      // Drives by status
      PlacementDrive.aggregate([
        { $match: { accountId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Drives by company
      PlacementDrive.aggregate([
        { $match: { accountId } },
        { $lookup: { from: 'companies', localField: 'companyId', foreignField: '_id', as: 'company' } },
        { $unwind: '$company' },
        { $group: { _id: '$company.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Total registrations
      PlacementDrive.aggregate([
        { $match: { accountId } },
        { $group: { _id: null, totalRegistrations: { $sum: { $size: '$registeredStudents' } } } }
      ]),
    ]);

    // Company Statistics
    const [
      totalCompanies,
      approvedCompanies,
      pendingCompanies,
      companiesThisYear,
      companiesThisMonth,
      companiesByIndustry,
      companiesBySize,
    ] = await Promise.all([
      // Total companies
      Company.countDocuments({ accountId }),
      
      // Approved companies
      Company.countDocuments({ accountId, isApproved: true }),
      
      // Pending companies
      Company.countDocuments({ accountId, isApproved: false }),
      
      // Companies added this year
      Company.countDocuments({ 
        accountId, 
        createdAt: { $gte: startOfYear } 
      }),
      
      // Companies added this month
      Company.countDocuments({ 
        accountId, 
        createdAt: { $gte: startOfMonth } 
      }),
      
      // Companies by industry
      Company.aggregate([
        { $match: { accountId } },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Companies by size
      Company.aggregate([
        { $match: { accountId } },
        { $group: { _id: '$size', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
    ]);

    // Training Statistics (if Training model exists)
    let trainingStats = {
      totalTrainings: 0,
      activeTrainings: 0,
      completedTrainings: 0,
      upcomingTrainings: 0,
      totalParticipants: 0,
    };

    try {
      const [
        totalTrainings,
        activeTrainings,
        completedTrainings,
        upcomingTrainings,
        totalParticipants,
      ] = await Promise.all([
        Training.countDocuments({ accountId }),
        Training.countDocuments({ accountId, isActive: true }),
        Training.countDocuments({ 
          accountId, 
          endDate: { $lt: now },
          status: 'completed'
        }),
        Training.countDocuments({ 
          accountId, 
          startDate: { $gt: now },
          isActive: true
        }),
        Training.aggregate([
          { $match: { accountId } },
          { $group: { _id: null, totalParticipants: { $sum: { $size: '$registeredStudents' } } } }
        ]),
      ]);

      trainingStats = {
        totalTrainings,
        activeTrainings,
        completedTrainings,
        upcomingTrainings,
        totalParticipants: totalParticipants[0]?.totalParticipants || 0,
      };
    } catch (error) {
      // Training model might not exist yet, use default values
      console.log('Training model not available yet');
    }

    // Calculate percentages and additional metrics
    const placementRate = totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(2) : '0';
    const avgCGPAValue = averageCGPA[0]?.avgCGPA || 0;
    const totalRegistrationsValue = totalRegistrations[0]?.totalRegistrations || 0;

    // Prepare response data
    const responseData = {
      overview: {
        totalStudents: parseInt(totalStudents.toString()),
        placedStudents: parseInt(placedStudents.toString()),
        unplacedStudents: parseInt(unplacedStudents.toString()),
        placementRate: parseFloat(placementRate),
        totalDrives: parseInt(totalDrives.toString()),
        activeDrives: parseInt(activeDrives.toString()),
        totalCompanies: parseInt(totalCompanies.toString()),
        approvedCompanies: parseInt(approvedCompanies.toString()),
        pendingCompanies: parseInt(pendingCompanies.toString()),
      },
      students: {
        total: parseInt(totalStudents.toString()),
        placed: parseInt(placedStudents.toString()),
        unplaced: parseInt(unplacedStudents.toString()),
        thisYear: parseInt(studentsThisYear.toString()),
        thisMonth: parseInt(studentsThisMonth.toString()),
        byBranch: studentsByBranch,
        bySemester: studentsBySemester,
        averageCGPA: parseFloat(avgCGPAValue.toFixed(2)),
        topPerformers,
      },
      drives: {
        total: parseInt(totalDrives.toString()),
        active: parseInt(activeDrives.toString()),
        completed: parseInt(completedDrives.toString()),
        upcoming: parseInt(upcomingDrives.toString()),
        thisYear: parseInt(drivesThisYear.toString()),
        thisMonth: parseInt(drivesThisMonth.toString()),
        byStatus: drivesByStatus,
        byCompany: drivesByCompany,
        totalRegistrations: parseInt(totalRegistrationsValue.toString()),
      },
      companies: {
        total: parseInt(totalCompanies.toString()),
        approved: parseInt(approvedCompanies.toString()),
        pending: parseInt(pendingCompanies.toString()),
        thisYear: parseInt(companiesThisYear.toString()),
        thisMonth: parseInt(companiesThisMonth.toString()),
        byIndustry: companiesByIndustry,
        bySize: companiesBySize,
      },
      training: trainingStats,
      period: {
        currentYear,
        currentMonth: currentMonth + 1,
        startOfYear,
        startOfMonth,
        lastMonth,
      }
    };

    return createSuccessResponse(responseData, 'Dashboard statistics retrieved successfully');

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return createErrorResponse('Failed to retrieve dashboard statistics', 500, 'INTERNAL_ERROR');
  }
} 