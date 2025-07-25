# Phase 4: Core API Routes

## Overview
Creating comprehensive API routes for all core functionality including student management, placement drives, training, companies, assessments, and notifications.

## Task 4.1: Student Management APIs

### Student CRUD Operations
- [ ] Create `/api/students/route.ts` (GET, POST)
- [ ] Create `/api/students/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Implement proper error handling
- [ ] Add input validation with Zod

### Student List API (GET)
- [ ] Add pagination support
- [ ] Add filtering by branch, semester, CGPA
- [ ] Add search by name, email, roll number
- [ ] Add sorting options
- [ ] Include account-based filtering

### Student Creation API (POST)
- [ ] Validate student data
- [ ] Check for duplicate roll numbers
- [ ] Check for duplicate emails
- [ ] Associate with account
- [ ] Return created student data

### Student Update API (PUT)
- [ ] Validate update data
- [ ] Handle partial updates
- [ ] Maintain data integrity
- [ ] Return updated student data

### Student Deletion API (DELETE)
- [ ] Soft delete implementation
- [ ] Check for dependencies
- [ ] Handle cascade deletion
- [ ] Return success response

### Bulk Import API
- [ ] Create `/api/students/bulk-import/route.ts`
- [ ] Handle CSV/Excel file upload
- [ ] Validate bulk data
- [ ] Process in batches
- [ ] Return import results

### Student Search API
- [ ] Create `/api/students/search/route.ts`
- [ ] Implement full-text search
- [ ] Add skill-based search
- [ ] Add placement status filter
- [ ] Return search results

### Student Documents API
- [ ] Create `/api/students/[id]/documents/route.ts`
- [ ] Handle file uploads
- [ ] Validate file types
- [ ] Store file references
- [ ] Return document list

## Task 4.2: Placement Drive APIs

### Drive CRUD Operations
- [ ] Create `/api/drives/route.ts` (GET, POST)
- [ ] Create `/api/drives/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Add proper validation
- [ ] Include company association

### Drive List API (GET)
- [ ] Add pagination
- [ ] Filter by company, status, date
- [ ] Search by job title
- [ ] Include company details
- [ ] Add account-based filtering

### Drive Creation API (POST)
- [ ] Validate drive data
- [ ] Check company approval
- [ ] Set default status
- [ ] Create eligibility criteria
- [ ] Return created drive

### Drive Update API (PUT)
- [ ] Validate updates
- [ ] Handle status changes
- [ ] Update eligibility if needed
- [ ] Return updated drive

### Drive Registration API
- [ ] Create `/api/drives/[id]/register/route.ts`
- [ ] Check student eligibility
- [ ] Validate registration deadline
- [ ] Add student to registered list
- [ ] Send confirmation

### Drive Results API
- [ ] Create `/api/drives/[id]/results/route.ts`
- [ ] Handle result submission
- [ ] Update student status
- [ ] Generate notifications
- [ ] Return results summary

### Eligible Students API
- [ ] Create `/api/drives/[id]/eligible-students/route.ts`
- [ ] Apply eligibility criteria
- [ ] Filter by CGPA, backlogs, branch
- [ ] Return eligible student list
- [ ] Include student details

## Task 4.3: Training Management APIs

### Training CRUD Operations
- [ ] Create `/api/training/route.ts` (GET, POST)
- [ ] Create `/api/training/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Add validation
- [ ] Include trainer association

### Training List API (GET)
- [ ] Add pagination
- [ ] Filter by type, status, date
- [ ] Search by title
- [ ] Include trainer details
- [ ] Add account-based filtering

### Training Creation API (POST)
- [ ] Validate training data
- [ ] Check trainer availability
- [ ] Set default status
- [ ] Create schedule
- [ ] Return created training

### Training Registration API
- [ ] Create `/api/training/[id]/register/route.ts`
- [ ] Check capacity limits
- [ ] Validate registration period
- [ ] Add student to registered list
- [ ] Send confirmation

### Training Attendance API
- [ ] Create `/api/training/[id]/attendance/route.ts`
- [ ] Handle attendance marking
- [ ] Support bulk attendance
- [ ] Track attendance history
- [ ] Generate attendance reports

### Training Certificate API
- [ ] Create `/api/training/[id]/certificate/route.ts`
- [ ] Generate certificates
- [ ] Check completion criteria
- [ ] Create PDF certificates
- [ ] Return certificate data

## Task 4.4: Company Management APIs

### Company CRUD Operations
- [ ] Create `/api/companies/route.ts` (GET, POST)
- [ ] Create `/api/companies/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Add validation
- [ ] Include approval workflow

### Company List API (GET)
- [ ] Add pagination
- [ ] Filter by industry, size, approval status
- [ ] Search by name
- [ ] Include approval details
- [ ] Add account-based filtering

### Company Creation API (POST)
- [ ] Validate company data
- [ ] Set pending approval status
- [ ] Create contact information
- [ ] Return created company

### Company Approval API
- [ ] Create `/api/companies/[id]/approve/route.ts`
- [ ] Handle approval/rejection
- [ ] Update approval status
- [ ] Send notification
- [ ] Return approval result

### Company Drives API
- [ ] Create `/api/companies/[id]/drives/route.ts`
- [ ] List company drives
- [ ] Include drive statistics
- [ ] Add filtering options
- [ ] Return drive list

## Task 4.5: Assessment APIs

### Assessment CRUD Operations
- [ ] Create `/api/assessments/route.ts` (GET, POST)
- [ ] Create `/api/assessments/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Add validation
- [ ] Include association with drives/training

### Assessment List API (GET)
- [ ] Add pagination
- [ ] Filter by type, date, association
- [ ] Search by title
- [ ] Include association details
- [ ] Add account-based filtering

### Assessment Creation API (POST)
- [ ] Validate assessment data
- [ ] Set schedule
- [ ] Create association
- [ ] Return created assessment

### Assessment Scores API
- [ ] Create `/api/assessments/[id]/scores/route.ts`
- [ ] Handle score submission
- [ ] Support bulk scoring
- [ ] Calculate statistics
- [ ] Return score data

### Assessment Results API
- [ ] Create `/api/assessments/[id]/results/route.ts`
- [ ] Generate result summary
- [ ] Calculate rankings
- [ ] Include feedback
- [ ] Return results

## Task 4.6: Notification APIs

### Notification CRUD Operations
- [ ] Create `/api/notifications/route.ts` (GET, POST)
- [ ] Add validation
- [ ] Include delivery tracking

### Notification List API (GET)
- [ ] Add pagination
- [ ] Filter by type, category, date
- [ ] Include read status
- [ ] Add account-based filtering
- [ ] Support user-specific notifications

### Notification Creation API (POST)
- [ ] Validate notification data
- [ ] Set delivery options
- [ ] Create recipient list
- [ ] Return created notification

### Bulk Notification API
- [ ] Create `/api/notifications/send-bulk/route.ts`
- [ ] Handle bulk notifications
- [ ] Support different channels (email, SMS, in-app)
- [ ] Track delivery status
- [ ] Return delivery results

### Mark as Read API
- [ ] Create `/api/notifications/mark-read/route.ts`
- [ ] Handle read status updates
- [ ] Support bulk mark as read
- [ ] Update read timestamps
- [ ] Return update result

## Task 4.7: Dashboard APIs

### Dashboard Statistics API
- [ ] Create `/api/dashboard/stats/route.ts`
- [ ] Calculate placement statistics
- [ ] Include drive summaries
- [ ] Add training statistics
- [ ] Return dashboard data

### Recent Activities API
- [ ] Create `/api/dashboard/activities/route.ts`
- [ ] List recent activities
- [ ] Include user actions
- [ ] Add filtering options
- [ ] Return activity feed

### Quick Actions API
- [ ] Create `/api/dashboard/quick-actions/route.ts`
- [ ] Provide quick action data
- [ ] Include pending approvals
- [ ] Add urgent notifications
- [ ] Return action items

## Task 4.8: File Upload APIs

### File Upload API
- [ ] Create `/api/upload/route.ts`
- [ ] Handle file uploads
- [ ] Validate file types
- [ ] Store file metadata
- [ ] Return file information

### Document Management API
- [ ] Create `/api/documents/route.ts`
- [ ] List uploaded documents
- [ ] Handle document deletion
- [ ] Add document categories
- [ ] Return document list

## Task 4.9: Search APIs

### Global Search API
- [ ] Create `/api/search/route.ts`
- [ ] Implement full-text search
- [ ] Search across entities
- [ ] Add result ranking
- [ ] Return search results

### Advanced Search API
- [ ] Create `/api/search/advanced/route.ts`
- [ ] Support complex queries
- [ ] Add filters and facets
- [ ] Include result aggregation
- [ ] Return detailed results

## Task 4.10: Export APIs

### Data Export API
- [ ] Create `/api/export/route.ts`
- [ ] Support multiple formats (CSV, Excel, PDF)
- [ ] Handle large datasets
- [ ] Add export scheduling
- [ ] Return export status

### Report Generation API
- [ ] Create `/api/reports/route.ts`
- [ ] Generate placement reports
- [ ] Create training reports
- [ ] Add custom report templates
- [ ] Return report data

## Success Criteria
- [ ] All CRUD operations working
- [ ] Proper validation implemented
- [ ] Error handling in place
- [ ] Authentication integrated
- [ ] Multi-tenant support working
- [ ] API responses standardized
- [ ] Performance optimized
- [ ] Documentation complete

## Estimated Time: 3-4 days 