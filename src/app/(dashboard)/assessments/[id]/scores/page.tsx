"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, Save, Upload, Users, Award, TrendingUp, Clock } from "lucide-react";

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  department: string;
  currentScore?: number;
  maxScore: number;
  submittedAt?: string;
  status: "not-started" | "in-progress" | "completed" | "graded";
}

interface Assessment {
  id: string;
  title: string;
  type: string;
  maxScore: number;
  duration: number;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  completedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

interface ScoreHistory {
  id: string;
  studentId: string;
  studentName: string;
  oldScore?: number;
  newScore: number;
  updatedBy: string;
  updatedAt: string;
  reason?: string;
}

export default function AssessmentScoresPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkScore, setBulkScore] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchAssessmentData();
  }, [assessmentId]);

  const fetchAssessmentData = async () => {
    try {
      setLoading(true);
      
      // Fetch assessment details
      const assessmentResponse = await fetch(`/api/assessments/${assessmentId}`);
      const assessmentData = await assessmentResponse.json();
      setAssessment(assessmentData);

      // Fetch students with scores
      const studentsResponse = await fetch(`/api/assessments/${assessmentId}/scores`);
      const studentsData = await studentsResponse.json();
      setStudents(studentsData);

      // Fetch score history
      const historyResponse = await fetch(`/api/assessments/${assessmentId}/score-history`);
      const historyData = await historyResponse.json();
      setScoreHistory(historyData);
    } catch (error) {
      console.error("Error fetching assessment data:", error);
      setAlert({ type: "error", message: "Failed to load assessment data" });
    } finally {
      setLoading(false);
    }
  };

  const handleScoreUpdate = async (studentId: string, newScore: number) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/scores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, score: newScore }),
      });

      if (response.ok) {
        setStudents(prev => prev.map(student => 
          student.id === studentId 
            ? { ...student, currentScore: newScore, status: "graded" as const }
            : student
        ));
        setAlert({ type: "success", message: "Score updated successfully" });
      } else {
        throw new Error("Failed to update score");
      }
    } catch (error) {
      console.error("Error updating score:", error);
      setAlert({ type: "error", message: "Failed to update score" });
    }
  };

  const handleBulkScoreUpdate = async () => {
    if (!bulkScore || selectedStudents.length === 0) return;

    const score = parseFloat(bulkScore);
    if (isNaN(score) || score < 0 || score > (assessment?.maxScore || 100)) {
      setAlert({ type: "error", message: "Invalid score value" });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/assessments/${assessmentId}/scores/bulk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentIds: selectedStudents, 
          score: score 
        }),
      });

      if (response.ok) {
        setStudents(prev => prev.map(student => 
          selectedStudents.includes(student.id)
            ? { ...student, currentScore: score, status: "graded" as const }
            : student
        ));
        setSelectedStudents([]);
        setBulkScore("");
        setAlert({ type: "success", message: "Bulk score update completed" });
      } else {
        throw new Error("Failed to update scores");
      }
    } catch (error) {
      console.error("Error updating scores:", error);
      setAlert({ type: "error", message: "Failed to update scores" });
    } finally {
      setSaving(false);
    }
  };

  const handleExportResults = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/scores/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assessment-scores-${assessmentId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting results:", error);
      setAlert({ type: "error", message: "Failed to export results" });
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      "not-started": "secondary",
      "in-progress": "outline",
      "completed": "default",
      "graded": "default"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
      {status.replace("-", " ").toUpperCase()}
    </Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading assessment scores...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>Assessment not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Assessment Scores</h1>
            <p className="text-muted-foreground">{assessment.title}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExportResults}>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert className={alert.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessment.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {assessment.completedCount} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessment.averageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              out of {assessment.maxScore}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessment.highestScore}</div>
            <p className="text-xs text-muted-foreground">
              {((assessment.highestScore / assessment.maxScore) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((assessment.completedCount / assessment.totalParticipants) * 100).toFixed(1)}%
            </div>
            <Progress 
              value={(assessment.completedCount / assessment.totalParticipants) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scores">Score Management</TabsTrigger>
          <TabsTrigger value="history">Score History</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          {/* Bulk Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Score Update</CardTitle>
              <CardDescription>
                Update scores for multiple students at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="bulk-score">Score</Label>
                  <Input
                    id="bulk-score"
                    type="number"
                    min="0"
                    max={assessment.maxScore}
                    value={bulkScore}
                    onChange={(e) => setBulkScore(e.target.value)}
                    placeholder={`0-${assessment.maxScore}`}
                  />
                </div>
                <Button 
                  onClick={handleBulkScoreUpdate}
                  disabled={!bulkScore || selectedStudents.length === 0 || saving}
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Update Selected ({selectedStudents.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Students</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Label htmlFor="status-filter">Status Filter</Label>
                  <select
                    id="status-filter"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="graded">Graded</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Scores</CardTitle>
              <CardDescription>
                Manage individual student scores and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudents(filteredStudents.map(s => s.id));
                          } else {
                            setSelectedStudents([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudents(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudents(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>{student.department}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max={assessment.maxScore}
                            value={student.currentScore || ""}
                            onChange={(e) => {
                              const newScore = parseFloat(e.target.value);
                              if (!isNaN(newScore) && newScore >= 0 && newScore <= assessment.maxScore) {
                                handleScoreUpdate(student.id, newScore);
                              }
                            }}
                            className="w-20"
                            placeholder="0"
                          />
                          <span className="text-sm text-muted-foreground">
                            / {assessment.maxScore}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Navigate to student detail page
                            router.push(`/students/${student.id}`);
                          }}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score History</CardTitle>
              <CardDescription>
                Track all score changes and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Previous Score</TableHead>
                    <TableHead>New Score</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoreHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="font-medium">{history.studentName}</TableCell>
                      <TableCell>
                        {history.oldScore !== undefined ? history.oldScore : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{history.newScore}</Badge>
                      </TableCell>
                      <TableCell>{history.updatedBy}</TableCell>
                      <TableCell>
                        {new Date(history.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {history.reason || "Score update"}
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