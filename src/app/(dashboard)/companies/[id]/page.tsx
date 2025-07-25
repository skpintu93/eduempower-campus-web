"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, Mail, Phone, Globe, MapPin, Calendar, Users, DollarSign, TrendingUp, Edit, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";

interface Company {
  _id: string;
  name: string;
  description: string;
  industry: string;
  website: string;
  logo?: string;
  contact: {
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  status: "pending" | "approved" | "rejected";
  approvalDate?: string;
  approvedBy?: string;
  rejectionReason?: string;
  drivesCount: number;
  totalHires: number;
  averageCTC: number;
  createdAt: string;
  updatedAt: string;
}

interface Drive {
  _id: string;
  title: string;
  description: string;
  date: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  registeredCount: number;
  selectedCount: number;
  averageCTC: number;
  positions: {
    role: string;
    count: number;
    ctc: number;
  }[];
}

interface HiringTrend {
  month: string;
  hires: number;
  averageCTC: number;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [hiringTrends, setHiringTrends] = useState<HiringTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchCompanyDetails();
      fetchCompanyDrives();
      fetchHiringTrends();
    }
  }, [params.id]);

  const fetchCompanyDetails = async () => {
    try {
      const response = await fetch(`/api/companies/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
    }
  };

  const fetchCompanyDrives = async () => {
    try {
      const response = await fetch(`/api/companies/${params.id}/drives`);
      if (response.ok) {
        const data = await response.json();
        setDrives(data);
      }
    } catch (error) {
      console.error("Error fetching company drives:", error);
    }
  };

  const fetchHiringTrends = async () => {
    try {
      const response = await fetch(`/api/companies/${params.id}/hiring-trends`);
      if (response.ok) {
        const data = await response.json();
        setHiringTrends(data);
      }
    } catch (error) {
      console.error("Error fetching hiring trends:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (action: "approve" | "reject") => {
    if (!company) return;

    try {
      const response = await fetch(`/api/companies/${company._id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Refresh company details
        fetchCompanyDetails();
      }
    } catch (error) {
      console.error(`Error ${action}ing company:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getDriveStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "ongoing": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Company not found</h2>
        <p className="text-muted-foreground mt-2">
          The company you're looking for doesn't exist.
        </p>
        <Link href="/companies" className="mt-4 inline-block">
          <Button>Back to Companies</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={company.logo} alt={company.name} />
            <AvatarFallback className="text-lg">
              {company.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-muted-foreground">
              {company.industry} • {company.contact.city}, {company.contact.state}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {company.status === "pending" && (
            <>
              <Button onClick={() => handleApproval("approve")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => handleApproval("reject")}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          <Link href={`/companies/${company._id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-2">
        <Badge className={`flex items-center space-x-1 ${getStatusColor(company.status)}`}>
          {getStatusIcon(company.status)}
          <span className="capitalize">{company.status}</span>
        </Badge>
        {company.status === "approved" && company.approvalDate && (
          <span className="text-sm text-muted-foreground">
            Approved on {formatDate(company.approvalDate)}
          </span>
        )}
        {company.status === "rejected" && company.rejectionReason && (
          <span className="text-sm text-muted-foreground">
            Reason: {company.rejectionReason}
          </span>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drives">Placement Drives ({drives.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Company Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    Detailed information about {company.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{company.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Industry</p>
                        <p className="text-sm text-muted-foreground">{company.industry}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Website</p>
                        <p className="text-sm text-muted-foreground">
                          {company.website ? (
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {company.website}
                            </a>
                          ) : (
                            "Not provided"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>
                    Key performance indicators and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold">{company.drivesCount}</p>
                      <p className="text-sm text-muted-foreground">Total Drives</p>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <Users className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold">{company.totalHires}</p>
                      <p className="text-sm text-muted-foreground">Total Hires</p>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <DollarSign className="h-8 w-8 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(company.averageCTC)}</p>
                      <p className="text-sm text-muted-foreground">Average CTC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-medium">
                      {company.drivesCount > 0 ? Math.round((company.totalHires / company.drivesCount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="font-medium">{formatDate(company.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{formatDate(company.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {drives.slice(0, 3).map((drive) => (
                    <div key={drive._id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{drive.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(drive.date)}</p>
                      </div>
                      <Badge className={getDriveStatusColor(drive.status)}>
                        {drive.status}
                      </Badge>
                    </div>
                  ))}
                  {drives.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="drives" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Placement Drives</CardTitle>
              <CardDescription>
                All placement drives conducted by {company.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drive Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Selected</TableHead>
                    <TableHead>Avg CTC</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drives.map((drive) => (
                    <TableRow key={drive._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{drive.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {drive.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(drive.date)}</TableCell>
                      <TableCell>
                        <Badge className={getDriveStatusColor(drive.status)}>
                          {drive.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{drive.registeredCount}</TableCell>
                      <TableCell>{drive.selectedCount}</TableCell>
                      <TableCell>{formatCurrency(drive.averageCTC)}</TableCell>
                      <TableCell>
                        <Link href={`/drives/${drive._id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {drives.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No drives found</h3>
                  <p className="text-muted-foreground">
                    This company hasn't conducted any placement drives yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hiring Trends</CardTitle>
                <CardDescription>
                  Monthly hiring patterns over the last 12 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hiringTrends.length > 0 ? (
                  <div className="space-y-4">
                    {hiringTrends.map((trend) => (
                      <div key={trend.month} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{trend.month}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-muted-foreground">
                            {trend.hires} hires
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(trend.averageCTC)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hiring data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Drives</span>
                  <span className="font-semibold">{company.drivesCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Hires</span>
                  <span className="font-semibold">{company.totalHires}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-semibold">
                    {company.drivesCount > 0 ? Math.round((company.totalHires / company.drivesCount) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average CTC</span>
                  <span className="font-semibold">{formatCurrency(company.averageCTC)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Complete contact details for {company.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{company.contact.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{company.contact.phone}</p>
                    </div>
                  </div>
                  
                  {company.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Website</p>
                        <p className="text-sm text-muted-foreground">
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {company.website}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {company.contact.address}<br />
                        {company.contact.city}, {company.contact.state} - {company.contact.pincode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 