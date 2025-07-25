"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb() {
  const pathname = usePathname();

  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];

    // Add home breadcrumb
    breadcrumbs.push({
      name: "Home",
      href: "/dashboard",
      icon: Home,
    });

    // Generate breadcrumbs from path segments
    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip the first segment if it's a route group
      if (index === 0 && (segment === "dashboard" || segment === "public" || segment === "student" || segment === "company")) {
        return;
      }

      // Format segment name
      const name = segment
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        name,
        href: currentPath,
        icon: null,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 py-4">
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;

        return (
          <div key={breadcrumb.href} className="flex items-center">
            {!isFirst && (
              <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
            )}
            
            {isLast ? (
              <span className="font-medium text-gray-900 dark:text-white">
                {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4 inline mr-1" />}
                {breadcrumb.name}
              </span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center"
              >
                {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4 mr-1" />}
                {breadcrumb.name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
} 