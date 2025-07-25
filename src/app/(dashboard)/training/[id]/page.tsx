"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Users, Award, Mail, Phone, Building, Edit, Download } from "lucide-react";
import Link from "next/link";

interface Training {
  _id: string;
  title: string;
  description: string;
  type: "technical" | "soft-skills" | "interview-prep" | "certification";
  trainer: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    bio?: string;
  };
  schedule: {
    startDate: string;
    endDate: string;
    time: string;
    days: string[];
  };
  location: string;
  capacity: number;
  registeredCount: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  price?: number;
  certificate: boolean;
  certificateTemplate?: string;
  requirements?: string[];
  objectives?: string[];
  materials?: string[];
  createdAt: string;
}

interface RegisteredStudent {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    year: number;
  };
  registrationDate: string;
  attendance: number;
  status: "registered" | "attending" | "completed" | "dropped";
  certificateIssued?: boolean;
  certificateDate?: string;
}

export default function TrainingDetailPage() {
  const params = useParams();
  const [training, setTraining] = useState<Training | null>(null);
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchTrainingDetails();
      fetchRegisteredStudents();
    }
  }, [params.id]);

  const fetchTrainingDetails = async () => {
    try {
      const response = await fetch(`/api/training/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTraining(data);
      }
    } catch (error) {
      console.error("Error fetching training details:", error);
    }
  };

  const fetchRegisteredStudents = async () => {
    try {
      const response = await fetch(`/api/training/${params.id}/students`);
      if (response.ok) {
        const data = await response.json();
        setRegisteredStudents(data);
      }
    } catch (error) {
      console.error("Error fetching registered students:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "technical": return "bg-blue-100 text-blue-800";
      case "soft-skills": return "bg-green-100 text-green-800";
      case "interview-prep": return "bg-purple-100 text-purple-800";
      case "certification": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "ongoing": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStudentStatusColor = (status: string) => {
    switch (status) {
      case "registered": return "bg-blue-100 text-blue-800";
      case "attending": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "dropped": return "bg-red-100 text-red-800";
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

  const formatTime = (timeString: string) => {
    return timeString;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Training not found</h2>
        <p className="text-muted-foreground mt-2">
          The training program you're looking for doesn't exist.
        </p>
        <Link href="/training" className="mt-4 inline-block">
          <Button>Back to Trainings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{training.title}</h1>
          <p className="text-muted-foreground">
            Training program details and management
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/training/${training._id}/attendance`}>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Attendance
            </Button>
          </Link>
          <Link href={`/training/${training._id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Registered Students ({registeredStudents.length})</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Program Information</CardTitle>
                      <CardDescription>
                        Comprehensive details about the training program
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getTypeColor(training.type)}>
                        {training.type.replace("-", " ")}
                      </Badge>
                      <Badge className={getStatusColor(training.status)}>
                        {training.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{training.description}</p>
                  </div>
                  
                  {training.objectives && training.objectives.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Learning Objectives</h4>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {training.objectives.map((objective, index) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {training.requirements && training.requirements.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Prerequisites</h4>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {training.requirements.map((requirement, index) => (
                          <li key={index}>{requirement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Schedule & Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(training.schedule.startDate)} - {formatDate(training.schedule.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(training.schedule.time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{training.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Capacity</p>
                        <p className="text-sm text-muted-foreground">
                          {training.registeredCount}/{training.capacity} registered
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {training.schedule.days && training.schedule.days.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Days of the Week</p>
                      <div className="flex flex-wrap gap-2">
                        {training.schedule.days.map((day, index) => (
                          <Badge key={index} variant="outline">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trainer Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trainer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {training.trainer.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{training.trainer.name}</p>
                      {training.trainer.company && (
                        <p className="text-sm text-muted-foreground">{training.trainer.company}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{training.trainer.email}</span>
                    </div>
                    {training.trainer.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{training.trainer.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {training.trainer.bio && (
                    <div>
                      <p className="font-medium mb-1">Bio</p>
                      <p className="text-sm text-muted-foreground">{training.trainer.bio}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certificate Info */}
              {training.certificate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>Certificate</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      This program includes a certificate upon completion.
                    </p>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Pricing */}
              {training.price && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">₹{training.price}</p>
                    <p className="text-sm text-muted-foreground">per student</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Students</CardTitle>
              <CardDescription>
                {registeredStudents.length} students registered for this program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredStudents.map((registration) => (
                    <TableRow key={registration._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {registration.student.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{registration.student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {registration.student.rollNumber}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{registration.student.department}</p>
                          <p className="text-sm text-muted-foreground">
                            Year {registration.student.year}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(registration.registrationDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{registration.attendance}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${registration.attendance}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStudentStatusColor(registration.status)}>
                          {registration.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {registration.certificateIssued ? (
                          <div className="text-sm text-muted-foreground">
                            Issued on {registration.certificateDate && formatDate(registration.certificateDate)}
                          </div>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {registeredStudents.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No students registered</h3>
                  <p className="text-muted-foreground">
                    Students will appear here once they register for this training program.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Schedule</CardTitle>
              <CardDescription>
                Complete schedule and timeline for the training program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Program Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(training.schedule.startDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">End Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(training.schedule.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Daily Schedule</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Time:</span>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(training.schedule.time)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Location:</span>
                      <span className="text-sm text-muted-foreground">
                        {training.location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Days:</span>
                      <span className="text-sm text-muted-foreground">
                        {training.schedule.days.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Materials</CardTitle>
              <CardDescription>
                Resources and materials for the training program
              </CardDescription>
            </CardHeader>
            <CardContent>
              {training.materials && training.materials.length > 0 ? (
                <div className="space-y-4">
                  {training.materials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Download className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Material {index + 1}</p>
                          <p className="text-sm text-muted-foreground">{material}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No materials uploaded</h3>
                  <p className="text-muted-foreground">
                    Training materials will be available here once uploaded.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 