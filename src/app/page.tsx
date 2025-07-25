"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          // User is authenticated, redirect to dashboard
          router.push("/dashboard");
        } else {
          // User is not authenticated, redirect to login
          router.push("/login");
        }
      } catch (error) {
        // Error occurred, redirect to login
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Show loading while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          EduEmpower Campus
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Loading your dashboard...
        </p>
      </div>
    </div>
  );
}
