import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, requireAuth, getAccountFromHeaders } from '@/lib/request-helpers';
import { Student } from '@/models';
import dbConnect from '@/lib/mongoose';

// GET /api/students/search - Advanced student search
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
    const query = searchParams.get('q') || '';
    const skills = searchParams.get('skills') || '';
    const isPlaced = searchParams.get('isPlaced') || '';
    const minCGPA = searchParams.get('minCGPA') || '';
    const maxCGPA = searchParams.get('maxCGPA') || '';
    const branch = searchParams.get('branch') || '';
    const semester = searchParams.get('semester') || '';
    const batchYear = searchParams.get('batchYear') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'relevance';

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return createErrorResponse('Invalid pagination parameters', 400, 'INVALID_PAGINATION');
    }

    // Connect to database
    await dbConnect();

    // Build search query
    const searchQuery: any = { accountId };

    // Full-text search across multiple fields
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { rollNumber: { $regex: query, $options: 'i' } },
        { branch: { $regex: query, $options: 'i' } },
        { technicalSkills: { $in: [new RegExp(query, 'i')] } },
        { softSkills: { $in: [new RegExp(query, 'i')] } },
        { languages: { $in: [new RegExp(query, 'i')] } },
      ];
    }

    // Skill-based search
    if (skills) {
      const skillArray = skills.split(',').map(skill => skill.trim());
      searchQuery.$or = searchQuery.$or || [];
      searchQuery.$or.push(
        { technicalSkills: { $in: skillArray.map(skill => new RegExp(skill, 'i')) } },
        { softSkills: { $in: skillArray.map(skill => new RegExp(skill, 'i')) } }
      );
    }

    // Placement status filter
    if (isPlaced !== '') {
      searchQuery.isPlaced = isPlaced === 'true';
    }

    // CGPA range filter
    if (minCGPA || maxCGPA) {
      searchQuery.cgpa = {};
      if (minCGPA) searchQuery.cgpa.$gte = parseFloat(minCGPA);
      if (maxCGPA) searchQuery.cgpa.$lte = parseFloat(maxCGPA);
    }

    // Other filters
    if (branch) searchQuery.branch = branch;
    if (semester) searchQuery.semester = parseInt(semester);
    if (batchYear) searchQuery.batchYear = parseInt(batchYear);

    // Build sort object
    let sort: any = {};
    switch (sortBy) {
      case 'name':
        sort.name = 1;
        break;
      case 'cgpa':
        sort.cgpa = -1;
        break;
      case 'semester':
        sort.semester = -1;
        break;
      case 'batchYear':
        sort.batchYear = -1;
        break;
      case 'createdAt':
        sort.createdAt = -1;
        break;
      case 'relevance':
      default:
        // For relevance, we'll sort by CGPA first, then by name
        sort = { cgpa: -1, name: 1 };
        break;
    }

    // Execute search with pagination
    const skip = (page - 1) * limit;
    
    const [students, total] = await Promise.all([
      Student.find(searchQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Student.countDocuments(searchQuery)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Prepare search results with relevance scoring
    const searchResults = students.map(student => {
      let relevanceScore = 0;
      
      // Calculate relevance score based on search query
      if (query) {
        const queryLower = query.toLowerCase();
        
        // Exact matches get higher scores
        if (student.name.toLowerCase().includes(queryLower)) relevanceScore += 10;
        if (student.email.toLowerCase().includes(queryLower)) relevanceScore += 8;
        if (student.rollNumber.toLowerCase().includes(queryLower)) relevanceScore += 8;
        if (student.branch.toLowerCase().includes(queryLower)) relevanceScore += 6;
        
        // Skill matches
        if (student.technicalSkills?.some((skill: string) => skill.toLowerCase().includes(queryLower))) {
          relevanceScore += 5;
        }
        if (student.softSkills?.some((skill: string) => skill.toLowerCase().includes(queryLower))) {
          relevanceScore += 3;
        }
      }

      // CGPA bonus
      if (student.cgpa >= 8.0) relevanceScore += 2;
      else if (student.cgpa >= 7.0) relevanceScore += 1;

      return {
        ...student,
        relevanceScore,
      };
    });

    // Sort by relevance score if relevance sorting is requested
    if (sortBy === 'relevance' && query) {
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Prepare response data
    const responseData = {
      students: searchResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      search: {
        query,
        skills,
        filters: {
          isPlaced,
          minCGPA,
          maxCGPA,
          branch,
          semester,
          batchYear,
        },
        sortBy,
      },
      stats: {
        totalResults: total,
        averageCGPA: students.length > 0 
          ? (students.reduce((sum, student) => sum + student.cgpa, 0) / students.length).toFixed(2)
          : 0,
        placedCount: students.filter(s => s.isPlaced).length,
        unplacedCount: students.filter(s => !s.isPlaced).length,
      }
    };

    return createSuccessResponse(responseData, 'Search completed successfully');

  } catch (error) {
    console.error('Student search error:', error);
    return createErrorResponse('Failed to perform search', 500, 'INTERNAL_ERROR');
  }
} 