# Phase 9: Company Portal

## Overview
Creating a comprehensive company portal where recruiters can register, post job openings, view candidate profiles, manage drives, and provide feedback.

## Task 9.1: Company Authentication

### Company Registration
- [ ] Create `src/app/(company)/register/page.tsx`
- [ ] Design company registration form
- [ ] Add company information fields
- [ ] Include contact person details
- [ ] Add industry selection
- [ ] Include terms acceptance
- [ ] Create approval workflow

### Company Login
- [ ] Create `src/app/(company)/login/page.tsx`
- [ ] Implement company login form
- [ ] Add email/password authentication
- [ ] Include "Remember me" functionality
- [ ] Add forgot password flow
- [ ] Create responsive design

### Approval Status Page
- [ ] Create `src/app/(company)/approval-status/page.tsx`
- [ ] Display approval status
- [ ] Show pending information
- [ ] Include approval timeline
- [ ] Add contact TPO option
- [ ] Show next steps

### Password Management
- [ ] Create `src/app/(company)/reset-password/page.tsx`
- [ ] Add email verification
- [ ] Implement password reset
- [ ] Include security questions
- [ ] Add success confirmation
- [ ] Support multiple methods

## Task 9.2: Company Dashboard

### Main Dashboard
- [ ] Create `src/app/(company)/dashboard/page.tsx`
- [ ] Design company dashboard layout
- [ ] Add key metrics cards
- [ ] Include recent activities
- [ ] Show upcoming drives
- [ ] Add quick actions

### Dashboard Layout
- [ ] Create `src/app/(company)/layout.tsx`
- [ ] Implement company navigation
- [ ] Add company header
- [ ] Include notification bell
- [ ] Add profile dropdown
- [ ] Create responsive design

### Company Navigation
- [ ] Create `src/components/company/navigation.tsx`
- [ ] Add dashboard menu items
- [ ] Include active state styling
- [ ] Add mobile navigation
- [ ] Include company profile section
- [ ] Support collapsible menu

### Quick Actions
- [ ] Create `src/components/company/quick-actions.tsx`
- [ ] Add create drive
- [ ] Include view applications
- [ ] Add schedule interview
- [ ] Show pending approvals
- [ ] Include notifications

## Task 9.3: Company Profile Management

### Company Profile Page
- [ ] Create `src/app/(company)/profile/page.tsx`
- [ ] Display company information
- [ ] Add edit functionality
- [ ] Include company logo
- [ ] Show contact details
- [ ] Add company description

### Profile Editor
- [ ] Create `src/components/company/profile-editor.tsx`
- [ ] Add company details form
- [ ] Include logo upload
- [ ] Add contact information
- [ ] Include industry selection
- [ ] Support profile preview

### Contact Management
- [ ] Create `src/components/company/contact-manager.tsx`
- [ ] Add primary contact
- [ ] Include secondary contacts
- [ ] Add contact roles
- [ ] Include contact verification
- [ ] Support multiple contacts

### Company Settings
- [ ] Create `src/app/(company)/settings/page.tsx`
- [ ] Display account settings
- [ ] Add profile management
- [ ] Include password change
- [ ] Add notification preferences
- [ ] Show privacy settings

## Task 9.4: Drive Management

### My Drives Page
- [ ] Create `src/app/(company)/drives/page.tsx`
- [ ] Display company drives
- [ ] Add status filtering
- [ ] Include search functionality
- [ ] Show drive statistics
- [ ] Add create drive button

### Create Drive Page
- [ ] Create `src/app/(company)/drives/new/page.tsx`
- [ ] Design drive creation form
- [ ] Add job details
- [ ] Include eligibility criteria
- [ ] Add schedule configuration
- [ ] Create preview step

### Drive Details Page
- [ ] Create `src/app/(company)/drives/[id]/page.tsx`
- [ ] Show drive information
- [ ] Display registered students
- [ ] Include eligibility criteria
- [ ] Add edit functionality
- [ ] Show drive statistics

### Drive Form Component
- [ ] Create `src/components/company/drive-form.tsx`
- [ ] Add job information
- [ ] Include eligibility setup
- [ ] Add schedule configuration
- [ ] Include preview functionality
- [ ] Support form validation

## Task 9.5: Candidate Management

### Candidate List Page
- [ ] Create `src/app/(company)/candidates/page.tsx`
- [ ] Display candidate list
- [ ] Add filtering options
- [ ] Include search functionality
- [ ] Show candidate status
- [ ] Add bulk actions

### Candidate Search
- [ ] Create `src/components/company/candidate-search.tsx`
- [ ] Add skill-based search
- [ ] Include academic filters
- [ ] Add experience filters
- [ ] Include location search
- [ ] Support advanced search

### Candidate Profile Page
- [ ] Create `src/app/(company)/candidates/[id]/page.tsx`
- [ ] Display candidate profile
- [ ] Show academic information
- [ ] Include skills assessment
- [ ] Add resume download
- [ ] Show interview history

### Candidate Shortlisting
- [ ] Create `src/components/company/candidate-shortlisting.tsx`
- [ ] Add shortlist candidates
- [ ] Include rejection reasons
- [ ] Add feedback notes
- [ ] Include bulk actions
- [ ] Support status updates

## Task 9.6: Application Management

### Applications Page
- [ ] Create `src/app/(company)/applications/page.tsx`
- [ ] Display all applications
- [ ] Add status filtering
- [ ] Include search functionality
- [ ] Show application timeline
- [ ] Add bulk actions

### Application Details Page
- [ ] Create `src/app/(company)/applications/[id]/page.tsx`
- [ ] Show application details
- [ ] Display candidate profile
- [ ] Include resume review
- [ ] Add application status
- [ ] Show interview schedule

### Application Review
- [ ] Create `src/components/company/application-review.tsx`
- [ ] Add application evaluation
- [ ] Include feedback forms
- [ ] Add status updates
- [ ] Include interview scheduling
- [ ] Support bulk review

### Interview Management
- [ ] Create `src/components/company/interview-manager.tsx`
- [ ] Add interview scheduling
- [ ] Include interview rounds
- [ ] Add interviewer assignment
- [ ] Include feedback collection
- [ ] Support calendar integration

## Task 9.7: Interview Management

### Interview Schedule Page
- [ ] Create `src/app/(company)/interviews/page.tsx`
- [ ] Display interview schedule
- [ ] Add date filtering
- [ ] Include status filtering
- [ ] Show interview details
- [ ] Add schedule interview

### Interview Details Page
- [ ] Create `src/app/(company)/interviews/[id]/page.tsx`
- [ ] Show interview information
- [ ] Display candidate details
- [ ] Include interview feedback
- [ ] Add result entry
- [ ] Show interview history

### Interview Scheduling
- [ ] Create `src/components/company/interview-scheduler.tsx`
- [ ] Add interview slots
- [ ] Include interviewer assignment
- [ ] Add location/venue
- [ ] Include interview type
- [ ] Support calendar sync

### Interview Feedback
- [ ] Create `src/components/company/interview-feedback.tsx`
- [ ] Add feedback forms
- [ ] Include rating system
- [ ] Add comments section
- [ ] Include result entry
- [ ] Support bulk feedback

## Task 9.8: Results & Offers

### Results Management Page
- [ ] Create `src/app/(company)/results/page.tsx`
- [ ] Display interview results
- [ ] Add result entry
- [ ] Include offer management
- [ ] Show result statistics
- [ ] Add export functionality

### Offer Management
- [ ] Create `src/components/company/offer-manager.tsx`
- [ ] Add offer creation
- [ ] Include offer details
- [ ] Add offer tracking
- [ ] Include offer acceptance
- [ ] Support offer modifications

### Result Entry
- [ ] Create `src/components/company/result-entry.tsx`
- [ ] Add result forms
- [ ] Include score entry
- [ ] Add feedback entry
- [ ] Include status updates
- [ ] Support bulk entry

### Offer Letter Generation
- [ ] Create `src/components/company/offer-letter-generator.tsx`
- [ ] Add offer templates
- [ ] Include dynamic content
- [ ] Add company branding
- [ ] Include terms and conditions
- [ ] Support PDF generation

## Task 9.9: Analytics & Reports

### Company Analytics Page
- [ ] Create `src/app/(company)/analytics/page.tsx`
- [ ] Display company analytics
- [ ] Show drive statistics
- [ ] Include candidate metrics
- [ ] Add hiring trends
- [ ] Show performance data

### Drive Analytics
- [ ] Create `src/components/company/drive-analytics.tsx`
- [ ] Show application rates
- [ ] Include conversion rates
- [ ] Add candidate quality metrics
- [ ] Include cost analysis
- [ ] Show ROI calculations

### Candidate Analytics
- [ ] Create `src/components/company/candidate-analytics.tsx`
- [ ] Show candidate sources
- [ ] Include skill analysis
- [ ] Add performance trends
- [ ] Include retention data
- [ ] Show benchmarking

### Report Generation
- [ ] Create `src/components/company/report-generator.tsx`
- [ ] Add custom reports
- [ ] Include report templates
- [ ] Add export options
- [ ] Include scheduled reports
- [ ] Support data visualization

## Task 9.10: Communication & Notifications

### Company Notifications Page
- [ ] Create `src/app/(company)/notifications/page.tsx`
- [ ] Display company notifications
- [ ] Add filtering options
- [ ] Include mark as read
- [ ] Add notification preferences
- [ ] Show notification history

### TPO Communication
- [ ] Create `src/app/(company)/messages/page.tsx`
- [ ] Display TPO messages
- [ ] Add message composition
- [ ] Include message threads
- [ ] Add file attachments
- [ ] Show message history

### Announcement Management
- [ ] Create `src/components/company/announcement-manager.tsx`
- [ ] Add announcement creation
- [ ] Include announcement scheduling
- [ ] Add target audience
- [ ] Include delivery tracking
- [ ] Support announcement templates

### Feedback System
- [ ] Create `src/components/company/feedback-system.tsx`
- [ ] Add feedback forms
- [ ] Include rating system
- [ ] Add feedback categories
- [ ] Include feedback analysis
- [ ] Support feedback reporting

## Task 9.11: Settings & Preferences

### Company Settings Page
- [ ] Create `src/app/(company)/settings/page.tsx`
- [ ] Display company settings
- [ ] Add profile management
- [ ] Include password change
- [ ] Add notification preferences
- [ ] Show privacy settings

### Notification Preferences
- [ ] Create `src/components/company/notification-preferences.tsx`
- [ ] Add email preferences
- [ ] Include SMS preferences
- [ ] Add in-app preferences
- [ ] Include category preferences
- [ ] Support frequency settings

### Account Security
- [ ] Create `src/components/company/account-security.tsx`
- [ ] Add two-factor authentication
- [ ] Include login history
- [ ] Add device management
- [ ] Include security questions
- [ ] Show security settings

### Data Export
- [ ] Create `src/components/company/data-export.tsx`
- [ ] Add data export options
- [ ] Include export formats
- [ ] Add export scheduling
- [ ] Include data privacy
- [ ] Support GDPR compliance

## Success Criteria
- [ ] Company authentication working
- [ ] Dashboard functional
- [ ] Profile management complete
- [ ] Drive management operational
- [ ] Candidate management working
- [ ] Application system functional
- [ ] Interview management working
- [ ] Results system operational
- [ ] Analytics working
- [ ] Communication system functional
- [ ] Settings operational

## Estimated Time: 3-4 days 