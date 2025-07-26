# Account Registration API Documentation

## Endpoint
`POST /api/auth/account/register`

## Description
This public API endpoint allows new institutions to register for the EduEmpower platform. It creates both an Account and a User with admin role in a single transaction. The API uses Zod for robust payload validation.

## Request Body
```json
{
  "userName": "string",
  "email": "string", 
  "instituteName": "string",
  "password": "string"
}
```

### Field Descriptions
- **userName** (required): The name of the user who will be the admin
- **email** (required): Email address for the admin user (must be unique across all accounts)
- **instituteName** (required): Name of the educational institution
- **password** (required): Password for the admin user (must meet security requirements)

### Validation Rules (Zod Schema)
- **userName**: 2-100 characters, trimmed
- **email**: Valid email format, converted to lowercase, trimmed, must be unique
- **instituteName**: 2-100 characters, trimmed
- **password**: Minimum 8 characters, must contain uppercase, lowercase, number, and special character

## Response

### Success Response (201)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "accountId": "string",
      "email": "string",
      "name": "string",
      "role": "admin",
      "profilePic": "string",
      "isActive": true,
      "emailVerified": false,
      "phoneVerified": false
    },
    "token": "string",
    "expiresIn": 604800
  },
  "message": "Account and user created successfully"
}
```

### Error Responses

#### 400 - Bad Request (Validation Error)
```json
{
  "success": false,
  "error": "Validation failed: userName: User name must be at least 2 characters, email: Please enter a valid email address, password: Password must be at least 8 characters long",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123"
}
```

#### 409 - Conflict
```json
{
  "success": false,
  "error": "User with this email already exists",
  "code": "USER_EXISTS",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123"
}
```

#### 429 - Too Many Requests
```json
{
  "success": false,
  "error": "Too many signup attempts. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123"
}
```

## Features

### Account Creation
- Creates a new Account with default settings
- Generates a unique domain based on institute name
- Sets default values for required fields (can be updated later)
- Account type defaults to 'college'
- Signup type defaults to 'free'

### User Creation
- Creates a User with admin role
- Password is automatically hashed using bcrypt
- User is linked to the created account
- Email verification status is set to false

### Security Features
- Rate limiting: 2 attempts per hour per IP
- Zod schema validation for all input fields
- Password validation with strong requirements
- Email uniqueness check across all accounts
- JWT token generation for immediate authentication
- HTTP-only cookie set for session management

### Default Account Settings
- Theme: light
- Currency: INR
- Timezone: Asia/Kolkata
- Country: India
- Year established: Current year
- Total students: 100
- Departments: ['General']

## Example Usage

### cURL
```bash
curl -X POST http://localhost:3000/api/auth/account/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "John Doe",
    "email": "john@example.com",
    "instituteName": "Example University",
    "password": "SecurePass123!"
  }'
```

### JavaScript/Fetch
```javascript
const response = await fetch('/api/auth/account/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userName: 'John Doe',
    email: 'john@example.com',
    instituteName: 'Example University',
    password: 'SecurePass123!'
  })
});

const data = await response.json();
```

## Notes
- This is a public endpoint that doesn't require authentication
- The created user automatically gets admin role
- The account and user are created in a single transaction
- If any part fails, the entire operation is rolled back
- The API returns a JWT token for immediate authentication
- Users should update their account details after initial signup
- All input validation is handled by Zod schema
- Email addresses are automatically converted to lowercase
- All string fields are automatically trimmed 