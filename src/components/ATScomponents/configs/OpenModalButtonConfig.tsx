import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Eye, Users, FileText } from 'lucide-react';
import { OpenModalButtonConfig } from '../OpenModalButton';

interface OpenModalButtonConfigProps {
  config: OpenModalButtonConfig;
  onConfigChange: (key: string, value: any) => void;
}

// Job interface (simplified)
interface Job {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: string;
  status: string;
  deadline?: string;
  form: {
    questions: any[];
  };
  applicationsCount?: number;
}

export const OpenModalButtonConfigComponent: React.FC<OpenModalButtonConfigProps> = ({
  config,
  onConfigChange
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Load jobs from localStorage
  useEffect(() => {
    const savedJobs = localStorage.getItem('ats-jobs');
    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        setJobs(parsedJobs);
        
        // Find selected job if selectedJobId exists
        if (config.selectedJobId) {
          const job = parsedJobs.find((j: Job) => j.id === config.selectedJobId);
          setSelectedJob(job || null);
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    }
  }, [config.selectedJobId]);

  // Handle job selection
  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    onConfigChange('selectedJobId', job.id);
  };

  // Refresh jobs list
  const refreshJobs = () => {
    const savedJobs = localStorage.getItem('ats-jobs');
    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        setJobs(parsedJobs);
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Button Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Button Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="buttonTitle">Button Title</Label>
            <Input
              id="buttonTitle"
              value={config.buttonTitle || ''}
              onChange={(e) => onConfigChange('buttonTitle', e.target.value)}
              placeholder="Apply Now"
            />
          </div>

          <div>
            <Label htmlFor="buttonColor">Button Color</Label>
            <Select
              value={config.buttonColor || 'default'}
              onValueChange={(value) => onConfigChange('buttonColor', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="destructive">Destructive</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="buttonSize">Button Size</Label>
            <Select
              value={config.buttonSize || 'default'}
              onValueChange={(value) => onConfigChange('buttonSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Modal Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modal Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="modalTitle">Modal Title</Label>
            <Input
              id="modalTitle"
              value={config.modalTitle || ''}
              onChange={(e) => onConfigChange('modalTitle', e.target.value)}
              placeholder="Job Application"
            />
          </div>

          <div>
            <Label htmlFor="modalWidth">Modal Width</Label>
            <Select
              value={config.width || 'lg'}
              onValueChange={(value) => onConfigChange('width', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="xl">Extra Large</SelectItem>
                <SelectItem value="2xl">2X Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="submitEndpoint">Submit Endpoint</Label>
            <Input
              id="submitEndpoint"
              value={config.submitEndpoint || ''}
              onChange={(e) => onConfigChange('submitEndpoint', e.target.value)}
              placeholder="/api/job-applications"
            />
          </div>

          <div>
            <Label htmlFor="tenantSlug">Tenant Slug</Label>
            <Input
              id="tenantSlug"
              value={config.tenantSlug || ''}
              onChange={(e) => onConfigChange('tenantSlug', e.target.value)}
              placeholder="my-tenant-slug"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sent as X-Tenant-Slug header in API requests
            </p>
          </div>

          <div>
            <Label htmlFor="successMessage">Success Message</Label>
            <Input
              id="successMessage"
              value={config.successMessage || ''}
              onChange={(e) => onConfigChange('successMessage', e.target.value)}
              placeholder="Application submitted successfully!"
            />
          </div>
        </CardContent>
      </Card>

      {/* Job Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Job Selection
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Select which job this button should open applications for
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {selectedJob ? (
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-green-900">{selectedJob.title}</h4>
                  {selectedJob.department && (
                    <p className="text-sm text-green-700">{selectedJob.department}</p>
                  )}
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {selectedJob.status}
                </Badge>
              </div>
              
              {selectedJob.description && (
                <p className="text-sm text-green-700 mb-3 line-clamp-2">
                  {selectedJob.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {selectedJob.form.questions.length} questions
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {selectedJob.applicationsCount || 0} applications
                </span>
                {selectedJob.location && (
                  <span>📍 {selectedJob.location}</span>
                )}
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedJob(null);
                    onConfigChange('selectedJobId', '');
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-2">No Job Selected</h4>
              <p className="text-gray-500 mb-4 text-sm">
                Select a job to link this button to its application form
              </p>
              
              {jobs.length > 0 ? (
                <div className="space-y-2">
                  <Label>Quick Select:</Label>
                  <Select
                    value={config.selectedJobId || ''}
                    onValueChange={(value) => {
                      const job = jobs.find(j => j.id === value);
                      if (job) handleJobSelect(job);
                    }}
                  >
                    <SelectTrigger className="max-w-xs mx-auto">
                      <SelectValue placeholder="Choose a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title} ({job.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Use the Job Manager component to create jobs first
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
              <div>
                <p className="font-medium text-gray-900">Create or Select a Job</p>
                <p>Use the Job Manager to create job postings with custom application forms</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
              <div>
                <p className="font-medium text-gray-900">Configure Button</p>
                <p>Customize the button appearance and modal settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
              <div>
                <p className="font-medium text-gray-900">Deploy</p>
                <p>The button will open the selected job's application form when clicked</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};