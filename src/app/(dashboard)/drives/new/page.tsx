"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  ArrowRight,
  ArrowLeftCircle,
  ArrowRightCircle,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  GraduationCap,
  Award,
  FileText,
  Loader2,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const driveSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  companyId: z.string().min(1, "Please select a company"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  ctcMin: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Minimum CTC must be greater than 0"),
  ctcMax: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Maximum CTC must be greater than 0"),
  maxCapacity: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num > 0;
  }, "Max capacity must be greater than 0"),
  minCGPA: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 10;
  }, "CGPA must be between 0 and 10"),
  backlogLimit: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 0;
  }, "Backlog limit must be 0 or greater"),
  eligibleBranches: z.array(z.string()).min(1, "At least one branch must be selected"),
  requiredSkills: z.array(z.string()).min(1, "At least one skill must be selected"),
  description: z.string().min(20, "Description must be at least 20 characters"),
});

type DriveFormData = z.infer<typeof driveSchema>;

interface Company {
  id: string;
  name: string;
  industry: string;
  logo?: string;
}

const availableBranches = [
  "Computer Science",
  "Information Technology", 
  "Electronics",
  "Mechanical",
  "Civil"
];

const availableSkills = [
  "JavaScript", "Python", "Java", "C++", "React", "Node.js", "Angular", "Vue.js",
  "MongoDB", "MySQL", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Git",
  "Machine Learning", "Data Science", "DevOps", "UI/UX Design", "Mobile Development"
];

const steps = [
  { id: 1, title: "Basic Information", icon: FileText },
  { id: 2, title: "Eligibility Criteria", icon: GraduationCap },
  { id: 3, title: "Schedule & Location", icon: Calendar },
  { id: 4, title: "Preview", icon: Award },
];

export default function CreateDrivePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<DriveFormData>({
    resolver: zodResolver(driveSchema),
    defaultValues: {
      eligibleBranches: [],
      requiredSkills: [],
    },
  });

  const handleBranchToggle = (branch: string) => {
    const updatedBranches = selectedBranches.includes(branch)
      ? selectedBranches.filter(b => b !== branch)
      : [...selectedBranches, branch];
    
    setSelectedBranches(updatedBranches);
    setValue("eligibleBranches", updatedBranches);
  };

  const handleSkillToggle = (skill: string) => {
    const updatedSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    
    setSelectedSkills(updatedSkills);
    setValue("requiredSkills", updatedSkills);
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: DriveFormData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/drives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create drive");
      }

      setSuccess("Placement drive created successfully!");
      reset();
      setSelectedBranches([]);
      setSelectedSkills([]);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/drives");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const watchedValues = watch();

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
              Create Placement Drive
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Set up a new placement drive with all required details
            </p>
          </div>
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

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center space-x-2 ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="hidden md:block text-sm font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Enter the basic details of the placement drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Drive Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Software Engineer Placement Drive 2024"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyId">Company *</Label>
                <Select onValueChange={(value) => setValue("companyId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <div className="flex items-center space-x-2">
                          {company.logo && (
                            <img src={company.logo} alt={company.name} className="w-4 h-4 rounded" />
                          )}
                          <span>{company.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.companyId && (
                  <p className="text-sm text-red-500">{errors.companyId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the placement drive, job roles, and company culture..."
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ctcMin">Minimum CTC (LPA) *</Label>
                  <Input
                    id="ctcMin"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 3.5"
                    {...register("ctcMin")}
                  />
                  {errors.ctcMin && (
                    <p className="text-sm text-red-500">{errors.ctcMin.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ctcMax">Maximum CTC (LPA) *</Label>
                  <Input
                    id="ctcMax"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 8.0"
                    {...register("ctcMax")}
                  />
                  {errors.ctcMax && (
                    <p className="text-sm text-red-500">{errors.ctcMax.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Maximum Capacity *</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  placeholder="e.g., 100"
                  {...register("maxCapacity")}
                />
                {errors.maxCapacity && (
                  <p className="text-sm text-red-500">{errors.maxCapacity.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Eligibility Criteria */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Eligibility Criteria</span>
              </CardTitle>
              <CardDescription>
                Set the eligibility requirements for students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minCGPA">Minimum CGPA *</Label>
                  <Input
                    id="minCGPA"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    placeholder="e.g., 7.0"
                    {...register("minCGPA")}
                  />
                  {errors.minCGPA && (
                    <p className="text-sm text-red-500">{errors.minCGPA.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backlogLimit">Maximum Backlogs *</Label>
                  <Input
                    id="backlogLimit"
                    type="number"
                    min="0"
                    placeholder="e.g., 2"
                    {...register("backlogLimit")}
                  />
                  {errors.backlogLimit && (
                    <p className="text-sm text-red-500">{errors.backlogLimit.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Eligible Branches *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableBranches.map((branch) => (
                    <div key={branch} className="flex items-center space-x-2">
                      <Checkbox
                        id={branch}
                        checked={selectedBranches.includes(branch)}
                        onCheckedChange={() => handleBranchToggle(branch)}
                      />
                      <Label htmlFor={branch} className="text-sm">
                        {branch}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.eligibleBranches && (
                  <p className="text-sm text-red-500">{errors.eligibleBranches.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Required Skills *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableSkills.map((skill) => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={skill}
                        checked={selectedSkills.includes(skill)}
                        onCheckedChange={() => handleSkillToggle(skill)}
                      />
                      <Label htmlFor={skill} className="text-sm">
                        {skill}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.requiredSkills && (
                  <p className="text-sm text-red-500">{errors.requiredSkills.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Schedule & Location */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Schedule & Location</span>
              </CardTitle>
              <CardDescription>
                Set the date, time, and location for the drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    {...register("date")}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500">{errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    {...register("time")}
                  />
                  {errors.time && (
                    <p className="text-sm text-red-500">{errors.time.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Main Campus, Seminar Hall"
                  {...register("location")}
                />
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Preview */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Preview</span>
              </CardTitle>
              <CardDescription>
                Review all the information before creating the drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {watchedValues.title}</div>
                    <div><strong>Description:</strong> {watchedValues.description}</div>
                    <div><strong>CTC Range:</strong> ₹{watchedValues.ctcMin} - ₹{watchedValues.ctcMax} LPA</div>
                    <div><strong>Max Capacity:</strong> {watchedValues.maxCapacity} students</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Schedule & Location</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Date:</strong> {watchedValues.date}</div>
                    <div><strong>Time:</strong> {watchedValues.time}</div>
                    <div><strong>Location:</strong> {watchedValues.location}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Eligibility Criteria</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><strong>Minimum CGPA:</strong> {watchedValues.minCGPA}</div>
                    <div><strong>Max Backlogs:</strong> {watchedValues.backlogLimit}</div>
                  </div>
                  <div>
                    <div><strong>Eligible Branches:</strong></div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedBranches.map((branch) => (
                        <Badge key={branch} variant="outline" className="text-xs">
                          {branch}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div><strong>Required Skills:</strong></div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeftCircle className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < steps.length ? (
            <Button
              type="button"
              onClick={nextStep}
            >
              Next
              <ArrowRightCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Drive...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Drive
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
} 