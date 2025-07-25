"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Target, Calendar, Clock, Users, BarChart3, Edit, Download, CheckCircle, XCircle, Clock as ClockIcon } from "lucide-react";
import Link from "next/link";

interface Assessment {
  _id: string;
  title: string;
  description: string;
  type: "aptitude" | "technical" | "personality" | "coding" | "interview";
  associatedWith?: {
    type: "training" | "drive";
    id: string;
    name: string;
  };
  schedule: {
    startDate: string;
    endDate: string;
    duration: number; // in minutes
  };
  totalQuestions: number;
  maxScore: number;
  participantCount: number;
  averageScore?: number;
  status: "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  instructions?: string;
  passingScore?: number;
}

interface Participant {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    year: number;
  };
  score?: number;
  maxScore: number;
  percentage?: number;
  status: "registered" | "started" | "completed" | "not-attempted";
  startTime?: string;
  endTime?: string;
  duration?: number; // in minutes
  answers?: any[];
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export default function AssessmentDetailPage() {
  const params = useParams();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchAssessmentDetails();
      fetchParticipants();
      fetchScoreDistribution();
    }
  }, [params.id]);

  const fetchAssessmentDetails = async () => {
    try {
      const response = await fetch(`/api/assessments/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAssessment(data);
      }
    } catch (error) {
      console.error("Error fetching assessment details:", error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/assessments/${params.id}/participants`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      }
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const fetchScoreDistribution = async () => {
    try {
      const response = await fetch(`/api/assessments/${params.id}/score-distribution`);
      if (response.ok) {
        const data = await response.json();
        setScoreDistribution(data);
      }
    } catch (error) {
      console.error("Error fetching score distribution:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "aptitude": return "bg-blue-100 text-blue-800";
      case "technical": return "bg-green-100 text-green-800";
      case "personality": return "bg-purple-100 text-purple-800";
      case "coding": return "bg-orange-100 text-orange-800";
      case "interview": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "ongoing": return "bg-green-100 text-green-800";
      case "completed": return "bg-purple-100 text-purple-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case "registered": return "bg-blue-100 text-blue-800";
      case "started": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "not-attempted": return "bg-red-100 text-red-800";
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const exportResults = () => {
    if (!assessment) return;

    const csvData = [
      ["Roll Number", "Name", "Department", "Score", "Max Score", "Percentage", "Status", "Duration"],
      ...participants.map(p => [
        p.student.rollNumber,
        p.student.name,
        p.student.department,
        p.score || "N/A",
        p.maxScore,
        p.percentage ? `${p.percentage}%` : "N/A",
        p.status,
        p.duration ? formatDuration(p.duration) : "N/A"
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assessment.title}_results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Assessment not found</h2>
        <p className="text-muted-foreground mt-2">
          The assessment you're looking for doesn't exist.
        </p>
        <Link href="/assessments" className="mt-4 inline-block">
          <Button>Back to Assessments</Button>
        </Link>
      </div>
    );
  }

  const completedParticipants = participants.filter(p => p.status === "completed");
  const averageScore = completedParticipants.length > 0 
    ? completedParticipants.reduce((sum, p) => sum + (p.score || 0), 0) / completedParticipants.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{assessment.title}</h1>
          <p className="text-muted-foreground">
            Assessment details and results
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportResults}>
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
          <Link href={`/assessments/${assessment._id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-2">
        <Badge className={getStatusColor(assessment.status)}>
          {assessment.status}
        </Badge>
        <Badge className={getTypeColor(assessment.type)}>
          {assessment.type}
        </Badge>
        {assessment.associatedWith && (
          <Badge variant="outline">
            {assessment.associatedWith.type}: {assessment.associatedWith.name}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants ({participants.length})</TabsTrigger>
          <TabsTrigger value="results">Results Analysis</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assessment Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Information</CardTitle>
                  <CardDescription>
                    Comprehensive details about the assessment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{assessment.description}</p>
                  </div>
                  
                  {assessment.instructions && (
                    <div>
                      <h4 className="font-semibold mb-2">Instructions</h4>
                      <p className="text-muted-foreground">{assessment.instructions}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Total Questions</p>
                        <p className="text-sm text-muted-foreground">{assessment.totalQuestions}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Maximum Score</p>
                        <p className="text-sm text-muted-foreground">{assessment.maxScore}</p>
                      </div>
                    </div>
                    {assessment.passingScore && (
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Passing Score</p>
                          <p className="text-sm text-muted-foreground">{assessment.passingScore}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Participants</p>
                        <p className="text-sm text-muted-foreground">{assessment.participantCount}</p>
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
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold">{completedParticipants.length}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <BarChart3 className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold">{Math.round(averageScore)}</p>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="h-8 w-8 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold">
                        {assessment.passingScore 
                          ? Math.round((completedParticipants.filter(p => (p.score || 0) >= assessment.passingScore!).length / completedParticipants.length) * 100)
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Pass Rate</p>
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
                    <span className="text-sm text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">
                      {Math.round((completedParticipants.length / participants.length) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="font-medium">{formatDuration(assessment.schedule.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="font-medium">{formatDate(assessment.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {participants
                    .filter(p => p.status === "completed")
                    .slice(0, 3)
                    .map((participant) => (
                      <div key={participant._id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{participant.student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {participant.score}/{participant.maxScore}
                          </p>
                        </div>
                        <Badge className={getParticipantStatusColor(participant.status)}>
                          {participant.status}
                        </Badge>
                      </div>
                    ))}
                  {completedParticipants.length === 0 && (
                    <p className="text-sm text-muted-foreground">No submissions yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                {participants.length} students registered for this assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {participant.student.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{participant.student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {participant.student.rollNumber}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{participant.student.department}</p>
                          <p className="text-sm text-muted-foreground">
                            Year {participant.student.year}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getParticipantStatusColor(participant.status)}>
                          {participant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {participant.score !== undefined ? (
                          <div>
                            <p className="font-medium">{participant.score}/{participant.maxScore}</p>
                            <p className="text-sm text-muted-foreground">
                              {participant.percentage}%
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not attempted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.duration ? (
                          <span className="text-sm">{formatDuration(participant.duration)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/assessments/${assessment._id}/participants/${participant._id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {participants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No participants found</h3>
                  <p className="text-muted-foreground">
                    Students will appear here once they register for this assessment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>
                  Distribution of scores across participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scoreDistribution.length > 0 ? (
                  <div className="space-y-4">
                    {scoreDistribution.map((item) => (
                      <div key={item.range} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.range}</span>
                          <span>{item.count} students ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No score data available</p>
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
                  <span className="text-sm text-muted-foreground">Total Participants</span>
                  <span className="font-semibold">{participants.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-semibold">{completedParticipants.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Score</span>
                  <span className="font-semibold">{Math.round(averageScore)}/{assessment.maxScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Highest Score</span>
                  <span className="font-semibold">
                    {completedParticipants.length > 0 
                      ? Math.max(...completedParticipants.map(p => p.score || 0))
                      : 0}/{assessment.maxScore}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Lowest Score</span>
                  <span className="font-semibold">
                    {completedParticipants.length > 0 
                      ? Math.min(...completedParticipants.map(p => p.score || 0))
                      : 0}/{assessment.maxScore}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Schedule</CardTitle>
              <CardDescription>
                Complete schedule and timeline for the assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Assessment Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(assessment.schedule.startDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">End Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(assessment.schedule.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Assessment Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Duration:</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(assessment.schedule.duration)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Questions:</span>
                      <span className="text-sm text-muted-foreground">
                        {assessment.totalQuestions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Max Score:</span>
                      <span className="text-sm text-muted-foreground">
                        {assessment.maxScore}
                      </span>
                    </div>
                    {assessment.passingScore && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Passing Score:</span>
                        <span className="text-sm text-muted-foreground">
                          {assessment.passingScore}
                        </span>
                      </div>
                    )}
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