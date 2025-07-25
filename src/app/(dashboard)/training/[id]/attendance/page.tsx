"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Users, CheckCircle, XCircle, Download, Upload, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface Training {
  _id: string;
  title: string;
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
}

interface Student {
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
  attendanceHistory: {
    date: string;
    present: boolean;
    markedBy: string;
    markedAt: string;
  }[];
}

interface AttendanceSession {
  date: string;
  students: {
    studentId: string;
    present: boolean;
  }[];
}

export default function AttendancePage() {
  const params = useParams();
  const [training, setTraining] = useState<Training | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<"present" | "absent" | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchTrainingDetails();
      fetchStudents();
    }
  }, [params.id]);

  useEffect(() => {
    if (selectedDate && students.length > 0) {
      loadAttendanceForDate();
    }
  }, [selectedDate, students]);

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

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/training/${params.id}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceForDate = async () => {
    try {
      const response = await fetch(`/api/training/${params.id}/attendance?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        const attendanceMap: Record<string, boolean> = {};
        data.forEach((record: any) => {
          attendanceMap[record.studentId] = record.present;
        });
        setAttendanceData(attendanceMap);
      }
    } catch (error) {
      console.error("Error loading attendance:", error);
    }
  };

  const handleAttendanceChange = (studentId: string, present: boolean) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: present
    }));
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedStudents.length === 0) return;

    const newAttendanceData = { ...attendanceData };
    selectedStudents.forEach(studentId => {
      newAttendanceData[studentId] = bulkAction === "present";
    });
    setAttendanceData(newAttendanceData);
    setSelectedStudents([]);
    setBulkAction(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map(s => s.student._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const saveAttendance = async () => {
    if (!selectedDate) {
      setError("Please select a date first");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const attendanceRecords = Object.entries(attendanceData).map(([studentId, present]) => ({
        studentId,
        present,
        date: selectedDate
      }));

      const response = await fetch(`/api/training/${params.id}/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: selectedDate,
          attendance: attendanceRecords
        }),
      });

      if (response.ok) {
        setSuccess("Attendance saved successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to save attendance");
      }
    } catch (error) {
      setError("An error occurred while saving attendance");
    } finally {
      setSaving(false);
    }
  };

  const exportAttendance = () => {
    if (!selectedDate) {
      setError("Please select a date first");
      return;
    }

    const csvData = [
      ["Roll Number", "Name", "Department", "Present", "Date"],
      ...students.map(student => [
        student.student.rollNumber,
        student.student.name,
        student.student.department,
        attendanceData[student.student._id] ? "Yes" : "No",
        selectedDate
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getAttendanceStats = () => {
    const totalStudents = students.length;
    const presentCount = Object.values(attendanceData).filter(present => present).length;
    const absentCount = totalStudents - presentCount;
    const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return { totalStudents, presentCount, absentCount, attendancePercentage };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
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

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground">
            Track attendance for {training.title}
          </p>
        </div>
        <Link href={`/training/${training._id}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Training
          </Button>
        </Link>
      </div>

      {/* Training Info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Registered Students</p>
                <p className="text-sm text-muted-foreground">
                  {training.registeredCount}/{training.capacity}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Schedule</p>
                <p className="text-sm text-muted-foreground">
                  {training.schedule.time} ({training.schedule.days.join(", ")})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={training.status === "ongoing" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                {training.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
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

      {/* Date Selection and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>
              Choose the date for attendance tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={training.schedule.startDate}
              max={training.schedule.endDate}
            />
            {selectedDate && (
              <div className="space-y-2">
                <Button onClick={saveAttendance} disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Attendance"}
                </Button>
                <Button variant="outline" onClick={exportAttendance} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Statistics</CardTitle>
            <CardDescription>
              {selectedDate ? `Attendance for ${formatDate(selectedDate)}` : "Select a date to view statistics"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.presentCount}</p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.absentCount}</p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.attendancePercentage}%</p>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a date to view attendance statistics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedDate && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Mark multiple students as present or absent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedStudents.length === students.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">Select All ({selectedStudents.length}/{students.length})</span>
              </div>
              {selectedStudents.length > 0 && (
                <div className="flex space-x-2">
                  <Select value={bulkAction || ""} onValueChange={(value) => setBulkAction(value as "present" | "absent" | null)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Mark as Present</SelectItem>
                      <SelectItem value="absent">Mark as Absent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleBulkAction} disabled={!bulkAction}>
                    Apply to Selected
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Table */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Student Attendance</CardTitle>
            <CardDescription>
              Mark attendance for each student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.length === students.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Overall Attendance</TableHead>
                  <TableHead>Today's Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.student._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.includes(student.student._id)}
                        onCheckedChange={(checked) => handleSelectStudent(student.student._id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {student.student.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.student.department}</p>
                        <p className="text-sm text-muted-foreground">Year {student.student.year}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.student.rollNumber}
                    </TableCell>
                    <TableCell>
                      {formatDate(student.registrationDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{student.attendance}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${student.attendance}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant={attendanceData[student.student._id] === true ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(student.student._id, true)}
                          className="flex items-center space-x-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Present</span>
                        </Button>
                        <Button
                          variant={attendanceData[student.student._id] === false ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(student.student._id, false)}
                          className="flex items-center space-x-1"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Absent</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {students.length === 0 && (
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
      )}

      {!selectedDate && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">Select a date</h3>
              <p className="text-muted-foreground">
                Choose a date from the training schedule to start tracking attendance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 