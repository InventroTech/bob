import React, { useState } from 'react';
import { FileUploadComponent } from './FileUploadComponent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, User, Mail, Phone } from 'lucide-react';

/**
 * Integration Guide: How to add FileUploadComponent to existing forms
 * 
 * This file demonstrates different ways to integrate the FileUploadComponent
 * into existing application forms and workflows.
 */

// Example 1: Simple Job Application Form with Resume Upload
export const JobApplicationWithUpload: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    resumeUrl: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResumeUpload = (response: any) => {
    // Save the uploaded resume URL
    setFormData(prev => ({
      ...prev,
      resumeUrl: response.files[0]?.url || ''
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Submit the complete application
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Application submitted successfully!');
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Application Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* File Upload Component */}
          <div className="border-t pt-6">
            <FileUploadComponent
              title="Upload Resume"
              description="Upload your resume (PDF, DOC, DOCX)"
              apiEndpoint="/api/upload/resume"
              acceptedFileTypes=".pdf,.doc,.docx"
              maxFileSize={5}
              multiple={false}
              onUploadSuccess={handleResumeUpload}
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit}
            disabled={!formData.resumeUrl || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Example 2: Multi-Step Form with File Upload
export const MultiStepApplicationWithUpload: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1
    fullName: '',
    email: '',
    phone: '',
    // Step 2
    resumeUrl: '',
    coverLetterUrl: '',
    // Step 3
    portfolioUrls: [] as string[]
  });

  const handleDocumentUpload = (response: any, field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: response.files[0]?.url || ''
    }));
  };

  const handlePortfolioUpload = (response: any) => {
    const urls = response.files.map((f: any) => f.url);
    setFormData(prev => ({
      ...prev,
      portfolioUrls: [...prev.portfolioUrls, ...urls]
    }));
  };

  const handleFinalSubmit = async () => {
    // Submit complete application
    console.log('Submitting application:', formData);
    alert('Application submitted successfully!');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Application</CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className={`h-2 flex-1 rounded ${currentStep >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded ${currentStep >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded ${currentStep >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`} />
          </div>
        </CardHeader>
        <CardContent>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 1: Personal Information</h3>
              <Input
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
              <Input
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
              <Button onClick={() => setCurrentStep(2)} className="w-full">
                Next: Upload Documents
              </Button>
            </div>
          )}

          {/* Step 2: Documents */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 2: Upload Documents</h3>
              
              <FileUploadComponent
                title="Resume"
                description="Upload your resume"
                apiEndpoint="/api/upload/resume"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxFileSize={5}
                multiple={false}
                onUploadSuccess={(res) => handleDocumentUpload(res, 'resumeUrl')}
              />

              <FileUploadComponent
                title="Cover Letter (Optional)"
                description="Upload your cover letter"
                apiEndpoint="/api/upload/cover-letter"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxFileSize={5}
                multiple={false}
                onUploadSuccess={(res) => handleDocumentUpload(res, 'coverLetterUrl')}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)} className="flex-1" disabled={!formData.resumeUrl}>
                  Next: Portfolio
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Portfolio */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 3: Portfolio (Optional)</h3>
              
              <FileUploadComponent
                title="Portfolio Images"
                description="Upload portfolio images or work samples"
                apiEndpoint="/api/upload/portfolio"
                acceptedFileTypes="image/*,.pdf"
                maxFileSize={10}
                multiple={true}
                onUploadSuccess={handlePortfolioUpload}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleFinalSubmit} className="flex-1">
                  Submit Application
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Example 3: Modal/Dialog with File Upload
export const FileUploadModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const handleUploadSuccess = (response: any) => {
    setUploadedFiles(response.files);
    setTimeout(() => {
      alert('Files uploaded successfully!');
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Upload Documents</h2>
        
        <FileUploadComponent
          title="Upload Files"
          apiEndpoint="/api/upload"
          acceptedFileTypes="*"
          maxFileSize={20}
          multiple={true}
          onUploadSuccess={handleUploadSuccess}
        />

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// Example 4: Tabbed Interface with Different Upload Types
export const TabbedUploadInterface: React.FC = () => {
  const [uploads, setUploads] = useState({
    resume: null as any,
    coverLetter: null as any,
    references: [] as any[],
    portfolio: [] as any[]
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resume" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="cover">Cover Letter</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="mt-6">
              <FileUploadComponent
                title="Upload Resume"
                apiEndpoint="/api/upload/resume"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxFileSize={5}
                multiple={false}
                onUploadSuccess={(res) => setUploads(prev => ({ ...prev, resume: res }))}
              />
            </TabsContent>

            <TabsContent value="cover" className="mt-6">
              <FileUploadComponent
                title="Upload Cover Letter"
                apiEndpoint="/api/upload/cover-letter"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxFileSize={5}
                multiple={false}
                onUploadSuccess={(res) => setUploads(prev => ({ ...prev, coverLetter: res }))}
              />
            </TabsContent>

            <TabsContent value="references" className="mt-6">
              <FileUploadComponent
                title="Upload Reference Letters"
                apiEndpoint="/api/upload/references"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxFileSize={10}
                multiple={true}
                onUploadSuccess={(res) => setUploads(prev => ({ ...prev, references: res.files }))}
              />
            </TabsContent>

            <TabsContent value="portfolio" className="mt-6">
              <FileUploadComponent
                title="Upload Portfolio"
                apiEndpoint="/api/upload/portfolio"
                acceptedFileTypes="image/*,.pdf"
                maxFileSize={20}
                multiple={true}
                onUploadSuccess={(res) => setUploads(prev => ({ ...prev, portfolio: res.files }))}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Example 5: Integration with JobManagerComponent
export const JobManagerWithFileUpload: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Job Manager with Document Upload</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Job Description Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadComponent
            title="Job Description Files"
            description="Upload job descriptions, requirements, etc."
            apiEndpoint="/api/jobs/documents"
            acceptedFileTypes=".pdf,.doc,.docx,.txt"
            maxFileSize={10}
            multiple={true}
            onUploadSuccess={(response) => {
              console.log('Job documents uploaded:', response);
              // Refresh job list or update UI
            }}
          />
        </CardContent>
      </Card>

      {/* Your existing JobManagerComponent would go here */}
      <div className="text-gray-500 text-center p-8 border-2 border-dashed rounded-lg">
        JobManagerComponent would be rendered here
      </div>
    </div>
  );
};

/**
 * Summary of Integration Patterns:
 * 
 * 1. Simple Form Integration
 *    - Add FileUploadComponent alongside other form fields
 *    - Store upload response in form state
 *    - Submit all data together
 * 
 * 2. Multi-Step Forms
 *    - Dedicate one step to file uploads
 *    - Store uploaded file URLs in state
 *    - Submit everything at the end
 * 
 * 3. Modal/Dialog Pattern
 *    - Open upload interface in a modal
 *    - Handle uploads independently
 *    - Close modal on success
 * 
 * 4. Tabbed Interface
 *    - Organize different upload types in tabs
 *    - Each tab has its own upload config
 *    - Track uploads separately
 * 
 * 5. Component Enhancement
 *    - Add file upload to existing components
 *    - Maintain existing functionality
 *    - Extend with upload capability
 */

export default {
  JobApplicationWithUpload,
  MultiStepApplicationWithUpload,
  FileUploadModal,
  TabbedUploadInterface,
  JobManagerWithFileUpload
};

