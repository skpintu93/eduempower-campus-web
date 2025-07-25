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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, MapPin, Users, Award, Plus, X, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TrainingFormData {
  title: string;
  description: string;
  type: "technical" | "soft-skills" | "interview-prep" | "certification";
  trainer: {
    name: string;
    email: string;
    phone: string;
    company: string;
    bio: string;
  };
  schedule: {
    startDate: string;
    endDate: string;
    time: string;
    days: string[];
  };
  location: string;
  capacity: number;
  price: number;
  certificate: boolean;
  requirements: string[];
  objectives: string[];
  materials: string[];
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CreateTrainingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<TrainingFormData>({
    title: "",
    description: "",
    type: "technical",
    trainer: {
      name: "",
      email: "",
      phone: "",
      company: "",
      bio: ""
    },
    schedule: {
      startDate: "",
      endDate: "",
      time: "",
      days: []
    },
    location: "",
    capacity: 30,
    price: 0,
    certificate: false,
    requirements: [],
    objectives: [],
    materials: []
  });

  const [newRequirement, setNewRequirement] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newMaterial, setNewMaterial] = useState("");

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateTrainerData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      trainer: {
        ...prev.trainer,
        [field]: value
      }
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

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter(d => d !== day)
          : [...prev.schedule.days, day]
      }
    }));
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }));
      setNewObjective("");
    }
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, newMaterial.trim()]
      }));
      setNewMaterial("");
    }
  };

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim() !== "" && formData.description.trim() !== "" && formData.type !== undefined;
      case 2:
        return formData.trainer.name.trim() !== "" && formData.trainer.email.trim() !== "";
      case 3:
        return formData.schedule.startDate !== "" && formData.schedule.endDate !== "" && 
               formData.schedule.time !== "" && formData.schedule.days.length > 0 && 
               formData.location.trim() !== "";
      case 4:
        return formData.capacity > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/training");
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to create training program");
      }
    } catch (error) {
      setError("An error occurred while creating the training program");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
      setError("");
    } else {
      setError("Please fill in all required fields.");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError("");
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold">Training Program Created!</h2>
              <p className="text-muted-foreground">
                Your training program has been successfully created and is now available for student registration.
              </p>
              <Link href="/training">
                <Button>View All Trainings</Button>
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
          <h1 className="text-3xl font-bold tracking-tight">Create Training Program</h1>
          <p className="text-muted-foreground">
            Set up a new training program for students
          </p>
        </div>
        <Link href="/training">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trainings
          </Button>
        </Link>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step}
                </div>
                {step < 5 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Basic Info</span>
            <span>Trainer</span>
            <span>Schedule</span>
            <span>Settings</span>
            <span>Review</span>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Provide the fundamental details about your training program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Training Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Advanced Web Development with React"
                value={formData.title}
                onChange={(e) => updateFormData("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide a comprehensive description of the training program..."
                rows={4}
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Training Type *</Label>
              <Select value={formData.type} onValueChange={(value) => updateFormData("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select training type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical Skills</SelectItem>
                  <SelectItem value="soft-skills">Soft Skills</SelectItem>
                  <SelectItem value="interview-prep">Interview Preparation</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Trainer Information */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Trainer Information</CardTitle>
            <CardDescription>
              Details about the trainer conducting the program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trainer-name">Trainer Name *</Label>
                <Input
                  id="trainer-name"
                  placeholder="Full name"
                  value={formData.trainer.name}
                  onChange={(e) => updateTrainerData("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-email">Email *</Label>
                <Input
                  id="trainer-email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.trainer.email}
                  onChange={(e) => updateTrainerData("email", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trainer-phone">Phone Number</Label>
                <Input
                  id="trainer-phone"
                  placeholder="+91 98765 43210"
                  value={formData.trainer.phone}
                  onChange={(e) => updateTrainerData("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-company">Company/Organization</Label>
                <Input
                  id="trainer-company"
                  placeholder="Company name"
                  value={formData.trainer.company}
                  onChange={(e) => updateTrainerData("company", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainer-bio">Trainer Bio</Label>
              <Textarea
                id="trainer-bio"
                placeholder="Brief introduction about the trainer's expertise and experience..."
                rows={3}
                value={formData.trainer.bio}
                onChange={(e) => updateTrainerData("bio", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Schedule & Location */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule & Location</CardTitle>
            <CardDescription>
              Set the schedule and location for the training program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.schedule.startDate}
                  onChange={(e) => updateScheduleData("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.schedule.endDate}
                  onChange={(e) => updateScheduleData("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.schedule.time}
                  onChange={(e) => updateScheduleData("time", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Room 101, Computer Lab"
                  value={formData.location}
                  onChange={(e) => updateFormData("location", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days of the Week *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.schedule.days.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label htmlFor={day} className="text-sm">{day}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Settings */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Program Settings</CardTitle>
            <CardDescription>
              Configure capacity, pricing, and additional features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Maximum Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => updateFormData("capacity", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Student (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  placeholder="0 for free"
                  value={formData.price}
                  onChange={(e) => updateFormData("price", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="certificate"
                  checked={formData.certificate}
                  onCheckedChange={(checked) => updateFormData("certificate", checked)}
                />
                <Label htmlFor="certificate">Issue certificates upon completion</Label>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <Label>Prerequisites</Label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a prerequisite requirement..."
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addRequirement()}
                  />
                  <Button type="button" onClick={addRequirement} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.requirements.map((req, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{req}</span>
                      <button
                        onClick={() => removeRequirement(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Objectives */}
            <div className="space-y-4">
              <Label>Learning Objectives</Label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a learning objective..."
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addObjective()}
                  />
                  <Button type="button" onClick={addObjective} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.objectives.map((obj, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{obj}</span>
                      <button
                        onClick={() => removeObjective(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Materials */}
            <div className="space-y-4">
              <Label>Training Materials</Label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a training material..."
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addMaterial()}
                  />
                  <Button type="button" onClick={addMaterial} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.materials.map((mat, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{mat}</span>
                      <button
                        onClick={() => removeMaterial(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>
              Review all the information before creating the training program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">Title</p>
                    <p className="text-sm text-muted-foreground">{formData.title}</p>
                  </div>
                  <div>
                    <p className="font-medium">Type</p>
                    <Badge className="capitalize">{formData.type.replace("-", " ")}</Badge>
                  </div>
                  <div>
                    <p className="font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{formData.description}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trainer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{formData.trainer.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{formData.trainer.email}</p>
                  </div>
                  {formData.trainer.company && (
                    <div>
                      <p className="font-medium">Company</p>
                      <p className="text-sm text-muted-foreground">{formData.trainer.company}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.schedule.startDate} to {formData.schedule.endDate}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">{formData.schedule.time}</p>
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{formData.location}</p>
                  </div>
                  <div>
                    <p className="font-medium">Days</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.schedule.days.map((day) => (
                        <Badge key={day} variant="outline" className="text-xs">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">Capacity</p>
                    <p className="text-sm text-muted-foreground">{formData.capacity} students</p>
                  </div>
                  <div>
                    <p className="font-medium">Price</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.price > 0 ? `₹${formData.price}` : "Free"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Certificate</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.certificate ? "Yes" : "No"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(formData.requirements.length > 0 || formData.objectives.length > 0 || formData.materials.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.requirements.length > 0 && (
                    <div>
                      <p className="font-medium">Prerequisites</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.requirements.map((req, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formData.objectives.length > 0 && (
                    <div>
                      <p className="font-medium">Learning Objectives</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.objectives.map((obj, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {obj}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formData.materials.length > 0 && (
                    <div>
                      <p className="font-medium">Training Materials</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.materials.map((mat, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {mat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex space-x-2">
          {currentStep < 5 ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create Training Program"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 