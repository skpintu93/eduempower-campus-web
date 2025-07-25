'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, AuthState, LoginCredentials, RegisterData, AuthResponse } from '@/types/auth';

// Authentication context interface
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Initialize authentication state
  useEffect(() => {
    refreshUser();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success && data.data) {
        setUser(data.data.user);
        return true;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Registration failed');
      }

      if (responseData.success && responseData.data) {
        setUser(responseData.data.user);
        return true;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Even if logout fails, clear local state
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/verify-account', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Refresh user error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has specific role(s)
  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // This would need to be implemented based on your permission system
    // For now, we'll use role-based permissions
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'], // Admin has all permissions
      tpo: ['students:read', 'students:write', 'companies:read', 'companies:write', 'drives:read', 'drives:write'],
      faculty: ['students:read', 'trainings:read', 'trainings:write', 'assessments:read', 'assessments:write'],
      coordinator: ['students:read', 'trainings:read', 'assessments:read'],
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use authentication context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for role-based access control
export function useRole(roles: string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return roles.includes(user.role);
}

// Hook for permission-based access control
export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

// Hook for authentication status
export function useAuthStatus() {
  const { isAuthenticated, loading } = useAuth();
  return { isAuthenticated, loading };
} 