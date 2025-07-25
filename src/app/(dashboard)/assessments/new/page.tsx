"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Calendar, Clock, Users, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface AssessmentFormData {
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
  passingScore?: number;
  instructions?: string;
  allowRetake: boolean;
  shuffleQuestions: boolean;
  showResults: boolean;
  timeLimit: boolean;
}

export default function CreateAssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<AssessmentFormData>({
    title: "",
    description: "",
    type: "aptitude",
    schedule: {
      startDate: "",
      endDate: "",
      duration: 60
    },
    totalQuestions: 10,
    maxScore: 100,
    passingScore: 60,
    instructions: "",
    allowRetake: false,
    shuffleQuestions: true,
    showResults: true,
    timeLimit: true
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateScheduleData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value
      }
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Assessment title is required");
      return false;
    }
    if (!formData.description.trim()) {
      setError("Assessment description is required");
      return false;
    }
    if (!formData.schedule.startDate) {
      setError("Start date is required");
      return false;
    }
    if (!formData.schedule.endDate) {
      setError("End date is required");
      return false;
    }
    if (formData.schedule.duration <= 0) {
      setError("Duration must be greater than 0");
      return false;
    }
    if (formData.totalQuestions <= 0) {
      setError("Total questions must be greater than 0");
      return false;
    }
    if (formData.maxScore <= 0) {
      setError("Maximum score must be greater than 0");
      return false;
    }
    if (formData.passingScore && formData.passingScore > formData.maxScore) {
      setError("Passing score cannot be greater than maximum score");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/assessments");
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to create assessment");
      }
    } catch (error) {
      setError("An error occurred while creating the assessment");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold">Assessment Created!</h2>
              <p className="text-muted-foreground">
                Your assessment has been successfully created and is now ready for student registration.
              </p>
              <Link href="/assessments">
                <Button>View All Assessments</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Assessment</h1>
          <p className="text-muted-foreground">
            Set up a new assessment for student evaluation
          </p>
        </div>
        <Link href="/assessments">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessments
          </Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Essential details about the assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Assessment Title *</Label>
              <Input
                id="title"
                placeholder="e.g., JavaScript Fundamentals Test"
                value={formData.title}
                onChange={(e) => updateFormData("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide a comprehensive description of the assessment..."
                rows={4}
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Assessment Type *</Label>
              <Select value={formData.type} onValueChange={(value) => updateFormData("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aptitude">Aptitude Test</SelectItem>
                  <SelectItem value="technical">Technical Assessment</SelectItem>
                  <SelectItem value="personality">Personality Test</SelectItem>
                  <SelectItem value="coding">Coding Challenge</SelectItem>
                  <SelectItem value="interview">Interview Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Provide instructions for students taking this assessment..."
                rows={3}
                value={formData.instructions}
                onChange={(e) => updateFormData("instructions", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Assessment Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Configuration</CardTitle>
            <CardDescription>
              Configure the assessment parameters and scoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalQuestions">Total Questions *</Label>
                <Input
                  id="totalQuestions"
                  type="number"
                  min="1"
                  value={formData.totalQuestions}
                  onChange={(e) => updateFormData("totalQuestions", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxScore">Maximum Score *</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min="1"
                  value={formData.maxScore}
                  onChange={(e) => updateFormData("maxScore", parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score</Label>
              <Input
                id="passingScore"
                type="number"
                min="0"
                max={formData.maxScore}
                placeholder="Leave empty for no passing score"
                value={formData.passingScore || ""}
                onChange={(e) => updateFormData("passingScore", e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.schedule.duration}
                onChange={(e) => updateScheduleData("duration", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="timeLimit"
                  checked={formData.timeLimit}
                  onCheckedChange={(checked) => updateFormData("timeLimit", checked)}
                />
                <Label htmlFor="timeLimit">Enforce time limit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onCheckedChange={(checked) => updateFormData("shuffleQuestions", checked)}
                />
                <Label htmlFor="shuffleQuestions">Shuffle questions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showResults"
                  checked={formData.showResults}
                  onCheckedChange={(checked) => updateFormData("showResults", checked)}
                />
                <Label htmlFor="showResults">Show results immediately</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowRetake"
                  checked={formData.allowRetake}
                  onCheckedChange={(checked) => updateFormData("allowRetake", checked)}
                />
                <Label htmlFor="allowRetake">Allow retakes</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Schedule</CardTitle>
          <CardDescription>
            Set the availability period for the assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.schedule.startDate}
                onChange={(e) => updateScheduleData("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.schedule.endDate}
                onChange={(e) => updateScheduleData("endDate", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Preview</CardTitle>
          <CardDescription>
            Preview of how the assessment will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">{formData.title || "Assessment Title"}</h3>
                <p className="text-sm text-muted-foreground">{formData.type || "Type"}</p>
              </div>
            </div>
            
            {formData.description && (
              <p className="text-sm text-muted-foreground">{formData.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{formData.totalQuestions || 0} questions</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formData.schedule.duration || 0} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formData.schedule.startDate && formData.schedule.endDate 
                    ? `${formData.schedule.startDate} to ${formData.schedule.endDate}`
                    : "Schedule not set"
                  }
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Max Score:</span>
                <span>{formData.maxScore || 0}</span>
              </div>
              {formData.passingScore && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Passing Score:</span>
                  <span>{formData.passingScore}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.timeLimit && <Badge variant="outline">Time Limited</Badge>}
              {formData.shuffleQuestions && <Badge variant="outline">Shuffled</Badge>}
              {formData.showResults && <Badge variant="outline">Show Results</Badge>}
              {formData.allowRetake && <Badge variant="outline">Allow Retakes</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2">
        <Link href="/assessments">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Creating..." : "Create Assessment"}
        </Button>
      </div>
    </div>
  );
} 