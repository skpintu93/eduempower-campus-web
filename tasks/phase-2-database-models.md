# Phase 2: Database Models & Schema Design

## Overview
Creating comprehensive database models for the campus placement management system with proper relationships, validation, and indexing.

## Task 2.1: Account Model (School/College)

### Create Account Schema
- [ ] Create `src/models/Account.ts`
- [ ] Define interface `IAccount` extending Document
- [ ] Add basic fields:
  - [ ] `name: string` (required)
  - [ ] `phone?: string`
  - [ ] `domains: string[]` (required)
  - [ ] `accountType: string` (required)
  - [ ] `signupType: string` (required)

### Add Settings Object
- [ ] Add `settings` object with:
  - [ ] `theme: string`
  - [ ] `currency: string`
  - [ ] `timezone: string`
  - [ ] `logo: string`
  - [ ] `email.primaryEmail: string`
  - [ ] `email.noreplyEmail: string`

### Add Address Object
- [ ] Add `address` object with:
  - [ ] `pincode: string`
  - [ ] `addressLine: string`
  - [ ] `landmark?: string`
  - [ ] `city: string`
  - [ ] `district: string`
  - [ ] `state: string`
  - [ ] `country: string`

### Add School-Specific Fields
- [ ] Add `accreditation: string`
- [ ] Add `yearEstablished: number`
- [ ] Add `totalStudents: number`
- [ ] Add `departments: string[]`
- [ ] Add `isActive: boolean`

### Add Validation & Indexes
- [ ] Add email validation for settings
- [ ] Add domain validation
- [ ] Create compound index on `domains`
- [ ] Add timestamps

## Task 2.2: User Model (Staff)

### Create User Schema
- [ ] Create `src/models/User.ts`
- [ ] Define interface `IUser` extending Document
- [ ] Add basic fields:
  - [ ] `name: string` (required)
  - [ ] `email: string` (required, unique)
  - [ ] `phone?: string`
  - [ ] `password: string` (required)
  - [ ] `role: 'admin' | 'tpo' | 'faculty' | 'coordinator'` (required)
  - [ ] `accountId: Types.ObjectId` (required, ref: 'Account')
  - [ ] `profilePic?: string`

### Add Password Hashing
- [ ] Install bcryptjs if not already installed
- [ ] Add pre-save middleware for password hashing
- [ ] Add `comparePassword` method
- [ ] Add password validation (min length, complexity)

### Add User Status Fields
- [ ] Add `isActive: boolean`
- [ ] Add `lastLoginAt: Date`
- [ ] Add `emailVerified: boolean`
- [ ] Add `phoneVerified: boolean`

### Add Validation & Indexes
- [ ] Add email validation with regex
- [ ] Create compound index on `accountId + email`
- [ ] Add role validation
- [ ] Add timestamps

## Task 2.3: Student Model

### Create Student Schema
- [ ] Create `src/models/Student.ts`
- [ ] Define interface `IStudent` extending Document

### Personal Information
- [ ] Add personal fields:
  - [ ] `name: string` (required)
  - [ ] `email: string` (required, unique)
  - [ ] `phone: string` (required)
  - [ ] `dateOfBirth: Date`
  - [ ] `gender: 'male' | 'female' | 'other'`
  - [ ] `profilePic?: string`

### Academic Information
- [ ] Add academic fields:
  - [ ] `rollNumber: string` (required, unique)
  - [ ] `branch: string` (required)
  - [ ] `semester: number` (required)
  - [ ] `cgpa: number` (required, min: 0, max: 10)
  - [ ] `backlogs: number` (default: 0)
  - [ ] `batchYear: number` (required)
  - [ ] `section: string`

### Documents & Skills
- [ ] Add documents array:
  - [ ] `resume?: string`
  - [ ] `certificates: string[]`
  - [ ] `documents: { name: string, url: string, type: string }[]`
- [ ] Add skills:
  - [ ] `technicalSkills: string[]`
  - [ ] `softSkills: string[]`
  - [ ] `languages: string[]`

### Placement Status
- [ ] Add placement fields:
  - [ ] `registeredDrives: { driveId: Types.ObjectId, status: string, registeredAt: Date }[]`
  - [ ] `offers: { companyId: Types.ObjectId, ctc: number, position: string, offerDate: Date }[]`
  - [ ] `trainingStatus: { trainingId: Types.ObjectId, status: string, completionDate?: Date }[]`
  - [ ] `isPlaced: boolean` (default: false)
  - [ ] `placementDate?: Date`

### Account Association
- [ ] Add `accountId: Types.ObjectId` (required, ref: 'Account')
- [ ] Create compound index on `accountId + rollNumber`
- [ ] Create compound index on `accountId + email`

## Task 2.4: Company Model

### Create Company Schema
- [ ] Create `src/models/Company.ts`
- [ ] Define interface `ICompany` extending Document

### Company Information
- [ ] Add company fields:
  - [ ] `name: string` (required)
  - [ ] `website?: string`
  - [ ] `industry: string` (required)
  - [ ] `size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'`
  - [ ] `description?: string`
  - [ ] `logo?: string`

### Contact Information
- [ ] Add contact fields:
  - [ ] `primaryContact: { name: string, email: string, phone: string }`
  - [ ] `secondaryContact?: { name: string, email: string, phone: string }`
  - [ ] `address?: { street: string, city: string, state: string, country: string, pincode: string }`

### Approval Status
- [ ] Add approval fields:
  - [ ] `isApproved: boolean` (default: false)
  - [ ] `approvedBy?: Types.ObjectId` (ref: 'User')
  - [ ] `approvedAt?: Date`
  - [ ] `rejectionReason?: string`

### Account Association
- [ ] Add `accountId: Types.ObjectId` (required, ref: 'Account')
- [ ] Create index on `accountId + isApproved`

## Task 2.5: Placement Drive Model

### Create Placement Drive Schema
- [ ] Create `src/models/PlacementDrive.ts`
- [ ] Define interface `IPlacementDrive` extending Document

### Company Information
- [ ] Add company fields:
  - [ ] `companyId: Types.ObjectId` (required, ref: 'Company')
  - [ ] `jobTitle: string` (required)
  - [ ] `jobDescription: string` (required)
  - [ ] `jobLocation: string`
  - [ ] `ctc: { min: number, max: number }`
  - [ ] `jobType: 'full-time' | 'internship' | 'contract'`

### Eligibility Criteria
- [ ] Add eligibility fields:
  - [ ] `minCGPA: number` (required)
  - [ ] `maxBacklogs: number` (required)
  - [ ] `eligibleBranches: string[]` (required)
  - [ ] `eligibleSemesters: number[]`
  - [ ] `requiredSkills: string[]`

### Schedule Information
- [ ] Add schedule fields:
  - [ ] `registrationDeadline: Date` (required)
  - [ ] `testDate?: Date`
  - [ ] `interviewRounds: { name: string, date: Date, type: string }[]`
  - [ ] `driveDate: Date` (required)

### Status & Results
- [ ] Add status fields:
  - [ ] `isActive: boolean` (default: true)
  - [ ] `status: 'draft' | 'open' | 'closed' | 'completed'`
  - [ ] `registeredStudents: { studentId: Types.ObjectId, registeredAt: Date, status: string }[]`
  - [ ] `results: { studentId: Types.ObjectId, round: string, status: string, feedback?: string }[]`

### Account Association
- [ ] Add `accountId: Types.ObjectId` (required, ref: 'Account')
- [ ] Create index on `accountId + isActive`

## Task 2.6: Training Model

### Create Training Schema
- [ ] Create `src/models/Training.ts`
- [ ] Define interface `ITraining` extending Document

### Training Information
- [ ] Add training fields:
  - [ ] `title: string` (required)
  - [ ] `description: string` (required)
  - [ ] `type: 'internal' | 'external'` (required)
  - [ ] `category: string` (required)
  - [ ] `duration: number` (in hours)

### Schedule Information
- [ ] Add schedule fields:
  - [ ] `startDate: Date` (required)
  - [ ] `endDate: Date` (required)
  - [ ] `schedule: { day: string, time: string }[]`
  - [ ] `venue: string`

### Trainer Information
- [ ] Add trainer fields:
  - [ ] `trainerId: Types.ObjectId` (ref: 'User')
  - [ ] `trainerName: string`
  - [ ] `trainerEmail: string`
  - [ ] `maxParticipants: number`

### Status & Attendance
- [ ] Add status fields:
  - [ ] `isActive: boolean` (default: true)
  - [ ] `status: 'upcoming' | 'ongoing' | 'completed'`
  - [ ] `registeredStudents: { studentId: Types.ObjectId, registeredAt: Date }[]`
  - [ ] `attendance: { studentId: Types.ObjectId, date: Date, present: boolean }[]`

### Assessment & Certification
- [ ] Add assessment fields:
  - [ ] `quizEnabled: boolean` (default: false)
  - [ ] `certificateTemplate: string`
  - [ ] `completionCriteria: string`

### Account Association
- [ ] Add `accountId: Types.ObjectId` (required, ref: 'Account')
- [ ] Create index on `accountId + isActive`

## Task 2.7: Assessment Model

### Create Assessment Schema
- [ ] Create `src/models/Assessment.ts`
- [ ] Define interface `IAssessment` extending Document

### Assessment Information
- [ ] Add assessment fields:
  - [ ] `title: string` (required)
  - [ ] `description: string`
  - [ ] `type: 'aptitude' | 'technical' | 'mock-interview' | 'gd'` (required)
  - [ ] `category: string`

### Schedule Information
- [ ] Add schedule fields:
  - [ ] `date: Date` (required)
  - [ ] `duration: number` (in minutes)
  - [ ] `platform: string`
  - [ ] `venue: string`

### Associated Entities
- [ ] Add association fields:
  - [ ] `driveId?: Types.ObjectId` (ref: 'PlacementDrive')
  - [ ] `trainingId?: Types.ObjectId` (ref: 'Training')
  - [ ] `isStandalone: boolean` (default: true)

### Results & Feedback
- [ ] Add results fields:
  - [ ] `studentScores: { studentId: Types.ObjectId, score: number, maxScore: number, feedback?: string }[]`
  - [ ] `totalParticipants: number`
  - [ ] `averageScore: number`

### Account Association
- [ ] Add `accountId: Types.ObjectId` (required, ref: 'Account')
- [ ] Create index on `accountId + date`

## Task 2.8: Notification Model

### Create Notification Schema
- [ ] Create `src/models/Notification.ts`
- [ ] Define interface `INotification` extending Document

### Notification Information
- [ ] Add notification fields:
  - [ ] `title: string` (required)
  - [ ] `message: string` (required)
  - [ ] `type: 'info' | 'success' | 'warning' | 'error'` (required)
  - [ ] `category: 'drive' | 'training' | 'assessment' | 'general'`

### Recipients
- [ ] Add recipient fields:
  - [ ] `userIds: Types.ObjectId[]` (ref: 'User')
  - [ ] `studentIds: Types.ObjectId[]` (ref: 'Student')
  - [ ] `allStudents: boolean` (default: false)
  - [ ] `allStaff: boolean` (default: false)

### Delivery Status
- [ ] Add delivery fields:
  - [ ] `emailSent: boolean` (default: false)
  - [ ] `smsSent: boolean` (default: false)
  - [ ] `inAppRead: { userId: Types.ObjectId, readAt: Date }[]`
  - [ ] `scheduledFor?: Date`

### Account Association
- [ ] Add `accountId: Types.ObjectId` (required, ref: 'Account')
- [ ] Create index on `accountId + createdAt`

## Task 2.9: Create Model Index

### Create Models Index File
- [ ] Create `src/models/index.ts`
- [ ] Export all models
- [ ] Add model relationships
- [ ] Add model validation utilities

## Success Criteria
- [ ] All models created with proper schemas
- [ ] Relationships defined correctly
- [ ] Validation rules implemented
- [ ] Indexes created for performance
- [ ] TypeScript interfaces defined
- [ ] Models can be imported and used

## Estimated Time: 2-3 days 