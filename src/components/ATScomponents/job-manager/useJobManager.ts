/** State, effects, and handlers for the job manager. */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DynamicFormData, FormQuestion, QuestionType } from '../DynamicForm';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

import type { Job, JobManagerComponentProps, QuestionWithType } from './types';

export function useJobManager({
  config = {},
  className = '',
}: JobManagerComponentProps) {
const { tenantId } = useTenant(); // Get tenant ID from hook
const { session } = useAuth();
const [jobs, setJobs] = useState<Job[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
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
  maxJobs = 50,
  apiEndpoint,
  updateEndpoint, // Separate endpoint for updates
  deleteEndpoint, // Separate endpoint for deletes
  apiMode = 'localhost',
  useDemoData = false,
  tenantSlug,
  dataMapping = {}
} = config;

// New job form state
const [newJobData, setNewJobData] = useState({
  title: '',
  description: '',
  department: '',
  location: '',
  type: 'full-time' as const,
  deadline: '',
  requireResume: false,
  salary: '',
  criteria: '',
  skills: ''
});

// Custom questions state for new job (with answer type)
const [customQuestions, setCustomQuestions] = useState<QuestionWithType[]>([
  { text: '', type: 'textarea' },
  { text: '', type: 'textarea' }
]);

// Edit job form state
const [editJobData, setEditJobData] = useState<{
  title: string;
  description: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  deadline: string;
  requireResume: boolean;
  salary: string;
  criteria: string;
  skills: string;
}>({
  title: '',
  description: '',
  department: '',
  location: '',
  type: 'full-time',
  deadline: '',
  requireResume: false,
  salary: '',
  criteria: '',
  skills: ''
});
const [editCustomQuestions, setEditCustomQuestions] = useState<QuestionWithType[]>([]);

// Add a new question field
const addQuestionField = () => {
  setCustomQuestions([...customQuestions, { text: '', type: 'textarea' }]);
};

// Remove a question field
const removeQuestionField = (index: number) => {
  if (customQuestions.length > 1) {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  }
};

// Update a question text
const updateQuestion = (index: number, value: string) => {
  const updated = [...customQuestions];
  updated[index] = { ...updated[index], text: value };
  setCustomQuestions(updated);
};

// Update a question type
const updateQuestionType = (index: number, type: QuestionType) => {
  const updated = [...customQuestions];
  const question = updated[index];
  updated[index] = { 
    ...question, 
    type,
    // Initialize options for select/radio/checkbox types
    options: (type === 'select' || type === 'radio' || type === 'checkbox') 
      ? (question.options && question.options.length > 0 ? question.options : ['Option 1', 'Option 2', 'Option 3'])
      : undefined
  };
  setCustomQuestions(updated);
};

// Add an option to a question
const addQuestionOption = (questionIndex: number) => {
  const updated = [...customQuestions];
  const question = updated[questionIndex];
  if (!question.options) {
    question.options = [];
  }
  question.options.push(`Option ${question.options.length + 1}`);
  updated[questionIndex] = { ...question };
  setCustomQuestions(updated);
};

// Remove an option from a question
const removeQuestionOption = (questionIndex: number, optionIndex: number) => {
  const updated = [...customQuestions];
  const question = updated[questionIndex];
  if (question.options && question.options.length > 1) {
    question.options = question.options.filter((_, i) => i !== optionIndex);
    updated[questionIndex] = { ...question };
    setCustomQuestions(updated);
  }
};

// Update an option value
const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
  const updated = [...customQuestions];
  const question = updated[questionIndex];
  if (question.options) {
    question.options[optionIndex] = value;
    updated[questionIndex] = { ...question };
    setCustomQuestions(updated);
  }
};

// Data mapping helper - Parse backend response format
const mapApiDataToJob = (apiData: any): Job => {
  // Backend returns: { id, entity_type, name, data: {...} }
  const jobData = apiData.data || apiData;
  
  const {
    idField = 'id',
    titleField = 'title',
    descriptionField = 'other_description',
    departmentField = 'department',
    locationField = 'location',
    typeField = 'type',
    statusField = 'status',
    deadlineField = 'deadline',
    createdAtField = 'createdAt'
  } = dataMapping;

  // Extract form questions - prefer full form structure, fallback to simple questions
  let formQuestions: FormQuestion[] = [];
  
  if (jobData.formQuestions && Array.isArray(jobData.formQuestions)) {
    // Use full form structure if available (with types and options)
    formQuestions = jobData.formQuestions.map((q: any) => ({
      id: q.id || `q_${Date.now()}_${Math.random()}`,
      type: q.type || 'text',
      title: q.title || '',
      description: q.description,
      required: q.required !== undefined ? q.required : true,
      placeholder: q.placeholder,
      options: q.options,
      validation: q.validation
    }));
  } else {
    // Fallback: Extract questions from backend format (backward compatibility)
    const backendQuestions = jobData.questions || {};
    formQuestions = Object.entries(backendQuestions).map(([key, questionText]) => {
      const questionStr = String(questionText).toLowerCase();
      const isFileQuestion = questionStr.includes('resume') || questionStr.includes('cv') || questionStr.includes('upload');
      
      return {
          id: key,
          type: isFileQuestion ? 'file' : 'text',
          title: String(questionText),
          required: true,
          placeholder: isFileQuestion ? 'Upload your file here' : 'Enter your answer here...',
          ...(isFileQuestion && {
            description: 'Please upload your resume or CV (PDF, DOC, DOCX)',
            validation: {
              pattern: '\\.(pdf|doc|docx)$'
            }
          })
        };
      });
    }

    // Add default questions if none provided
    if (formQuestions.length === 0) {
      formQuestions.push(
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
        }
      );
    }

    const form: DynamicFormData = {
      id: jobData.formId || `form_${apiData.id || Date.now()}`,
      title: jobData.formTitle || `Application for ${jobData[titleField] || jobData.title}`,
      description: 'Please fill out this application form to apply for this position.',
      questions: formQuestions,
      settings: {
        allowMultipleSubmissions: false,
        showProgressBar: true,
        collectEmail: true
      }
    };

    return {
      id: apiData[idField] || apiData.id || '',
      title: jobData[titleField] || jobData.title || apiData.name || '',
      description: jobData[descriptionField] || jobData.other_description || '',
      department: jobData[departmentField] || jobData.department || '',
      location: jobData[locationField] || jobData.location || '',
      type: jobData[typeField] || jobData.type || 'full-time',
      status: jobData[statusField] || jobData.status || 'draft',
      deadline: jobData[deadlineField] || jobData.deadline || '',
      requireResume: jobData.requireResume || false,
      form: form,
      createdAt: jobData[createdAtField] || jobData.createdAt || apiData.created_at || new Date().toISOString(),
      applicationsCount: jobData.applicationsCount || 0
    };
  };

// Map Job to API format for POST requests (Backend format)
const mapJobToApiFormat = (job: Job): any => {
  // Convert form questions to the backend format (for backward compatibility)
  const questions: Record<string, string> = {};
  job.form.questions.forEach((question, index) => {
    questions[`q${index + 1}`] = question.title;
  });

  // Store full form structure with types and options
  const formQuestions = job.form.questions.map(q => ({
    id: q.id,
    type: q.type,
    title: q.title,
    description: q.description,
    required: q.required,
    placeholder: q.placeholder,
    options: q.options,
    validation: q.validation
  }));

  // Format according to backend requirements
  return {
    entity_type: "job",
    name: job.title, // Job title as the name field
    data: {
      title: job.title,
      department: job.department || '',
      salary: job.salary || '',
      location: job.location || '',
      criteria: job.criteria || '',
      skills: job.skills || '',
      other_description: job.description || '',
      deadline: job.deadline || '',
      type: job.type || 'full-time',
      status: job.status || 'draft',
      requireResume: job.requireResume || false,
      questions: questions, // Dynamic questions from form (for backward compatibility)
      formQuestions: formQuestions, // Full form structure with types and options
      createdAt: job.createdAt,
      formId: job.form.id,
      formTitle: job.form.title
    }
  };
};

// API fetching function
const fetchJobs = async () => {
  if (!apiEndpoint || useDemoData) {
    // Use localStorage if no API endpoint or demo mode
    console.log('Using localStorage data:', useDemoData ? 'Demo mode enabled' : 'No API endpoint configured');
    loadLocalJobs();
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // Construct full URL based on API mode
    let url = apiEndpoint;
    if (apiMode === 'renderer') {
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
    } else if (apiMode === 'localhost') {
      const baseUrl = import.meta.env.VITE_LOCAL_API_URL;
      url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add Bearer token from Supabase session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Add tenant slug if provided (use config or fallback to tenantId from hook)
    const effectiveTenantSlug = tenantSlug || tenantId;
    if (effectiveTenantSlug) {
      headers['X-Tenant-Slug'] = effectiveTenantSlug;
    }

    console.log('Fetching jobs from:', url);
    console.log('Using tenant slug:', effectiveTenantSlug);
    console.log('Request headers:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Response text:', responseText);
      
      if (responseText.includes('<!DOCTYPE')) {
        throw new Error(`API endpoint returned HTML instead of JSON. This usually means the endpoint doesn't exist or requires authentication. Status: ${response.status}`);
      }
      
      throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Non-JSON response:', responseText);
      
      if (responseText.includes('<!DOCTYPE')) {
        throw new Error('API endpoint returned HTML instead of JSON. Please check if the endpoint exists and is accessible.');
      }
      
      throw new Error(`Expected JSON response but got: ${contentType || 'unknown'}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    
    // Handle different response structures
    const jobsData = Array.isArray(data) ? data : (data.data || data.jobs || []);
    
    if (!Array.isArray(jobsData)) {
      console.warn('API response is not an array:', jobsData);
      throw new Error('API response does not contain a valid jobs array');
    }
    
    // Map API data to our Job interface
    const mappedJobs = jobsData.map(mapApiDataToJob);
    console.log('Mapped jobs:', mappedJobs);
    
    // Apply maxJobs limit
    const limitedJobs = mappedJobs.slice(0, maxJobs);
    
    setJobs(limitedJobs);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs';
    setError(errorMessage);
    
    // Show detailed error for debugging
    if (errorMessage.includes('<!DOCTYPE')) {
      setError('API endpoint returned HTML instead of JSON. Please check:\n1. The endpoint URL is correct\n2. The API server is running\n3. Authentication is not required\n4. CORS is properly configured');
    }
    
    // Fallback to local jobs on error
    loadLocalJobs();
  } finally {
    setLoading(false);
  }
};

// Load local jobs (localStorage)
const loadLocalJobs = () => {
  const savedJobs = localStorage.getItem('ats-jobs');
  if (savedJobs) {
    try {
      const parsedJobs = JSON.parse(savedJobs);
      setJobs(parsedJobs.slice(0, maxJobs));
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  }
};

// Post job to API
const postJobToAPI = async (job: Job): Promise<boolean> => {
  if (!apiEndpoint || useDemoData) {
    // Skip API call if no endpoint or demo mode
    return true;
  }

  try {
    // Construct full URL based on API mode
    let url = apiEndpoint;
    if (apiMode === 'renderer') {
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
    } else if (apiMode === 'localhost') {
      const baseUrl = import.meta.env.VITE_LOCAL_API_URL;
      url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add Bearer token from Supabase session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Add tenant slug if provided (use config or fallback to tenantId from hook)
    const effectiveTenantSlug = tenantSlug || tenantId;
    if (effectiveTenantSlug) {
      headers['X-Tenant-Slug'] = effectiveTenantSlug;
    }

    const apiData = mapJobToApiFormat(job);
    console.log('Using tenant slug:', effectiveTenantSlug);
    console.log('Posting job to API:', apiData);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiData)
    });

    console.log('POST response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('POST response text:', responseText);
      throw new Error(`Failed to create job: ${response.status} - ${responseText}`);
    }

    const result = await response.json();
    console.log('Job created successfully:', result);
    
    return true;
  } catch (err) {
    console.error('Error posting job to API:', err);
    toast.error(`Failed to sync job to API: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
};

// Load jobs on component mount and when API config changes
useEffect(() => {
  fetchJobs();
}, [apiEndpoint, apiMode, useDemoData, maxJobs]);

// Save jobs to localStorage whenever jobs change
useEffect(() => {
  if (jobs.length > 0) {
    localStorage.setItem('ats-jobs', JSON.stringify(jobs));
  }
}, [jobs]);

// Create default application form for new job

// Create new job
const handleCreateJob = async () => {
  if (!newJobData.title.trim()) {
    toast.error('Job title is required');
    return;
  }

  // Filter out empty questions
  const validQuestions = customQuestions.filter(q => q.text.trim() !== '');
  if (validQuestions.length === 0) {
    toast.error('Please add at least one question');
    return;
  }

  // Create form questions from custom questions
  const formQuestions: FormQuestion[] = [
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
    ...validQuestions.map((question, index) => {
      const baseQuestion: FormQuestion = {
        id: `custom_${index + 1}`,
        type: question.type,
        title: question.text,
        required: true,
        placeholder: question.type === 'textarea' ? 'Enter your answer here...' : 
                     question.type === 'text' ? 'Enter your answer' :
                     question.type === 'select' ? 'Select an option' :
                     question.type === 'number' ? 'Enter a number' :
                     question.type === 'date' ? 'Select a date' : 'Enter your answer'
      };
      
      // Add options for select, radio, checkbox types from question state
      if (question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') {
        baseQuestion.options = question.options && question.options.length > 0 
          ? question.options 
          : ['Option 1', 'Option 2', 'Option 3'];
      }
      
      return baseQuestion;
    }),
    ...(newJobData.requireResume ? [{
      id: 'resume',
      type: 'file' as QuestionType,
      title: 'Resume/CV',
      description: 'Please upload your resume or CV (PDF, DOC, DOCX)',
      required: true,
      validation: {
        pattern: '\\.(pdf|doc|docx)$'
      }
    }] : [])
  ];

  const customForm: DynamicFormData = {
    id: `form_${Date.now()}`,
    title: `Application for ${newJobData.title}`,
    description: 'Please fill out this application form to apply for this position.',
    questions: formQuestions,
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: true
    }
  };

  const newJob: Job = {
    id: `job_${Date.now()}`,
    title: newJobData.title,
    description: newJobData.description,
    department: newJobData.department,
    location: newJobData.location,
    type: newJobData.type,
    deadline: newJobData.deadline,
    requireResume: newJobData.requireResume,
    salary: newJobData.salary,
    criteria: newJobData.criteria,
    skills: newJobData.skills,
    status: 'draft',
    form: customForm,
    createdAt: new Date().toISOString(),
    applicationsCount: 0
  };

  // Add to local state first
  setJobs(prev => [newJob, ...prev]);
  
  // Try to post to API
  const apiSuccess = await postJobToAPI(newJob);
  
  if (apiSuccess) {
    toast.success('Job created successfully!');
  } else {
    toast.success('Job created locally (API sync failed)');
  }

  // Reset form and close modal
  setNewJobData({
    title: '',
    description: '',
    department: '',
    location: '',
    type: 'full-time',
    deadline: '',
    requireResume: false,
    salary: '',
    criteria: '',
    skills: ''
  });
  setCustomQuestions([{ text: '', type: 'textarea' }, { text: '', type: 'textarea' }]); // Reset questions
  setIsCreateModalOpen(false);
};

// Update job to API
const updateJobToAPI = async (job: Job): Promise<boolean> => {
  if (useDemoData) {
    // Skip API call if demo mode
    return true;
  }

  try {
    // Use updateEndpoint if provided, otherwise fall back to apiEndpoint
    const endpoint = updateEndpoint || apiEndpoint;
    if (!endpoint) {
      throw new Error('No update endpoint configured. Please set either updateEndpoint or apiEndpoint in config.');
    }

    // Construct full URL based on API mode
    let url = endpoint;
    if (apiMode === 'renderer') {
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
    } else if (apiMode === 'localhost') {
      const baseUrl = import.meta.env.VITE_LOCAL_API_URL;
      url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
    }

    // Construct update URL
    // If updateEndpoint is provided, use it as-is (may or may not need ID in URL)
    // If using apiEndpoint, append ID (RESTful pattern)
    let updateUrl: string;
    if (updateEndpoint) {
      // If updateEndpoint is provided, check if it already contains a placeholder or use as-is
      // Some update endpoints might be like "/api/jobs/update" and expect ID in body
      // Others might be like "/api/jobs/{id}" and need ID replacement
      if (url.includes('{id}') || url.includes(':id')) {
        updateUrl = url.replace('{id}', job.id).replace(':id', job.id);
      } else {
        // Use endpoint as-is (ID will be in payload)
        updateUrl = url;
      }
    } else {
      // Fallback to apiEndpoint with ID appended (RESTful pattern)
      updateUrl = url.endsWith('/') ? `${url}${job.id}` : `${url}/${job.id}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add Bearer token from Supabase session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Add tenant slug if provided (use config or fallback to tenantId from hook)
    const effectiveTenantSlug = tenantSlug || tenantId;
    if (effectiveTenantSlug) {
      headers['X-Tenant-Slug'] = effectiveTenantSlug;
    }

    const apiData = mapJobToApiFormat(job);
    // Include record_id in payload for update (required by backend)
    // The job.id is the backend record ID from the API response
    apiData.id = job.id;
    apiData.record_id = job.id; // Backend requires record_id field for updates
    // Also include ID in data section if backend requires it
    if (!apiData.data.id) {
      apiData.data.id = job.id;
    }
    
    console.log('Updating job with record ID:', job.id);
    console.log('Using tenant slug:', effectiveTenantSlug);
    console.log('Update URL:', updateUrl);
    console.log('Update payload:', apiData);

    const response = await fetch(updateUrl, {
      method: 'PUT', // Use PUT for updates, change to PATCH if your API requires it
      headers,
      body: JSON.stringify(apiData)
    });

    console.log('PUT response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('PUT response text:', responseText);
      throw new Error(`Failed to update job: ${response.status} - ${responseText}`);
    }

    const result = await response.json();
    console.log('Job updated successfully:', result);
    
    return true;
  } catch (err) {
    console.error('Error updating job to API:', err);
    toast.error(`Failed to sync job update to API: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
};

// Update job
const handleUpdateJob = async (updatedJob: Job) => {
  // Update local state first
  setJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
  
  // Try to update to API
  const apiSuccess = await updateJobToAPI(updatedJob);
  
  if (apiSuccess) {
    toast.success('Job updated successfully!');
  } else {
    toast.success('Job updated locally (API sync failed)');
  }
};

// Delete job
const handleDeleteJob = async (jobId: string) => {
  if (!confirm('Are you sure you want to delete this job?')) {
    return;
  }

  // Update local state immediately
    setJobs(prev => prev.filter(job => job.id !== jobId));

  // Delete via API using updateEndpoint (same endpoint as updates, but with DELETE method)
  const endpoint = updateEndpoint || apiEndpoint;
  if (endpoint && !useDemoData) {
    try {
      // Construct full URL based on API mode
      let url = endpoint;
      if (apiMode === 'renderer') {
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
      } else if (apiMode === 'localhost') {
        const baseUrl = import.meta.env.VITE_LOCAL_API_URL;
        url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
      }

      // Construct delete URL with job ID and trailing slash for Django
      const deleteUrl = url.endsWith('/') 
        ? `${url}${jobId}/` 
        : `${url}/${jobId}/`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add Bearer token from Supabase session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Add tenant slug if provided (use config or fallback to tenantId from hook)
      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      console.log('Deleting job:', {
        jobId,
        url: deleteUrl,
        tenantSlug: effectiveTenantSlug
      });

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete response error:', errorText);
        throw new Error(`Failed to delete job: ${response.status} - ${errorText}`);
      }

      console.log('Job deleted successfully');
      toast.success('Job deleted successfully');
    } catch (error) {
      console.error('Error deleting job:', error);
      
      // Revert local state on error - re-fetch jobs
      await fetchJobs();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete job: ${errorMessage}`);
    }
  } else {
    // If no API endpoint or demo mode, just show success
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
  // Pre-populate edit form with job data
  setEditJobData({
    title: job.title,
    description: job.description,
    department: job.department || '',
    location: job.location || '',
    type: job.type || 'full-time',
    deadline: job.deadline || '',
    requireResume: job.requireResume || false,
    salary: job.salary || '',
    criteria: job.criteria || '',
    skills: job.skills || ''
  });
  
  // Extract custom questions from form (skip default ones)
  const customQs = job.form.questions
    .filter(q => !['fullName', 'email', 'phone', 'resume'].includes(q.id))
    .map(q => ({ text: q.title, type: q.type, options: q.options }));
  setEditCustomQuestions(customQs.length > 0 ? customQs : [{ text: '', type: 'textarea' }]);
  
  setIsEditModalOpen(true);
};

// Add question field for edit form
const addEditQuestionField = () => {
  setEditCustomQuestions([...editCustomQuestions, { text: '', type: 'textarea' }]);
};

// Update question text in edit form
const updateEditQuestion = (index: number, value: string) => {
  const updated = [...editCustomQuestions];
  updated[index] = { ...updated[index], text: value };
  setEditCustomQuestions(updated);
};

// Update question type in edit form
const updateEditQuestionType = (index: number, type: QuestionType) => {
  const updated = [...editCustomQuestions];
  const question = updated[index];
  updated[index] = { 
    ...question, 
    type,
    // Initialize options for select/radio/checkbox types
    options: (type === 'select' || type === 'radio' || type === 'checkbox') 
      ? (question.options && question.options.length > 0 ? question.options : ['Option 1', 'Option 2', 'Option 3'])
      : undefined
  };
  setEditCustomQuestions(updated);
};

// Add an option to an edit question
const addEditQuestionOption = (questionIndex: number) => {
  const updated = [...editCustomQuestions];
  const question = updated[questionIndex];
  if (!question.options) {
    question.options = [];
  }
  question.options.push(`Option ${question.options.length + 1}`);
  updated[questionIndex] = { ...question };
  setEditCustomQuestions(updated);
};

// Remove an option from an edit question
const removeEditQuestionOption = (questionIndex: number, optionIndex: number) => {
  const updated = [...editCustomQuestions];
  const question = updated[questionIndex];
  if (question.options && question.options.length > 1) {
    question.options = question.options.filter((_, i) => i !== optionIndex);
    updated[questionIndex] = { ...question };
    setEditCustomQuestions(updated);
  }
};

// Update an option value in edit question
const updateEditQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
  const updated = [...editCustomQuestions];
  const question = updated[questionIndex];
  if (question.options) {
    question.options[optionIndex] = value;
    updated[questionIndex] = { ...question };
    setEditCustomQuestions(updated);
  }
};

// Remove question from edit form
const removeEditQuestionField = (index: number) => {
  if (editCustomQuestions.length > 1) {
    setEditCustomQuestions(editCustomQuestions.filter((_, i) => i !== index));
  }
};

// Save edited job
const handleSaveEditedJob = async () => {
  if (!editingJob) return;

  if (!editJobData.title.trim()) {
    toast.error('Job title is required');
    return;
  }

  // Filter out empty questions
  const validQuestions = editCustomQuestions.filter(q => q.text.trim() !== '');
  
  // Create form questions from custom questions
  const formQuestions: FormQuestion[] = [
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
    ...validQuestions.map((question, index) => {
      const baseQuestion: FormQuestion = {
        id: `custom_${index + 1}`,
        type: question.type,
        title: question.text,
        required: true,
        placeholder: question.type === 'textarea' ? 'Enter your answer here...' : 
                     question.type === 'text' ? 'Enter your answer' :
                     question.type === 'select' ? 'Select an option' :
                     question.type === 'number' ? 'Enter a number' :
                     question.type === 'date' ? 'Select a date' : 'Enter your answer'
      };
      
      // Add options for select, radio, checkbox types from question state
      if (question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') {
        baseQuestion.options = question.options && question.options.length > 0 
          ? question.options 
          : ['Option 1', 'Option 2', 'Option 3'];
      }
      
      return baseQuestion;
    }),
    ...(editJobData.requireResume ? [{
      id: 'resume',
      type: 'file' as QuestionType,
      title: 'Resume/CV',
      description: 'Please upload your resume or CV (PDF, DOC, DOCX)',
      required: true,
      validation: {
        pattern: '\\.(pdf|doc|docx)$'
      }
    }] : [])
  ];

  const customForm: DynamicFormData = {
    id: editingJob.form.id,
    title: `Application for ${editJobData.title}`,
    description: 'Please fill out this application form to apply for this position.',
    questions: formQuestions,
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: true
    }
  };

  const updatedJob: Job = {
    ...editingJob,
    id: editingJob.id, // Preserve the original record ID from backend
    title: editJobData.title,
    description: editJobData.description,
    department: editJobData.department,
    location: editJobData.location,
    type: editJobData.type,
    deadline: editJobData.deadline,
    requireResume: editJobData.requireResume,
    salary: editJobData.salary,
    criteria: editJobData.criteria,
    skills: editJobData.skills,
    form: customForm
  };

  console.log('Saving edited job with record ID:', updatedJob.id);
  await handleUpdateJob(updatedJob);
    setIsEditModalOpen(false);
    setEditingJob(null);
};

// Preview job form
const handlePreviewForm = (job: Job) => {
  setSelectedJob(job);
  setIsPreviewModalOpen(true);
};

const stats = {
  total: jobs.length,
  active: jobs.filter(j => j.status === 'active').length,
  draft: jobs.filter(j => j.status === 'draft').length,
  totalApplications: jobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0)
};

  return {
    addEditQuestionField,
    addEditQuestionOption,
    addQuestionField,
    addQuestionOption,
    apiEndpoint,
    apiMode,
    className,
    customQuestions,
    editCustomQuestions,
    editJobData,
    error,
    handleCreateJob,
    handleDeleteJob,
    handleEditForm,
    handlePreviewForm,
    handleSaveEditedJob,
    isCreateModalOpen,
    isEditModalOpen,
    isPreviewModalOpen,
    jobs,
    layout,
    loading,
    newJobData,
    removeEditQuestionField,
    removeEditQuestionOption,
    removeQuestionField,
    removeQuestionOption,
    selectedJob,
    setEditJobData,
    setEditingJob,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    setIsPreviewModalOpen,
    setNewJobData,
    showCreateButton,
    showStats,
    stats,
    title,
    toggleJobStatus,
    updateEditQuestion,
    updateEditQuestionOption,
    updateEditQuestionType,
    updateQuestion,
    updateQuestionOption,
    updateQuestionType,
    editingJob,
  };
}

export type JobManagerModel = ReturnType<typeof useJobManager>;
