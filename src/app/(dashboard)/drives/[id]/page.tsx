"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Users,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  GraduationCap,
  Award,
  FileText,
  Mail,
  Phone,
  Globe,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface PlacementDrive {
  id: string;
  title: string;
  company: {
    id: string;
    name: string;
    logo?: string;
    industry: string;
    website: string;
    email: string;
    phone: string;
    address: string;
    description: string;
  };
  date: string;
  time: string;
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
    skills: string[];
  };
  description: string;
  registeredStudents: RegisteredStudent[];
  results: DriveResult[];
}

interface RegisteredStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rollNumber: string;
  branch: string;
  cgpa: number;
  registrationDate: string;
  status: "registered" | "shortlisted" | "selected" | "rejected";
}

interface DriveResult {
  studentId: string;
  studentName: string;
  rollNumber: string;
  round1Score?: number;
  round2Score?: number;
  round3Score?: number;
  finalStatus: "selected" | "rejected" | "pending";
  ctc?: number;
  feedback?: string;
}

export default function DriveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [drive, setDrive] = useState<PlacementDrive | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (params.id) {
      fetchDrive(params.id as string);
    }
  }, [params.id]);

  const fetchDrive = async (id: string) => {
    try {
      const response = await fetch(`/api/drives/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDrive(data.drive);
      } else {
        router.push("/drives");
      }
    } catch (error) {
      console.error("Failed to fetch drive:", error);
      router.push("/drives");
    } finally {
      setIsLoading(false);
    }
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

  const getStudentStatusBadge = (status: string) => {
    switch (status) {
      case "selected":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Selected</Badge>;
      case "shortlisted":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Shortlisted</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Rejected</Badge>;
      case "registered":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Registered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getResultStatusBadge = (status: string) => {
    switch (status) {
      case "selected":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Selected</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Rejected</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRegistrationProgress = (registered: number, max: number) => {
    const percentage = (registered / max) * 100;
    return Math.min(percentage, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Drive not found</p>
        <Button asChild className="mt-4">
          <Link href="/drives">Back to Drives</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/drives">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {drive.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Placement Drive • {drive.company.name}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link href={`/drives/${drive.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Drive Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                {drive.company.logo ? (
                  <img 
                    src={drive.company.logo} 
                    alt={drive.company.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <CardTitle>{drive.title}</CardTitle>
                  <CardDescription>
                    {drive.company.name} • {drive.company.industry}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(drive.status)}
                <div className="text-sm text-gray-500">
                  {formatDate(drive.date)} at {drive.time}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{drive.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>₹{drive.ctc.min.toLocaleString()} - ₹{drive.ctc.max.toLocaleString()} LPA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{drive.registeredCount} / {drive.maxCapacity} registered</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Registration Progress</span>
                  <span className="font-medium">{getRegistrationProgress(drive.registeredCount, drive.maxCapacity).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getRegistrationProgress(drive.registeredCount, drive.maxCapacity)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">{drive.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>Eligibility Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Minimum CGPA: <strong>{drive.eligibility.minCGPA}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Max Backlogs: <strong>{drive.eligibility.backlogLimit}</strong></span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Eligible Branches:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {drive.eligibility.branches.map((branch, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {branch}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Required Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {drive.eligibility.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{drive.company.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <a href={drive.company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  {drive.company.website}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{drive.company.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{drive.company.phone}</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-sm">{drive.company.address}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/drives/${drive.id}/eligible-students`}>
                  <Users className="h-4 w-4 mr-2" />
                  View Eligible Students
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/drives/${drive.id}/results`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Results
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Registered Students</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Drive Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Registrations</span>
                    <span className="font-semibold">{drive.registeredCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shortlisted</span>
                    <span className="font-semibold text-blue-600">
                      {drive.registeredStudents.filter(s => s.status === "shortlisted").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected</span>
                    <span className="font-semibold text-green-600">
                      {drive.registeredStudents.filter(s => s.status === "selected").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rejected</span>
                    <span className="font-semibold text-red-600">
                      {drive.registeredStudents.filter(s => s.status === "rejected").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Drive created 3 days ago</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Registration opened</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">50 students registered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registered Students</CardTitle>
                  <CardDescription>
                    {drive.registeredStudents.length} students have registered for this drive
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export List
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>CGPA</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drive.registeredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>{student.branch}</TableCell>
                      <TableCell>{student.cgpa.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(student.registrationDate)}</TableCell>
                      <TableCell>{getStudentStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/students/${student.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Drive Results</CardTitle>
                  <CardDescription>
                    Manage and view placement results
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Round 1</TableHead>
                    <TableHead>Round 2</TableHead>
                    <TableHead>Round 3</TableHead>
                    <TableHead>Final Status</TableHead>
                    <TableHead>CTC (LPA)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drive.results.map((result) => (
                    <TableRow key={result.studentId}>
                      <TableCell className="font-medium">{result.studentName}</TableCell>
                      <TableCell>{result.rollNumber}</TableCell>
                      <TableCell>{result.round1Score || "N/A"}</TableCell>
                      <TableCell>{result.round2Score || "N/A"}</TableCell>
                      <TableCell>{result.round3Score || "N/A"}</TableCell>
                      <TableCell>{getResultStatusBadge(result.finalStatus)}</TableCell>
                      <TableCell>{result.ctc ? `₹${result.ctc.toLocaleString()}` : "N/A"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 