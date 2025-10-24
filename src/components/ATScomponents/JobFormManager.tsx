import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Save,
  Briefcase,
  Users,
  Settings,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicForm, DynamicFormData, FormQuestion, QUESTION_TYPES, QuestionType } from './DynamicForm';

// Job interface
export interface Job {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'draft';
  form: DynamicFormData;
  createdAt: string;
  applicationsCount?: number;
}

interface JobFormManagerProps {
  onJobSelect?: (job: Job) => void;
  selectedJobId?: string;
  className?: string;
}

export const JobFormManager: React.FC<JobFormManagerProps> = ({
  onJobSelect,
  selectedJobId,
  className = ''
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // New job form state
  const [newJobData, setNewJobData] = useState({
    title: '',
    description: '',
    department: '',
    location: '',
    type: 'full-time' as const
  });

  // Load jobs from localStorage on mount
  useEffect(() => {
    const savedJobs = localStorage.getItem('ats-jobs');
    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        setJobs(parsedJobs);
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    }
  }, []);

  // Save jobs to localStorage whenever jobs change
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('ats-jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  // Create default application form for new job
  const createDefaultForm = (jobTitle: string): DynamicFormData => ({
    id: `form_${Date.now()}`,
    title: `Application for ${jobTitle}`,
    description: 'Please fill out this application form to apply for this position.',
    questions: [
      {
        id: 'fullName',
        type: 'text',
        title: 'Full Name',
        required: true,
        placeholder: 'Enter your full name'
      },
      {
        id: 'email',
        type: 'email',
        title: 'Email Address',
        required: true,
        placeholder: 'your@email.com'
      },
      {
        id: 'phone',
        type: 'phone',
        title: 'Phone Number',
        required: true,
        placeholder: '+1 (555) 123-4567'
      },
      {
        id: 'experience',
        type: 'select',
        title: 'Years of Experience',
        required: true,
        options: ['0-1 years', '2-3 years', '4-5 years', '6-10 years', '10+ years']
      },
      {
        id: 'coverLetter',
        type: 'textarea',
        title: 'Cover Letter',
        description: 'Tell us why you\'re interested in this position',
        required: true,
        placeholder: 'Write your cover letter here...'
      },
      {
        id: 'availability',
        type: 'date',
        title: 'Available Start Date',
        required: true
      },
      {
        id: 'relocate',
        type: 'boolean',
        title: 'Are you willing to relocate?',
        required: false
      }
    ],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: true
    }
  });

  // Create new job
  const handleCreateJob = () => {
    if (!newJobData.title.trim()) {
      toast.error('Job title is required');
      return;
    }

    const newJob: Job = {
      id: `job_${Date.now()}`,
      title: newJobData.title,
      description: newJobData.description,
      department: newJobData.department,
      location: newJobData.location,
      type: newJobData.type,
      status: 'draft',
      form: createDefaultForm(newJobData.title),
      createdAt: new Date().toISOString(),
      applicationsCount: 0
    };

    setJobs(prev => [...prev, newJob]);
    setNewJobData({
      title: '',
      description: '',
      department: '',
      location: '',
      type: 'full-time'
    });
    setIsCreateModalOpen(false);
    toast.success('Job created successfully');
  };

  // Update job
  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
    toast.success('Job updated successfully');
  };

  // Delete job
  const handleDeleteJob = (jobId: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      setJobs(prev => prev.filter(job => job.id !== jobId));
      toast.success('Job deleted successfully');
    }
  };

  // Toggle job status
  const toggleJobStatus = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: job.status === 'active' ? 'inactive' : 'active' }
        : job
    ));
  };

  // Edit job form
  const handleEditForm = (job: Job) => {
    setEditingJob(job);
    setIsEditModalOpen(true);
  };

  // Save form changes
  const handleSaveForm = (updatedForm: DynamicFormData) => {
    if (editingJob) {
      const updatedJob = { ...editingJob, form: updatedForm };
      handleUpdateJob(updatedJob);
      setIsEditModalOpen(false);
      setEditingJob(null);
    }
  };

  // Preview job form
  const handlePreviewForm = (job: Job) => {
    setSelectedJob(job);
    setIsPreviewModalOpen(true);
  };

  // Select job for button
  const handleSelectJob = (job: Job) => {
    onJobSelect?.(job);
    toast.success(`Selected: ${job.title}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'full-time': return '🕘';
      case 'part-time': return '⏰';
      case 'contract': return '📝';
      case 'internship': return '🎓';
      default: return '💼';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Job Form Manager
          </h2>
          <p className="text-gray-600 mt-1">
            Create and manage job postings with custom application forms
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={newJobData.title}
                  onChange={(e) => setNewJobData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Frontend Developer"
                />
              </div>
              
              <div>
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  value={newJobData.description}
                  onChange={(e) => setNewJobData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role and responsibilities..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={newJobData.department}
                    onChange={(e) => setNewJobData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Engineering"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newJobData.location}
                    onChange={(e) => setNewJobData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Remote / NYC"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="jobType">Job Type</Label>
                <Select
                  value={newJobData.type}
                  onValueChange={(value: any) => setNewJobData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateJob}>
                  Create Job
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs created yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first job posting with a custom application form
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <Card 
              key={job.id} 
              className={`hover:shadow-lg transition-shadow ${
                selectedJobId === job.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 flex items-center gap-2">
                      <span>{getTypeIcon(job.type!)}</span>
                      {job.title}
                    </CardTitle>
                    {job.department && (
                      <p className="text-sm text-gray-600 mt-1">{job.department}</p>
                    )}
                  </div>
                  <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                    {job.status}
                  </Badge>
                </div>
                
                {job.location && (
                  <p className="text-sm text-gray-500">📍 {job.location}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {job.form.questions.length} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {job.applicationsCount || 0} applications
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {job.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {job.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectJob(job)}
                    className="flex-1"
                  >
                    Select
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditForm(job)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreviewForm(job)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleJobStatus(job.id)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteJob(job.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Form Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Application Form: {editingJob?.title}
            </DialogTitle>
          </DialogHeader>
          {editingJob && (
            <DynamicForm
              initialForm={editingJob.form}
              onSave={handleSaveForm}
              mode="edit"
              className="mt-4"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Form Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preview: {selectedJob?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <DynamicForm
              initialForm={selectedJob.form}
              mode="preview"
              className="mt-4"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
