# Next.js SaaS Authentication System Replication Prompt

## Overview
Create a Next.js 15+ SaaS application with multi-tenant authentication architecture, featuring user and account management with JWT-based authentication, Google OAuth integration, and domain-based tenant isolation.

## Core Architecture Requirements

### 1. Project Setup
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with jose library
- **OAuth**: Google Firebase Authentication
- **Form Handling**: React Hook Form with Zod validation

### 2. Directory Structure
```
src/
├── app/
│   ├── (public)/           # Public routes (login, signup)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/        # Protected routes
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       │   ├── route.ts
│   │       │   └── google/
│   │       │       └── route.ts
│   │       ├── register/
│   │       │   └── route.ts
│   │       ├── logout/
│   │       │   └── route.ts
│   │       └── verify-account/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── mongoose.ts         # Database connection
│   ├── edge-jwt.ts         # JWT utilities
│   ├── firebaseAuth.ts     # Firebase config
│   ├── request-helpers.ts  # Request utilities
│   └── auth.tsx           # Auth context
├── models/
│   ├── User.ts
│   ├── Account.ts
│   └── index.ts
├── middleware.ts
└── types/
    └── auth.ts
```

### 3. Database Models

#### User Model (`src/models/User.ts`)
```typescript
interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'admin' | 'staff' | 'customer';
  accountId: Types.ObjectId;
  profilePic?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
```

**Key Features:**
- Password hashing with bcryptjs
- Email validation with regex
- Role-based access control
- Account association
- Password comparison method
- Compound index on accountId + email

#### Account Model (`src/models/Account.ts`)
```typescript
interface IAccount extends Document {
  name: string;
  phone?: string;
  domains: string[];
  settings: {
    theme: string;
    currency: string;
    timezone: string;
    logo: string;
    email: {
      primaryEmail: string;
      noreplyEmail: string;
    };
  };
  address?: {
    pincode: string;
    addressLine: string;
    landmark?: string;
    city: string;
    district: string;
    state: string;
    country: string;
  };
  accountType: string;
  signupType: string;
}
```

### 4. Authentication System

#### JWT Utilities (`src/lib/edge-jwt.ts`)
- Token generation with jose library
- Token verification
- Cookie management (HTTP-only, secure)
- Token payload interface with user and account data

#### API Routes

**Login Route** (`/api/auth/login/route.ts`):
- Email/password validation
- Account verification via domain
- JWT token generation
- HTTP-only cookie setting
- Error handling

**Register Route** (`/api/auth/register/route.ts`):
- User creation with password hashing
- Account association
- JWT token generation
- Role assignment

**Google OAuth Route** (`/api/auth/login/google/route.ts`):
- Firebase token verification
- User lookup/creation
- JWT token generation

### 5. Middleware (`src/middleware.ts`)
**Multi-tenant Domain Resolution:**
- Extract account from domain/subdomain
- Verify account exists
- Add account context to headers
- Protect routes based on authentication

**Key Features:**
- Domain-based tenant isolation
- Public route exclusions
- Authentication verification
- Request header enrichment

### 6. Frontend Components

#### Login Page (`src/app/(public)/login/page.tsx`)
- Email/password form with validation
- Google OAuth integration
- Error handling and loading states
- Responsive design with Tailwind CSS
- Form validation with React Hook Form

#### Signup Page (`src/app/(public)/signup/page.tsx`)
- User registration form
- Password confirmation
- Role selection
- Google OAuth option
- Form validation and error handling

### 7. Environment Configuration
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30d

# Firebase (for Google OAuth)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# App
NEXT_PUBLIC_APP_URL=your_app_url
```

### 8. Dependencies (package.json)
```json
{
  "dependencies": {
    "next": "15.3.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5",
    "mongoose": "^8.14.3",
    "bcryptjs": "^3.0.2",
    "jose": "^6.0.11",
    "firebase": "^11.10.0",
    "react-hook-form": "^7.56.4",
    "@hookform/resolvers": "^5.0.1",
    "zod": "^3.25.48",
    "tailwindcss": "^4",
    "@heroicons/react": "^2.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1"
  }
}
```

### 9. Key Implementation Details

#### Multi-tenant Architecture
- Domain-based account resolution
- Account context in all requests
- Isolated data access per account
- Shared authentication across tenants

#### Security Features
- HTTP-only JWT cookies
- Password hashing with bcrypt
- Input validation and sanitization
- CSRF protection via SameSite cookies
- Secure headers in production

#### Authentication Flow
1. User visits domain → middleware resolves account
2. Login/signup → account context added to request
3. JWT token generated with user + account data
4. Token stored in HTTP-only cookie
5. Subsequent requests include account context

#### Error Handling
- Consistent error responses
- Proper HTTP status codes
- User-friendly error messages
- Logging for debugging

### 10. Development Guidelines

#### Code Standards
- TypeScript for type safety
- ESLint + Prettier for code formatting
- Conventional commit messages
- Component-based architecture
- Proper error boundaries

#### Testing Strategy
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for authentication flows
- Mock external dependencies

#### Performance Optimization
- Code splitting with Next.js
- Image optimization
- Database indexing
- Caching strategies

### 11. Deployment Considerations
- Environment variable management
- Database connection pooling
- SSL/TLS configuration
- Monitoring and logging
- Backup strategies

## Implementation Steps

### Phase 1: Project Setup
1. Create Next.js 15+ project with TypeScript
2. Install required dependencies
3. Configure Tailwind CSS
4. Set up ESLint and Prettier
5. Configure environment variables

### Phase 2: Database Setup
1. Set up MongoDB connection
2. Create User and Account models
3. Implement database utilities
4. Set up indexes and validation

### Phase 3: Authentication System
1. Implement JWT utilities
2. Create authentication API routes
3. Set up Firebase configuration
4. Implement Google OAuth

### Phase 4: Frontend Components
1. Create login page
2. Create signup page
3. Implement form validation
4. Add loading states and error handling

### Phase 5: Middleware & Security
1. Implement multi-tenant middleware
2. Add route protection
3. Configure security headers
4. Test authentication flow

### Phase 6: Testing & Deployment
1. Write unit and integration tests
2. Configure production environment
3. Set up monitoring and logging
4. Deploy to production

## Security Checklist

- [ ] JWT tokens stored in HTTP-only cookies
- [ ] Password hashing with bcrypt
- [ ] Input validation and sanitization
- [ ] CSRF protection
- [ ] Rate limiting on auth endpoints
- [ ] Secure headers configuration
- [ ] Environment variable protection
- [ ] Database connection security
- [ ] Error message sanitization
- [ ] Session management

## Performance Checklist

- [ ] Database indexing
- [ ] Code splitting
- [ ] Image optimization
- [ ] Caching strategies
- [ ] Bundle size optimization
- [ ] Database connection pooling
- [ ] CDN configuration
- [ ] Monitoring setup

This architecture provides a solid foundation for a multi-tenant SaaS application with secure authentication, scalable user management, and clean separation of concerns. The modular design allows for easy extension and maintenance.
