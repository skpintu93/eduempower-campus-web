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
import { Building, Mail, Phone, Globe, MapPin, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface CompanyFormData {
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
  autoApprove: boolean;
}

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Manufacturing",
  "Consulting",
  "Education",
  "Retail",
  "E-commerce",
  "Media & Entertainment",
  "Real Estate",
  "Transportation",
  "Energy",
  "Other"
];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function AddCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    description: "",
    industry: "",
    website: "",
    logo: "",
    contact: {
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: ""
    },
    autoApprove: false
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateContactData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Company name is required");
      return false;
    }
    if (!formData.description.trim()) {
      setError("Company description is required");
      return false;
    }
    if (!formData.industry) {
      setError("Industry is required");
      return false;
    }
    if (!formData.contact.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.contact.phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (!formData.contact.address.trim()) {
      setError("Address is required");
      return false;
    }
    if (!formData.contact.city.trim()) {
      setError("City is required");
      return false;
    }
    if (!formData.contact.state) {
      setError("State is required");
      return false;
    }
    if (!formData.contact.pincode.trim()) {
      setError("Pincode is required");
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
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/companies");
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to add company");
      }
    } catch (error) {
      setError("An error occurred while adding the company");
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
                <Building className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold">Company Added Successfully!</h2>
              <p className="text-muted-foreground">
                {formData.autoApprove 
                  ? "The company has been approved and is now active."
                  : "The company has been added and is pending approval."
                }
              </p>
              <Link href="/companies">
                <Button>View All Companies</Button>
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
          <h1 className="text-3xl font-bold tracking-tight">Add New Company</h1>
          <p className="text-muted-foreground">
            Add a new partner company to the placement portal
          </p>
        </div>
        <Link href="/companies">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
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
              Essential details about the company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="e.g., TechCorp Solutions"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide a brief description of the company..."
                rows={4}
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select value={formData.industry} onValueChange={(value) => updateFormData("industry", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.example.com"
                value={formData.website}
                onChange={(e) => updateFormData("website", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => updateFormData("logo", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Primary contact details for the company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@company.com"
                value={formData.contact.email}
                onChange={(e) => updateContactData("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.contact.phone}
                onChange={(e) => updateContactData("phone", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                placeholder="Complete address..."
                rows={3}
                value={formData.contact.address}
                onChange={(e) => updateContactData("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Mumbai"
                  value={formData.contact.city}
                  onChange={(e) => updateContactData("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select value={formData.contact.state} onValueChange={(value) => updateContactData("state", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                placeholder="e.g., 400001"
                value={formData.contact.pincode}
                onChange={(e) => updateContactData("pincode", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Settings</CardTitle>
          <CardDescription>
            Configure how this company should be handled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoApprove"
              checked={formData.autoApprove}
              onCheckedChange={(checked) => updateFormData("autoApprove", checked)}
            />
            <Label htmlFor="autoApprove">
              Auto-approve this company
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            If checked, the company will be automatically approved and can start conducting placement drives immediately. 
            If unchecked, the company will need manual approval from an administrator.
          </p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Company Preview</CardTitle>
          <CardDescription>
            Preview of how the company will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                  <Building className="h-6 w-6 text-gray-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{formData.name || "Company Name"}</h3>
                <p className="text-sm text-muted-foreground">{formData.industry || "Industry"}</p>
              </div>
            </div>
            
            {formData.description && (
              <p className="text-sm text-muted-foreground">{formData.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{formData.contact.email || "Email not provided"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{formData.contact.phone || "Phone not provided"}</span>
              </div>
              {formData.website && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{formData.website}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formData.contact.city && formData.contact.state 
                    ? `${formData.contact.city}, ${formData.contact.state}`
                    : "Location not provided"
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2">
        <Link href="/companies">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Adding..." : "Add Company"}
        </Button>
      </div>
    </div>
  );
} 