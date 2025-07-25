"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Eye
} from "lucide-react";

interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ImportResult {
  totalRows: number;
  successful: number;
  failed: number;
  errors: ImportError[];
}

export default function BulkImportPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!validTypes.includes(file.type)) {
        setError("Please select a valid Excel or CSV file");
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
      setError("");
    }
  };

  const downloadTemplate = () => {
    // Create CSV template content
    const templateContent = `First Name,Last Name,Email,Phone,Roll Number,Branch,Semester,CGPA,Address,Date of Birth,Gender,Skills
John,Doe,john.doe@example.com,1234567890,CS001,Computer Science,6,8.5,"123 Main St, City, State",1999-01-01,male,"JavaScript,React,Node.js"
Jane,Smith,jane.smith@example.com,0987654321,IT001,Information Technology,5,8.2,"456 Oak Ave, City, State",2000-05-15,female,"Python,Java,MySQL"`;

    // Create blob and download
    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Please select a file to import");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch("/api/students/bulk-import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Import failed");
      }

      setImportResult(result);
      setSuccess(`Import completed! ${result.successful} students imported successfully.`);
      
      // Reset file selection
      setSelectedFile(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during import");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const retryImport = () => {
    setImportResult(null);
    setError("");
    setSuccess("");
    handleImport();
  };

  const getErrorTypeIcon = (field: string) => {
    if (field.includes("email")) return <XCircle className="h-4 w-4 text-red-500" />;
    if (field.includes("phone")) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/students">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Bulk Import Students
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Import multiple students from Excel or CSV file
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span>Download Template</span>
              </CardTitle>
              <CardDescription>
                Download the template file to ensure correct format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-medium">Template includes:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Required fields: First Name, Last Name, Email, Phone, Roll Number</li>
                  <li>• Academic fields: Branch, Semester, CGPA</li>
                  <li>• Personal fields: Address, Date of Birth, Gender</li>
                  <li>• Skills (comma-separated)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Select an Excel (.xlsx) or CSV file to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        {selectedFile ? selectedFile.name : "Choose file"}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Excel or CSV up to 10MB
                      </span>
                    </label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="sr-only"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              <Button 
                onClick={handleImport} 
                disabled={!selectedFile || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Import Results */}
        <div className="space-y-6">
          {importResult && (
            <>
              {/* Import Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Import Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {importResult.totalRows}
                      </div>
                      <div className="text-sm text-gray-500">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {importResult.successful}
                      </div>
                      <div className="text-sm text-gray-500">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {importResult.failed}
                      </div>
                      <div className="text-sm text-gray-500">Failed</div>
                    </div>
                  </div>

                  {importResult.failed > 0 && (
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        onClick={retryImport}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Import
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Validation Errors</CardTitle>
                    <CardDescription>
                      {importResult.errors.length} errors found during import
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant="outline">{error.row}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getErrorTypeIcon(error.field)}
                                  <span className="font-medium">{error.field}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-red-600">
                                {error.message}
                              </TableCell>
                              <TableCell className="text-gray-500">
                                {error.value || "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Import Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• First Name (2+ characters)</li>
                    <li>• Last Name (2+ characters)</li>
                    <li>• Email (valid format)</li>
                    <li>• Phone (10+ digits)</li>
                    <li>• Roll Number (unique)</li>
                    <li>• Branch (from predefined list)</li>
                    <li>• Semester (1-8)</li>
                    <li>• CGPA (0-10)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Optional Fields:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Address</li>
                    <li>• Date of Birth (YYYY-MM-DD)</li>
                    <li>• Gender (male/female/other)</li>
                    <li>• Skills (comma-separated)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Tips:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Use the template to ensure correct format</li>
                    <li>• Check for duplicate email addresses</li>
                    <li>• Ensure roll numbers are unique</li>
                    <li>• Skills should be comma-separated</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 