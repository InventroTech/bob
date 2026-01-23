import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
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
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicForm, DynamicFormData, FormQuestion, QUESTION_TYPES, QuestionType } from './DynamicForm';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

// Question with answer type interface
interface QuestionWithType {
  text: string;
  type: QuestionType;
  options?: string[]; // Options for select, radio, checkbox types
}

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
  salary?: string; // e.g., "55LPA" or "120000-150000 USD"
  criteria?: string; // e.g., "2-3 Years of Experience"
  skills?: string; // e.g., "HTML, C++, DSA"
  form: DynamicFormData;
  createdAt: string;
  applicationsCount?: number;
}

interface JobManagerComponentConfig {
  // Basic Settings
  title?: string;
  showCreateButton?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
  
  // API Configuration
  apiEndpoint?: string;
  updateEndpoint?: string; // Separate endpoint for updates (optional, falls back to apiEndpoint)
  deleteEndpoint?: string; // Separate endpoint for deletes (optional, falls back to apiEndpoint)
  apiMode?: 'localhost' | 'renderer';
  useDemoData?: boolean;
  tenantSlug?: string;
  
  // Data Mapping
  dataMapping?: {
    idField?: string;
    titleField?: string;
    descriptionField?: string;
    departmentField?: string;
    locationField?: string;
    typeField?: string;
    statusField?: string;
    deadlineField?: string;
    createdAtField?: string;
  };
}

interface JobManagerComponentProps {
  config?: JobManagerComponentConfig;
  className?: string;
}

export const JobManagerComponent: React.FC<JobManagerComponentProps> = ({
  config = {},
  className = ''
}) => {
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

      let headers: Record<string, string> = {
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

      let headers: Record<string, string> = {
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

      let headers: Record<string, string> = {
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

        let headers: Record<string, string> = {
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
            <h3 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <Briefcase className="h-8 w-8" />
              {title}
            </h3>
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
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
                    <Label htmlFor="salary" className="text-sm font-medium text-gray-700">Salary</Label>
                    <Input
                      id="salary"
                      value={newJobData.salary}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, salary: e.target.value }))}
                      placeholder="55LPA or 120000-150000 USD"
                      className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="criteria" className="text-sm font-medium text-gray-700">Criteria</Label>
                    <Input
                      id="criteria"
                      value={newJobData.criteria}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, criteria: e.target.value }))}
                      placeholder="2-3 Years of Experience"
                      className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="skills" className="text-sm font-medium text-gray-700">Required Skills</Label>
                  <Input
                    id="skills"
                    value={newJobData.skills}
                    onChange={(e) => setNewJobData(prev => ({ ...prev, skills: e.target.value }))}
                    placeholder="HTML, C++, DSA"
                    className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
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

                {/* Custom Questions Section */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Application Questions</Label>
                      <p className="text-xs text-gray-500 mt-1">Add custom questions for applicants</p>
                    </div>
                    <CustomButton
                      type="button"
                      size="sm"
                      icon={<Plus className="h-4 w-4" />}
                      onClick={addQuestionField}
                      className="bg-gray-900 text-white hover:bg-gray-800"
                    >
                      Add Question
                    </CustomButton>
                  </div>

                  <div className="space-y-4">
                    {customQuestions.map((question, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Label htmlFor={`question-${index}`} className="text-xs text-gray-600">
                              Question {index + 1}
                            </Label>
                            <Input
                              id={`question-${index}`}
                              value={question.text}
                              onChange={(e) => updateQuestion(index, e.target.value)}
                              placeholder={`e.g., What programming languages are you comfortable with?`}
                              className="mt-1 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-600 opacity-0">Type</Label>
                            <Select
                              value={question.type}
                              onValueChange={(value: QuestionType) => updateQuestionType(index, value)}
                            >
                              <SelectTrigger className="w-[140px] h-9 border-gray-300 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short Text</SelectItem>
                                <SelectItem value="textarea">Long Text</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                                <SelectItem value="radio">Multiple Choice</SelectItem>
                                <SelectItem value="checkbox">Checkboxes</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <CustomButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => removeQuestionField(index)}
                            disabled={customQuestions.length === 1}
                            className="mt-6 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          />
                        </div>
                        
                        {/* Options Configuration for select/radio/checkbox */}
                        {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-medium text-gray-700">Options</Label>
                              <CustomButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                icon={<Plus className="h-3 w-3" />}
                                onClick={() => addQuestionOption(index)}
                                className="h-7 text-xs text-gray-600 hover:text-gray-900"
                              >
                                Add Option
                              </CustomButton>
                            </div>
                            <div className="space-y-2">
                              {question.options?.map((option, optIndex) => (
                                <div key={optIndex} className="flex gap-2 items-center">
                                  <Input
                                    value={option}
                                    onChange={(e) => updateQuestionOption(index, optIndex, e.target.value)}
                                    placeholder={`Option ${optIndex + 1}`}
                                    className="h-8 text-xs border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                  />
                                  <CustomButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    icon={<Trash2 className="h-3 w-3" />}
                                    onClick={() => removeQuestionOption(index, optIndex)}
                                    disabled={question.options && question.options.length <= 1}
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    💡 Default questions (Name, Email, Phone) are automatically included
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <CustomButton 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton 
                    onClick={handleCreateJob}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-semibold"
                  >
                    Create Job
                  </CustomButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">Loading jobs...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 mb-2">API Error</h4>
                <div className="text-red-700 text-sm whitespace-pre-line">{error}</div>
                {apiEndpoint && (
                  <div className="mt-3 p-3 bg-red-100 rounded border text-xs">
                    <strong>Debug Info:</strong><br />
                    Endpoint: <code className="bg-red-200 px-1 rounded">{apiEndpoint}</code><br />
                    API Mode: <code className="bg-red-200 px-1 rounded">{apiMode}</code><br />
                    <br />
                    <strong>Common Solutions:</strong><br />
                    • Check if the API endpoint exists and is accessible<br />
                    • Verify the API server is running<br />
                    • Ensure CORS is configured for your domain<br />
                    • Check if authentication headers are required<br />
                    • Verify the endpoint returns JSON, not HTML
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Jobs List */}
        {!loading && jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16">
            <Briefcase className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No jobs created yet</h3>
            <p className="text-gray-600 text-lg mb-8">
              Create your first job posting with a custom application form
            </p>
            {showCreateButton && (
              <CustomButton 
                onClick={() => setIsCreateModalOpen(true)}
                icon={<Plus className="h-5 w-5" />}
                className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold"
              >
                Create Your First Job
              </CustomButton>
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
                    <CustomButton
                      variant="outline"
                      size="sm"
                      icon={<Edit className="h-4 w-4" />}
                      onClick={() => handleEditForm(job)}
                      className="flex-1 border-gray-300 text-black hover:bg-gray-50"
                    >
                      Edit Job
                    </CustomButton>
                    
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => handlePreviewForm(job)}
                      className="text-gray-600 hover:text-black hover:bg-gray-100"
                    />
                    
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      icon={<Settings className="h-4 w-4" />}
                      onClick={() => toggleJobStatus(job.id)}
                      className="text-gray-600 hover:text-black hover:bg-gray-100"
                    />
                    
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

      {/* Edit Job Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Edit Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="editJobTitle" className="text-sm font-medium text-gray-700">Job Title *</Label>
              <Input
                id="editJobTitle"
                value={editJobData.title}
                onChange={(e) => setEditJobData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Frontend Developer"
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <div>
              <Label htmlFor="editJobDescription" className="text-sm font-medium text-gray-700">Job Description</Label>
              <Textarea
                id="editJobDescription"
                value={editJobData.description}
                onChange={(e) => setEditJobData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role and responsibilities..."
                rows={3}
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editDepartment" className="text-sm font-medium text-gray-700">Department</Label>
                <Input
                  id="editDepartment"
                  value={editJobData.department}
                  onChange={(e) => setEditJobData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Engineering"
                  className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
              
              <div>
                <Label htmlFor="editLocation" className="text-sm font-medium text-gray-700">Location</Label>
                <Input
                  id="editLocation"
                  value={editJobData.location}
                  onChange={(e) => setEditJobData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Remote / NYC"
                  className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editSalary" className="text-sm font-medium text-gray-700">Salary</Label>
                <Input
                  id="editSalary"
                  value={editJobData.salary}
                  onChange={(e) => setEditJobData(prev => ({ ...prev, salary: e.target.value }))}
                  placeholder="55LPA or 120000-150000 USD"
                  className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
              
              <div>
                <Label htmlFor="editCriteria" className="text-sm font-medium text-gray-700">Criteria</Label>
                <Input
                  id="editCriteria"
                  value={editJobData.criteria}
                  onChange={(e) => setEditJobData(prev => ({ ...prev, criteria: e.target.value }))}
                  placeholder="2-3 Years of Experience"
                  className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editSkills" className="text-sm font-medium text-gray-700">Required Skills</Label>
              <Input
                id="editSkills"
                value={editJobData.skills}
                onChange={(e) => setEditJobData(prev => ({ ...prev, skills: e.target.value }))}
                placeholder="HTML, C++, DSA"
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editJobType" className="text-sm font-medium text-gray-700">Job Type</Label>
                <Select
                  value={editJobData.type}
                  onValueChange={(value: any) => setEditJobData(prev => ({ ...prev, type: value }))}
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
                <Label htmlFor="editDeadline" className="text-sm font-medium text-gray-700">Application Deadline</Label>
                <Input
                  id="editDeadline"
                  type="date"
                  value={editJobData.deadline}
                  onChange={(e) => setEditJobData(prev => ({ ...prev, deadline: e.target.value }))}
                  className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="editRequireResume" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editRequireResume"
                  checked={editJobData.requireResume || false}
                  onChange={(e) => setEditJobData(prev => ({ ...prev, requireResume: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Require Resume Upload
              </Label>
              <p className="text-xs text-gray-500 mt-1">Applicants will be required to upload their resume</p>
            </div>

            {/* Custom Questions Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Application Questions</Label>
                  <p className="text-xs text-gray-500 mt-1">Add custom questions for applicants</p>
                </div>
                <CustomButton
                  type="button"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={addEditQuestionField}
                  className="bg-gray-900 text-white hover:bg-gray-800"
                >
                  Add Question
                </CustomButton>
              </div>

              <div className="space-y-4">
                {editCustomQuestions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Label htmlFor={`edit-question-${index}`} className="text-xs text-gray-600">
                          Question {index + 1}
                        </Label>
                        <Input
                          id={`edit-question-${index}`}
                          value={question.text}
                          onChange={(e) => updateEditQuestion(index, e.target.value)}
                          placeholder={`e.g., What programming languages are you comfortable with?`}
                          className="mt-1 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-gray-600 opacity-0">Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value: QuestionType) => updateEditQuestionType(index, value)}
                        >
                          <SelectTrigger className="w-[140px] h-9 border-gray-300 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Short Text</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="radio">Multiple Choice</SelectItem>
                            <SelectItem value="checkbox">Checkboxes</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <CustomButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => removeEditQuestionField(index)}
                        disabled={editCustomQuestions.length === 1}
                        className="mt-6 text-gray-500 hover:text-red-600 hover:bg-red-50"
                      />
                    </div>
                    
                    {/* Options Configuration for select/radio/checkbox */}
                    {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-medium text-gray-700">Options</Label>
                          <CustomButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={<Plus className="h-3 w-3" />}
                            onClick={() => addEditQuestionOption(index)}
                            className="h-7 text-xs text-gray-600 hover:text-gray-900"
                          >
                            Add Option
                          </CustomButton>
                        </div>
                        <div className="space-y-2">
                          {question.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2 items-center">
                              <Input
                                value={option}
                                onChange={(e) => updateEditQuestionOption(index, optIndex, e.target.value)}
                                placeholder={`Option ${optIndex + 1}`}
                                className="h-8 text-xs border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                              />
                              <CustomButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 className="h-3 w-3" />}
                                onClick={() => removeEditQuestionOption(index, optIndex)}
                                disabled={question.options && question.options.length <= 1}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                💡 Default questions (Name, Email, Phone) are automatically included
              </p>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <CustomButton
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingJob(null);
                }}
                className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="button"
                onClick={handleSaveEditedJob}
                className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-semibold"
              >
                Save Changes
              </CustomButton>
            </div>
          </div>
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
