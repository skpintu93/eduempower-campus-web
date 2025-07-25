import React from 'react';
import { User } from '@/types/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">EduEmpower Campus</h1>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.name}
                </span>
                <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
                  {user.role}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            © 2024 EduEmpower Campus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 