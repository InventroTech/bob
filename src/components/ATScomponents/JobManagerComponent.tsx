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
  FileText,
  Calendar,
  MapPin,
  Building,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicForm, DynamicFormData, FormQuestion, QUESTION_TYPES, QuestionType } from './DynamicForm';

// Job interface with deadline
export interface Job {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'draft';
  deadline?: string; // Application deadline
  requireResume?: boolean;
  form: DynamicFormData;
  createdAt: string;
  applicationsCount?: number;
}

interface JobManagerComponentConfig {
  title?: string;
  showCreateButton?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
}

interface JobManagerComponentProps {
  config?: JobManagerComponentConfig;
  className?: string;
}

export const JobManagerComponent: React.FC<JobManagerComponentProps> = ({
  config = {},
  className = ''
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Configuration with defaults
  const {
    title = 'Job Management',
    showCreateButton = true,
    showStats = true,
    layout = 'grid',
    maxJobs = 50
  } = config;

  // New job form state
  const [newJobData, setNewJobData] = useState({
    title: '',
    description: '',
    department: '',
    location: '',
    type: 'full-time' as const,
    deadline: '',
    requireResume: false
  });

  // Load jobs from localStorage on mount
  useEffect(() => {
    const savedJobs = localStorage.getItem('ats-jobs');
    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        setJobs(parsedJobs.slice(0, maxJobs));
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    }
  }, [maxJobs]);

  // Save jobs to localStorage whenever jobs change
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('ats-jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  // Create default application form for new job
  const createDefaultForm = (jobTitle: string, requireResume: boolean = false): DynamicFormData => ({
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
      },
      ...(requireResume ? [{
        id: 'resume',
        type: 'file' as QuestionType,
        title: 'Resume/CV',
        description: 'Please upload your resume or CV (PDF, DOC, DOCX)',
        required: true,
        validation: {
          pattern: '\\.(pdf|doc|docx)$'
        }
      }] : [])
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
      deadline: newJobData.deadline,
      requireResume: newJobData.requireResume,
      status: 'draft',
      form: createDefaultForm(newJobData.title, newJobData.requireResume),
      createdAt: new Date().toISOString(),
      applicationsCount: 0
    };

    setJobs(prev => [newJob, ...prev]);
    setNewJobData({
      title: '',
      description: '',
      department: '',
      location: '',
      type: 'full-time',
      deadline: '',
      requireResume: false
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

  // Check if deadline is approaching (within 7 days)
  const isDeadlineApproaching = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  // Get stats
  const stats = {
    total: jobs.length,
    active: jobs.filter(j => j.status === 'active').length,
    draft: jobs.filter(j => j.status === 'draft').length,
    totalApplications: jobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0)
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="space-y-8 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <Briefcase className="h-8 w-8" />
              {title}
            </h2>
            {showStats && (
              <div className="flex items-center gap-6 mt-4 text-lg text-gray-600">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  <span className="font-semibold text-gray-900">{stats.total}</span> Total
                </span>
                <span className="flex items-center gap-2 text-green-600">
                  ✓ <span className="font-semibold text-gray-900">{stats.active}</span> Active
                </span>
                <span className="flex items-center gap-2 text-yellow-600">
                  📝 <span className="font-semibold text-gray-900">{stats.draft}</span> Draft
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold text-gray-900">{stats.totalApplications}</span> Applications
                </span>
              </div>
            )}
          </div>
        
          {showCreateButton && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Job
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">Create New Job</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={newJobData.title}
                    onChange={(e) => setNewJobData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Frontend Developer"
                    className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                
                <div>
                  <Label htmlFor="jobDescription" className="text-sm font-medium text-gray-700">Job Description</Label>
                  <Textarea
                    id="jobDescription"
                    value={newJobData.description}
                    onChange={(e) => setNewJobData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the role and responsibilities..."
                    rows={3}
                    className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department</Label>
                    <Input
                      id="department"
                      value={newJobData.department}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Engineering"
                      className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
                    <Input
                      id="location"
                      value={newJobData.location}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Remote / NYC"
                      className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobType" className="text-sm font-medium text-gray-700">Job Type</Label>
                    <Select
                      value={newJobData.type}
                      onValueChange={(value: any) => setNewJobData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="mt-2 border-gray-300">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="deadline" className="text-sm font-medium text-gray-700">Application Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newJobData.deadline}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, deadline: e.target.value }))}
                      className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="requireResume" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireResume"
                      checked={newJobData.requireResume || false}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, requireResume: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    Require Resume Upload
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">Applicants will be required to upload their resume</p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateJob}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-semibold"
                  >
                    Create Job
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16">
            <Briefcase className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No jobs created yet</h3>
            <p className="text-gray-600 text-lg mb-8">
              Create your first job posting with a custom application form
            </p>
            {showCreateButton && (
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Job
              </Button>
            )}
          </div>
        ) : (
          <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-6'}>
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className="bg-white rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{getTypeIcon(job.type!)}</span>
                      <div>
                        <h3 className="text-xl font-bold text-black line-clamp-2">{job.title}</h3>
                        {job.department && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {job.department}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {job.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </p>
                  )}
                  
                  {job.deadline && (
                    <p className={`text-sm flex items-center gap-1 ${
                      isDeadlineApproaching(job.deadline) ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      <Calendar className="h-3 w-3" />
                      Deadline: {new Date(job.deadline).toLocaleDateString()}
                      {isDeadlineApproaching(job.deadline) && (
                        <span className="text-xs bg-red-100 text-red-800 px-1 rounded">Soon</span>
                      )}
                    </p>
                  )}
                </div>
                
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
                  
                  {job.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {job.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditForm(job)}
                      className="flex-1 border-gray-300 text-black hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Form
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewForm(job)}
                      className="text-gray-600 hover:text-black hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleJobStatus(job.id)}
                      className="text-gray-600 hover:text-black hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

      {/* Edit Form Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
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
    </div>
  );
};
