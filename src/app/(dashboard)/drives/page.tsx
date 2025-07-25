"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Users,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  Edit,
  MoreHorizontal
} from "lucide-react";

interface PlacementDrive {
  id: string;
  title: string;
  company: {
    name: string;
    logo?: string;
    industry: string;
  };
  date: string;
  location: string;
  ctc: {
    min: number;
    max: number;
  };
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  registeredCount: number;
  maxCapacity: number;
  eligibility: {
    branches: string[];
    minCGPA: number;
    backlogLimit: number;
  };
  description: string;
}

export default function DrivesPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [filteredDrives, setFilteredDrives] = useState<PlacementDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchDrives();
  }, []);

  useEffect(() => {
    filterDrives();
  }, [drives, searchTerm, statusFilter, companyFilter, dateFilter]);

  const fetchDrives = async () => {
    try {
      const response = await fetch("/api/drives");
      if (response.ok) {
        const data = await response.json();
        setDrives(data.drives || []);
      }
    } catch (error) {
      console.error("Failed to fetch drives:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDrives = () => {
    let filtered = drives;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(drive =>
        drive.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drive.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drive.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(drive => drive.status === statusFilter);
    }

    // Company filter
    if (companyFilter) {
      filtered = filtered.filter(drive => drive.company.name === companyFilter);
    }

    // Date filter
    if (dateFilter) {
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          filtered = filtered.filter(drive => {
            const driveDate = new Date(drive.date);
            return driveDate.toDateString() === today.toDateString();
          });
          break;
        case "week":
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(drive => {
            const driveDate = new Date(drive.date);
            return driveDate >= today && driveDate <= weekFromNow;
          });
          break;
        case "month":
          const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(drive => {
            const driveDate = new Date(drive.date);
            return driveDate >= today && driveDate <= monthFromNow;
          });
          break;
      }
    }

    setFilteredDrives(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Upcoming</Badge>;
      case "ongoing":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Ongoing</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRegistrationProgress = (registered: number, max: number) => {
    const percentage = (registered / max) * 100;
    return Math.min(percentage, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Placement Drives
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track placement drives
          </p>
        </div>
        <Button asChild>
          <Link href="/drives/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Drive
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drives</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drives.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {drives.filter(d => d.status === "upcoming").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {drives.filter(d => d.status === "ongoing").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {drives.filter(d => d.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter placement drives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search drives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Companies</SelectItem>
                {Array.from(new Set(drives.map(d => d.company.name))).map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
              setCompanyFilter("");
              setDateFilter("");
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrives.map((drive) => (
          <Card key={drive.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {drive.company.logo ? (
                    <img 
                      src={drive.company.logo} 
                      alt={drive.company.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{drive.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {drive.company.name} • {drive.company.industry}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/drives/${drive.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/drives/${drive.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(drive.status)}
                <div className="text-sm text-gray-500">
                  {formatDate(drive.date)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{drive.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>₹{drive.ctc.min.toLocaleString()} - ₹{drive.ctc.max.toLocaleString()} LPA</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Registrations</span>
                  <span className="font-medium">{drive.registeredCount}/{drive.maxCapacity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getRegistrationProgress(drive.registeredCount, drive.maxCapacity)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Eligibility: CGPA ≥ {drive.eligibility.minCGPA}</div>
                  <div>Branches: {drive.eligibility.branches.join(", ")}</div>
                  <div>Max Backlogs: {drive.eligibility.backlogLimit}</div>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/drives/${drive.id}`}>
                    View Details
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/drives/${drive.id}/results`}>
                    Results
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDrives.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No drives found</h3>
            <p className="mt-2 text-gray-500">
              {drives.length === 0 
                ? "No placement drives have been created yet." 
                : "No drives match your current filters."}
            </p>
            {drives.length === 0 && (
              <Button asChild className="mt-4">
                <Link href="/drives/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Drive
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 