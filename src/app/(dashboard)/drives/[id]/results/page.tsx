"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Save,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Award,
  TrendingUp,
  FileText,
  Loader2
} from "lucide-react";

interface DriveResult {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  branch: string;
  round1Score?: number;
  round2Score?: number;
  round3Score?: number;
  finalStatus: "selected" | "rejected" | "pending";
  ctc?: number;
  feedback?: string;
  updatedAt: string;
}

interface DriveInfo {
  id: string;
  title: string;
  company: {
    name: string;
  };
  totalStudents: number;
  selectedCount: number;
  rejectedCount: number;
  pendingCount: number;
}

export default function DriveResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const [results, setResults] = useState<DriveResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingResult, setEditingResult] = useState<string | null>(null);
  const [editedResults, setEditedResults] = useState<Partial<DriveResult>>({});

  useEffect(() => {
    if (params.id) {
      fetchDriveResults(params.id as string);
    }
  }, [params.id]);

  const fetchDriveResults = async (driveId: string) => {
    try {
      const response = await fetch(`/api/drives/${driveId}/results`);
      if (response.ok) {
        const data = await response.json();
        setDriveInfo(data.driveInfo);
        setResults(data.results || []);
      } else {
        router.push("/drives");
      }
    } catch (error) {
      console.error("Failed to fetch drive results:", error);
      router.push("/drives");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditResult = (resultId: string) => {
    setEditingResult(resultId);
    const result = results.find(r => r.id === resultId);
    if (result) {
      setEditedResults({
        round1Score: result.round1Score,
        round2Score: result.round2Score,
        round3Score: result.round3Score,
        finalStatus: result.finalStatus,
        ctc: result.ctc,
        feedback: result.feedback,
      });
    }
  };

  const handleSaveResult = async (resultId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/drives/${params.id}/results/${resultId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedResults),
      });

      if (response.ok) {
        // Update local state
        setResults(prev => prev.map(result => 
          result.id === resultId 
            ? { ...result, ...editedResults, updatedAt: new Date().toISOString() }
            : result
        ));
        setEditingResult(null);
        setEditedResults({});
        setSuccess("Result updated successfully!");
      } else {
        throw new Error("Failed to update result");
      }
    } catch (error) {
      setError("Failed to update result");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkUpdate = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/drives/${params.id}/results/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ results: editedResults }),
      });

      if (response.ok) {
        setSuccess("Bulk update completed successfully!");
        setEditedResults({});
      } else {
        throw new Error("Failed to update results");
      }
    } catch (error) {
      setError("Failed to update results");
    } finally {
      setIsSaving(false);
    }
  };

  const exportResults = () => {
    const csvContent = [
      ["Student Name", "Roll Number", "Branch", "Round 1", "Round 2", "Round 3", "Final Status", "CTC (LPA)", "Feedback"],
      ...results.map(result => [
        result.studentName,
        result.rollNumber,
        result.branch,
        result.round1Score || "",
        result.round2Score || "",
        result.round3Score || "",
        result.finalStatus,
        result.ctc || "",
        result.feedback || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drive_results_${params.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
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

  const getAverageScore = (scores: (number | undefined)[]) => {
    const validScores = scores.filter(score => score !== undefined) as number[];
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!driveInfo) {
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
            <Link href={`/drives/${params.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Drive Results
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {driveInfo.title} • {driveInfo.company.name}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportResults}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driveInfo.totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{driveInfo.selectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{driveInfo.rejectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{driveInfo.pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Results</CardTitle>
              <CardDescription>
                Manage and update placement results for all students
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleBulkUpdate}
              disabled={isSaving || Object.keys(editedResults).length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Changes
                </>
              )}
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
                <TableHead>Round 1</TableHead>
                <TableHead>Round 2</TableHead>
                <TableHead>Round 3</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Final Status</TableHead>
                <TableHead>CTC (LPA)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{result.studentName}</div>
                    </div>
                  </TableCell>
                  <TableCell>{result.rollNumber}</TableCell>
                  <TableCell>{result.branch}</TableCell>
                  <TableCell>
                    {editingResult === result.id ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedResults.round1Score || ""}
                        onChange={(e) => setEditedResults(prev => ({
                          ...prev,
                          round1Score: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                        className="w-16"
                      />
                    ) : (
                      result.round1Score || "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingResult === result.id ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedResults.round2Score || ""}
                        onChange={(e) => setEditedResults(prev => ({
                          ...prev,
                          round2Score: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                        className="w-16"
                      />
                    ) : (
                      result.round2Score || "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingResult === result.id ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedResults.round3Score || ""}
                        onChange={(e) => setEditedResults(prev => ({
                          ...prev,
                          round3Score: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                        className="w-16"
                      />
                    ) : (
                      result.round3Score || "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {getAverageScore([result.round1Score, result.round2Score, result.round3Score]).toFixed(1)}
                  </TableCell>
                  <TableCell>
                    {editingResult === result.id ? (
                      <Select 
                        value={editedResults.finalStatus || result.finalStatus} 
                        onValueChange={(value) => setEditedResults(prev => ({
                          ...prev,
                          finalStatus: value as "selected" | "rejected" | "pending"
                        }))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="selected">Selected</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getStatusBadge(result.finalStatus)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingResult === result.id ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editedResults.ctc || ""}
                        onChange={(e) => setEditedResults(prev => ({
                          ...prev,
                          ctc: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                        className="w-20"
                      />
                    ) : (
                      result.ctc ? `₹${result.ctc.toLocaleString()}` : "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingResult === result.id ? (
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveResult(result.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingResult(null);
                            setEditedResults({});
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditResult(result.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Feedback</CardTitle>
          <CardDescription>
            Add feedback for multiple students at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulkFeedback">Feedback Template</Label>
              <Textarea
                id="bulkFeedback"
                placeholder="Enter feedback template that will be applied to selected students..."
                className="mt-2"
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Results
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Average Round 1 Score</span>
                <span className="font-semibold">
                  {results.length > 0 
                    ? (results.reduce((sum, r) => sum + (r.round1Score || 0), 0) / results.length).toFixed(1)
                    : "N/A"
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Average Round 2 Score</span>
                <span className="font-semibold">
                  {results.length > 0 
                    ? (results.reduce((sum, r) => sum + (r.round2Score || 0), 0) / results.length).toFixed(1)
                    : "N/A"
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Average Round 3 Score</span>
                <span className="font-semibold">
                  {results.length > 0 
                    ? (results.reduce((sum, r) => sum + (r.round3Score || 0), 0) / results.length).toFixed(1)
                    : "N/A"
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Selection Rate</span>
                <span className="font-semibold text-green-600">
                  {driveInfo.totalStudents > 0 
                    ? ((driveInfo.selectedCount / driveInfo.totalStudents) * 100).toFixed(1) + "%"
                    : "0%"
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results
                .filter(result => result.updatedAt)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 5)
                .map((result) => (
                  <div key={result.id} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">
                      {result.studentName} - {result.finalStatus}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(result.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 