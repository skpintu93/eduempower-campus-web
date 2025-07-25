import { Types } from 'mongoose';

// User roles matching our database models
export type UserRole = 'admin' | 'tpo' | 'faculty' | 'coordinator';

// Authentication user interface
export interface AuthUser {
  id: string;
  accountId: string;
  email: string;
  name: string;
  role: UserRole;
  profilePic?: string;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  accountId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Register data
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  accountId: string;
  phone?: string;
}

// Authentication response
export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresIn: number;
}

// Password reset request
export interface PasswordResetRequest {
  email: string;
}

// Password reset
export interface PasswordReset {
  token: string;
  password: string;
}

// Authentication state
export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginResponse extends ApiResponse<AuthResponse> {}
export interface RegisterResponse extends ApiResponse<AuthResponse> {}
export interface LogoutResponse extends ApiResponse<{ message: string }> {}

// Error response
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

// Permission types
export type Permission = 
  | 'users:read'
  | 'users:write'
  | 'students:read'
  | 'students:write'
  | 'companies:read'
  | 'companies:write'
  | 'drives:read'
  | 'drives:write'
  | 'trainings:read'
  | 'trainings:write'
  | 'assessments:read'
  | 'assessments:write'
  | 'notifications:read'
  | 'notifications:write'
  | 'reports:read'
  | 'settings:read'
  | 'settings:write'; 