import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Building, 
  Clock, 
  Users, 
  Briefcase,
  Filter,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicForm, DynamicFormData } from './DynamicForm';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { FileUploadComponent } from './FileUploadComponent';

// Job interface
interface Job {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'draft';
  deadline?: string;
  salary?: string | {
    min?: number;
    max?: number;
    currency?: string;
  };
  requirements?: string[];
  benefits?: string[];
  form: DynamicFormData;
  createdAt: string;
  applicationsCount?: number;
  company?: {
    name: string;
    logo?: string;
    website?: string;
  };
}

interface JobsPageComponentConfig {
  // Basic Settings
  title?: string;
  description?: string;
  
  // API Configuration
  apiEndpoint?: string;
  apiMode?: 'renderer' | 'direct';
  apiBaseUrl?: string; // Full URL prefix for direct mode
  useDemoData?: boolean;
  tenantSlug?: string;
  submitEndpoint?: string; // Endpoint for submitting applications
  fileUploadEndpoint?: string; // Endpoint for uploading files (resumes)
  
  // Display Options
  showFilters?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
  allowApplications?: boolean;
  
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
    salaryField?: string;
    createdAtField?: string;
  };
}

interface JobsPageComponentProps {
  config?: JobsPageComponentConfig;
  className?: string;
}

// Demo data (same as JobsPage but configurable)
const demoJobs: Job[] = [
  {
    id: 'job_1',
    title: 'Senior Frontend Developer',
    description: 'We are looking for an experienced Frontend Developer to join our dynamic team. You will be responsible for building user-facing features using React, TypeScript, and modern web technologies.',
    department: 'Engineering',
    location: 'San Francisco, CA / Remote',
    type: 'full-time',
    status: 'active',
    deadline: '2024-12-31',
    salary: {
      min: 120000,
      max: 180000,
      currency: 'USD'
    },
    requirements: [
      '5+ years of React experience',
      'Strong TypeScript skills',
      'Experience with state management',
      'Knowledge of modern build tools'
    ],
    benefits: [
      'Health, dental, and vision insurance',
      'Flexible work arrangements',
      'Professional development budget',
      'Stock options'
    ],
    form: {
      id: 'form_1',
      title: 'Senior Frontend Developer Application',
      description: 'Please fill out this application to apply for the Senior Frontend Developer position.',
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
          id: 'experience',
          type: 'select',
          title: 'Years of React Experience',
          required: true,
          options: ['3-4 years', '5-7 years', '8-10 years', '10+ years']
        },
        {
          id: 'portfolio',
          type: 'text',
          title: 'Portfolio/GitHub URL',
          required: true,
          placeholder: 'https://github.com/yourname'
        }
      ],
      settings: {
        allowMultipleSubmissions: false,
        showProgressBar: true,
        collectEmail: true
      }
    },
    createdAt: '2024-11-01T10:00:00Z',
    applicationsCount: 24,
    company: {
      name: 'TechCorp Inc.',
      logo: '🚀',
      website: 'https://techcorp.com'
    }
  },
  {
    id: 'job_2',
    title: 'Product Manager',
    description: 'Join our product team to drive the development of innovative features that delight our users.',
    department: 'Product',
    location: 'New York, NY',
    type: 'full-time',
    status: 'active',
    deadline: '2024-12-15',
    salary: {
      min: 130000,
      max: 170000,
      currency: 'USD'
    },
    requirements: [
      '3+ years of product management experience',
      'Experience with agile development',
      'Strong analytical skills',
      'Background in B2B SaaS products'
    ],
    benefits: [
      'Comprehensive health coverage',
      'Equity participation',
      'Learning stipend',
      'Flexible PTO'
    ],
    form: {
      id: 'form_2',
      title: 'Product Manager Application',
      description: 'We\'d love to learn more about your product management experience.',
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
          id: 'experience',
          type: 'select',
          title: 'Years of Product Management Experience',
          required: true,
          options: ['2-3 years', '4-6 years', '7-10 years', '10+ years']
        }
      ],
      settings: {
        allowMultipleSubmissions: false,
        showProgressBar: true,
        collectEmail: true
      }
    },
    createdAt: '2024-10-28T14:30:00Z',
    applicationsCount: 18,
    company: {
      name: 'InnovateLabs',
      logo: '💡',
      website: 'https://innovatelabs.com'
    }
  },
  {
    id: 'job_3',
    title: 'UX/UI Designer',
    description: 'We\'re seeking a talented UX/UI Designer to create intuitive and beautiful user experiences.',
    department: 'Design',
    location: 'Austin, TX / Remote',
    type: 'full-time',
    status: 'active',
    deadline: '2025-01-15',
    salary: {
      min: 90000,
      max: 130000,
      currency: 'USD'
    },
    requirements: [
      '3+ years of UX/UI design experience',
      'Proficiency in Figma and Adobe Creative Suite',
      'Strong portfolio showcasing design process',
      'Experience with user research'
    ],
    benefits: [
      'Creative freedom and autonomy',
      'Top-tier design tools',
      'Conference attendance',
      'Flexible work schedule'
    ],
    form: {
      id: 'form_3',
      title: 'UX/UI Designer Application',
      description: 'Show us your design thinking and creative process.',
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
          id: 'portfolio',
          type: 'text',
          title: 'Portfolio URL',
          required: true,
          placeholder: 'https://yourportfolio.com'
        }
      ],
      settings: {
        allowMultipleSubmissions: false,
        showProgressBar: true,
        collectEmail: true
      }
    },
    createdAt: '2024-11-05T09:15:00Z',
    applicationsCount: 31,
    company: {
      name: 'DesignStudio Pro',
      logo: '🎨',
      website: 'https://designstudiopro.com'
    }
  }
];

export const JobsPageComponent: React.FC<JobsPageComponentProps> = ({
  config = {},
  className = ''
}) => {
  const { tenantId } = useTenant(); // Get tenant ID from hook
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploadResponse, setResumeUploadResponse] = useState<any>(null);

  // Configuration with defaults
  const {
    title = 'Available Positions',
    description = 'Discover exciting opportunities and take the next step in your career',
    apiEndpoint,
    apiMode = 'renderer',
    apiBaseUrl,
    useDemoData = false,
    tenantSlug,
    submitEndpoint = '/crm-records/records/',
    fileUploadEndpoint = '/api/upload/resume',
    showFilters = true,
    showStats = true,
    layout = 'grid',
    maxJobs = 10,
    allowApplications = true,
    dataMapping = {}
  } = config;

  // Data mapping helper
  const mapApiDataToJob = (apiData: any): Job => {
    console.log('    📥 Raw API data:', apiData);
    
    // Backend returns: { id, entity_type, name, data: {...} }
    const jobData = apiData.data || apiData;
    console.log('    📦 Job data (nested):', jobData);
    
    const {
      idField = 'id',
      titleField = 'title',
      descriptionField = 'other_description',
      departmentField = 'department',
      locationField = 'location',
      typeField = 'type',
      statusField = 'status',
      deadlineField = 'deadline',
      salaryField = 'salary',
      createdAtField = 'createdAt'
    } = dataMapping;

    // Extract form questions - prefer full form structure, fallback to simple questions
    let formQuestions: any[] = [];
    
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
      console.log('    ✓ Using full form structure:', formQuestions.length, 'questions with types');
    } else {
      // Fallback: Extract questions from backend format (backward compatibility)
      const backendQuestions = jobData.questions || {};
      console.log('    ❓ Backend questions:', backendQuestions);
      
      formQuestions = Object.entries(backendQuestions).map(([key, questionText]) => {
        const questionStr = String(questionText).toLowerCase();
        // Check if question is about resume/CV upload
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
      
      console.log('    ✓ Converted to form questions:', formQuestions.length, 'questions');
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
          type: 'text',
          title: 'Email Address',
          required: true,
          placeholder: 'your@email.com'
        },
        {
          id: 'resume',
          type: 'file',
          title: 'Resume',
          required: true,
          placeholder: 'Upload your resume'
        }
      );
    }

    const form: DynamicFormData = {
      id: jobData.formId || `form_${apiData.id || Date.now()}`,
      title: jobData.formTitle || `Application for ${jobData.title || apiData.name}`,
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
      status: jobData[statusField] || jobData.status || 'active',
      deadline: jobData[deadlineField] || jobData.deadline || '',
      salary: jobData[salaryField] || jobData.salary || '', // Can be string or object
      requirements: jobData.criteria ? [jobData.criteria] : (jobData.requirements || []),
      benefits: jobData.benefits || [],
      form: form,
      createdAt: jobData[createdAtField] || jobData.createdAt || apiData.created_at || new Date().toISOString(),
      applicationsCount: jobData.applicationsCount || 0,
      company: jobData.company || {
        name: jobData.company_name || 'Company',
        logo: jobData.company_logo,
        website: jobData.company_website
      }
    };
  };

  // API fetching function
  const fetchJobs = async () => {
    if (!apiEndpoint || useDemoData) {
      // Use demo data + localStorage if no API endpoint or demo mode
      console.log('Using demo data:', useDemoData ? 'Demo mode enabled' : 'No API endpoint configured');
      loadLocalJobs();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construct full URL based on API prefix
      let url = apiEndpoint;
      if (apiMode === 'renderer') {
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
      } else if (apiMode === 'direct' && apiBaseUrl) {
        url = `${apiBaseUrl}${apiEndpoint}`;
      }

      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add Bearer token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
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
      console.log('✅ API response data:', data);
      console.log('  Response type:', Array.isArray(data) ? 'Array' : 'Object');
      
      // Handle different response structures
      // Backend returns: { data: [...], page_meta: {...} }
      let jobsData;
      if (Array.isArray(data)) {
        jobsData = data;
      } else if (data.data && Array.isArray(data.data)) {
        jobsData = data.data; // Extract from wrapper
        console.log('  Page meta:', data.page_meta);
      } else {
        jobsData = data.jobs || [];
      }
      
      console.log('  Number of items:', jobsData.length);
      
      if (!Array.isArray(jobsData)) {
        console.warn('API response is not an array:', jobsData);
        throw new Error('API response does not contain a valid jobs array');
      }
      
      console.log('📊 Jobs data to map:', jobsData.length, 'jobs');
      
      // Map API data to our Job interface
      const mappedJobs = jobsData.map((job, index) => {
        console.log(`  Mapping job ${index + 1}:`, job);
        const mapped = mapApiDataToJob(job);
        console.log(`  ✓ Mapped to:`, mapped);
        return mapped;
      });
      console.log('✅ All mapped jobs:', mappedJobs);
      
      // Apply maxJobs limit (show all statuses, not just active)
      // Filter by status can be done by user using the filter UI
      const limitedJobs = mappedJobs.slice(0, maxJobs);
      console.log('📋 Jobs to display:', limitedJobs.length, '(after maxJobs limit)');
      
      setJobs(limitedJobs);
      setFilteredJobs(limitedJobs);
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

  // Load local jobs (demo + localStorage)
  const loadLocalJobs = () => {
    const savedJobs = localStorage.getItem('ats-jobs');
    let allJobs = [...demoJobs];
    
    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        // Only include active jobs from localStorage
        const activeStoredJobs = parsedJobs.filter((job: Job) => job.status === 'active');
        allJobs = [...demoJobs, ...activeStoredJobs];
      } catch (error) {
        console.error('Error loading saved jobs:', error);
      }
    }
    
    // Limit jobs based on maxJobs config
    const limitedJobs = allJobs.slice(0, maxJobs);
    setJobs(limitedJobs);
    setFilteredJobs(limitedJobs);
  };

  // Load jobs on component mount and when API config changes
  useEffect(() => {
    fetchJobs();
  }, [apiEndpoint, apiMode, apiBaseUrl, useDemoData, maxJobs]);

  // Filter jobs based on search and filters
  useEffect(() => {
    let filtered = jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.department?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = locationFilter === 'all' || 
                             job.location?.toLowerCase().includes(locationFilter.toLowerCase());
      
      const matchesType = typeFilter === 'all' || job.type === typeFilter;
      
      const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter;
      
      return matchesSearch && matchesLocation && matchesType && matchesDepartment;
    });
    
    setFilteredJobs(filtered);
  }, [jobs, searchTerm, locationFilter, typeFilter, departmentFilter]);

  // Get unique values for filters
  const locations = Array.from(new Set(jobs.map(job => job.location).filter(Boolean)));
  const departments = Array.from(new Set(jobs.map(job => job.department).filter(Boolean)));

  // Handle job application
  const handleApply = (job: Job) => {
    if (!allowApplications) {
      toast.info('Applications are currently disabled for this component');
      return;
    }
    setSelectedJob(job);
    setFormData({});
    setIsApplicationModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedJob) return;
    
    // Validate required fields
    const requiredQuestions = selectedJob.form.questions.filter(q => q.required);
    const missingFields = requiredQuestions.filter(q => {
      // Check if it's a file field (resume)
      const isFileField = q.type === 'file' || q.title.toLowerCase().includes('resume') || q.title.toLowerCase().includes('cv');
      
      if (isFileField) {
        // For file fields, check if resumeFile is selected
        return !resumeFile;
      } else {
        // For other fields, check formData
        return !formData[q.id] || formData[q.id].toString().trim() === '';
      }
    });
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.title).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // First, upload resume if a file is selected
      let uploadResponse = resumeUploadResponse;
      if (resumeFile && !uploadResponse) {
        try {
          toast.info('Uploading resume...');
          
          // Construct upload URL
          let uploadUrl = fileUploadEndpoint;
          if (apiMode === 'renderer') {
            const baseUrl = import.meta.env.VITE_RENDER_API_URL;
            uploadUrl = baseUrl ? `${baseUrl}${fileUploadEndpoint}` : fileUploadEndpoint;
          } else if (apiMode === 'direct' && apiBaseUrl) {
            uploadUrl = `${apiBaseUrl}${fileUploadEndpoint}`;
          }

          // Prepare FormData for resume upload
          const uploadFormData = new FormData();
          uploadFormData.append('file', resumeFile);
          // Prompt removed - API will handle resume analysis automatically

          // Prepare headers for upload
          const uploadHeaders: HeadersInit = {};
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            uploadHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }
          const effectiveTenantSlug = tenantSlug || tenantId;
          if (effectiveTenantSlug) {
            uploadHeaders['X-Tenant-Slug'] = effectiveTenantSlug;
          }

          // Upload resume
          const uploadResult = await fetch(uploadUrl, {
            method: 'POST',
            headers: uploadHeaders,
            body: uploadFormData,
          });

          if (!uploadResult.ok) {
            const errorText = await uploadResult.text();
            throw new Error(`Resume upload failed: ${uploadResult.status} - ${errorText}`);
          }

          uploadResponse = await uploadResult.json();
          setResumeUploadResponse(uploadResponse);
          console.log('Resume uploaded successfully:', uploadResponse);
          toast.success('Resume uploaded successfully!');
        } catch (uploadError) {
          console.error('Resume upload error:', uploadError);
          toast.error(`Failed to upload resume: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Construct full URL based on API mode
      let url = submitEndpoint;
      if (apiMode === 'renderer') {
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        url = baseUrl ? `${baseUrl}${submitEndpoint}` : submitEndpoint;
      } else if (apiMode === 'direct' && apiBaseUrl) {
        url = `${apiBaseUrl}${submitEndpoint}`;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Bearer token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Add tenant slug if provided (use config or fallback to tenantId from hook)
      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      // Extract name, email, phone from form data (these are not answers)
      // Check both standard IDs and question IDs (q1, q2, q3 might be name/email/phone)
      let applicantName = formData['fullName'] || formData['name'] || '';
      let applicantEmail = formData['email'] || '';
      let applicantPhone = formData['phone'] || '';
      
      // Find questions that are likely name/email/phone based on title
      selectedJob.form.questions.forEach((question) => {
        const questionTitle = question.title.toLowerCase();
        const answer = formData[question.id];
        
        if (answer) {
          if (questionTitle.includes('name') && questionTitle.includes('full')) {
            applicantName = applicantName || String(answer);
          } else if (questionTitle.includes('email')) {
            applicantEmail = applicantEmail || String(answer);
          } else if (questionTitle.includes('phone')) {
            applicantPhone = applicantPhone || String(answer);
          }
        }
      });

      // If still no name, try to extract from any "name" field
      if (!applicantName) {
        applicantName = formData[selectedJob.form.questions[0]?.id] || 'Anonymous';
      }

      // Map remaining questions to answers format (a1, a2, a3...)
      // Skip questions that are name, email, phone, or file uploads
      const answers: Record<string, string> = {};
      let answerIndex = 1;
      let resumeUrl = '';
      
      selectedJob.form.questions.forEach((question) => {
        const questionTitle = question.title.toLowerCase();
        const isNameField = questionTitle.includes('name') && questionTitle.includes('full');
        const isEmailField = questionTitle.includes('email');
        const isPhoneField = questionTitle.includes('phone');
        const isFileField = question.type === 'file' || questionTitle.includes('resume') || questionTitle.includes('cv');
        
        // Extract file URL if it's a file field
        if (isFileField) {
          const fileUrl = formData[question.id];
          if (fileUrl) {
            resumeUrl = fileUrl; // Use the uploaded file URL
          }
        }
        
        // Skip default fields and file uploads, only include custom questions in answers
        if (!isNameField && !isEmailField && !isPhoneField && !isFileField) {
          const answer = formData[question.id];
          if (answer) {
            // Handle checkbox arrays - convert to comma-separated string
            const answerValue = Array.isArray(answer) ? answer.join(', ') : String(answer);
            answers[`a${answerIndex}`] = answerValue;
            answerIndex++;
          }
        }
      });

      // Format application in backend format
      const applicationPayload = {
        entity_type: "Applicant",
        name: applicantName, // Name in main payload
        data: {
          name: applicantName, // Name also in data section
          jobId: selectedJob.id,
          department: selectedJob.department || '',
          salary: typeof selectedJob.salary === 'string' ? selectedJob.salary : '',
          location: selectedJob.location || '',
          criteria: selectedJob.requirements?.join(', ') || '',
          skills: '', // Can be added if needed
          other_description: selectedJob.description || '',
          email: applicantEmail,
          phone: applicantPhone,
          resumeUrl: resumeUrl || uploadResponse?.files?.[0]?.url || uploadResponse?.url || uploadResponse?.fileUrl || formData['resume'] || '', // Use file upload URL or fallback
          openairesponse: uploadResponse?.response || formData['openaiaresponse'] || '', // OpenAI response from resume upload
          answers: answers,
          submittedAt: new Date().toISOString()
        }
      };

      console.log('Submitting application to:', url);
      console.log('Using tenant slug:', effectiveTenantSlug);
      console.log('Application payload:', applicationPayload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(applicationPayload)
      });

      console.log('Application response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Application error response:', errorText);
        throw new Error(`Application submission failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Application submitted successfully:', result);
      
      toast.success('Application submitted successfully! We\'ll be in touch soon.');
      setFormData({});
      setResumeFile(null);
      setResumeUploadResponse(null);
      setIsApplicationModalOpen(false);
      setSelectedJob(null);
      
      // Update application count
      setJobs(prev => prev.map(job => 
        job.id === selectedJob.id 
          ? { ...job, applicationsCount: (job.applicationsCount || 0) + 1 }
          : job
      ));
      
    } catch (error) {
      console.error('Application submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form field based on question type
  const renderFormField = (question: any) => {
    const value = formData[question.id] || '';

    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={question.type}
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
          />
        );

      case 'textarea':
        return (
          <textarea
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black resize-vertical"
          />
        );

      case 'select':
        const selectOptions = question.options && question.options.length > 0 
          ? question.options 
          : ['Option 1', 'Option 2', 'Option 3'];
        return (
          <select
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
          >
            <option value="">Select an option</option>
            {selectOptions.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        const radioOptions = question.options && question.options.length > 0 
          ? question.options 
          : ['Option 1', 'Option 2', 'Option 3'];
        return (
          <div className="space-y-2">
            {radioOptions.map((option: string, index: number) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  required={question.required}
                  className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const checkboxValues = Array.isArray(value) ? value : (value ? [value] : []);
        const checkboxOptions = question.options && question.options.length > 0 
          ? question.options 
          : ['Option 1', 'Option 2', 'Option 3'];
        return (
          <div className="space-y-2">
            {checkboxOptions.map((option: string, index: number) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={option}
                  checked={checkboxValues.includes(option)}
                  onChange={(e) => {
                    const currentValues = checkboxValues;
                    if (e.target.checked) {
                      handleInputChange(question.id, [...currentValues, option]);
                    } else {
                      handleInputChange(question.id, currentValues.filter(v => v !== option));
                    }
                  }}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
          />
        );

      case 'file':
        return (
          <div className="w-full">
            <FileUploadComponent
              title={question.title}
              description={question.description || 'Upload your file here'}
              apiEndpoint={fileUploadEndpoint}
              apiPrefix={apiMode === 'renderer' ? 'renderer' : apiMode === 'direct' ? 'renderer' : 'supabase'}
              acceptedFileTypes={(() => {
                if (question.validation?.pattern) {
                  // Convert regex pattern like '\\.(pdf|doc|docx)$' to '.pdf,.doc,.docx'
                  const pattern = question.validation.pattern;
                  // Remove regex anchors and escape characters
                  const cleaned = pattern
                    .replace(/^\\\./, '.')  // Replace \. with .
                    .replace(/\$/g, '')      // Remove end anchor
                    .replace(/^\^/, '')      // Remove start anchor
                    .replace(/^\./, '')      // Remove leading dot if present
                    .replace(/\(/g, '')      // Remove opening paren
                    .replace(/\)/g, '')      // Remove closing paren
                    .replace(/\|/g, ',')     // Replace | with comma
                    .replace(/\\/g, '');     // Remove any remaining backslashes
                  
                  // Split by comma and add dots back
                  const extensions = cleaned.split(',').map(ext => {
                    const trimmed = ext.trim();
                    return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
                  });
                  
                  return extensions.join(',');
                }
                return '.pdf,.doc,.docx';
              })()}
              maxFileSize={10}
              multiple={false}
              tenantSlug={tenantSlug || tenantId}
              hideUploadButton={true}
              onFileSelected={(file) => {
                setResumeFile(file);
                setResumeUploadResponse(null); // Reset previous upload response
              }}
              className="w-full"
            />
            {value && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ File uploaded: <a href={value} target="_blank" rel="noopener noreferrer" className="underline">{value}</a>
                </p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
          />
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full-time': return 'bg-green-100 text-green-800';
      case 'part-time': return 'bg-blue-100 text-blue-800';
      case 'contract': return 'bg-purple-100 text-purple-800';
      case 'internship': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSalary = (salary?: { min?: number; max?: number; currency?: string } | string) => {
    if (!salary) return null;
    
    // If salary is a string (like "55LPA" from backend), return as-is
    if (typeof salary === 'string') {
      return salary;
    }
    
    // If salary is an object, format it
    const { min, max, currency = 'USD' } = salary;
    
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
    } else if (min) {
      return `$${min.toLocaleString()}+ ${currency}`;
    }
    return null;
  };

  const isDeadlineApproaching = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
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

        {/* Stats */}
        {showStats && (
          <div className="text-center">
            <div className="inline-flex items-center gap-8 text-lg text-gray-600">
              <span className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <span className="font-semibold text-gray-900">{filteredJobs.length}</span> Open Positions
              </span>
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold text-gray-900">{jobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0)}</span> Total Applications
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Search className="h-4 w-4 inline mr-2" />
                  Search Jobs
                </label>
                <Input
                  placeholder="Job title, company, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Location
                </label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    {locations.map(location => (
                      <SelectItem key={location} value={location!}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Job Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Building className="h-4 w-4 inline mr-2" />
                  Department
                </label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map(department => (
                      <SelectItem key={department} value={department!}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Jobs List */}
        <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-6'}>
          {filteredJobs.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16">
                <Briefcase className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">No jobs found</h3>
                <p className="text-gray-600 text-lg">
                  Try adjusting your search criteria or check back later for new opportunities
                </p>
              </div>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-3xl">{job.company?.logo}</span>
                      <div>
                        <h3 className="text-xl font-bold text-black mb-1">{job.title}</h3>
                        <p className="text-gray-600 font-semibold">{job.company?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-4">
                      {job.location && (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                      )}
                      {job.department && (
                        <span className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {job.department}
                        </span>
                      )}
                      {job.deadline && (
                        <span className={`flex items-center gap-2 ${
                          isDeadlineApproaching(job.deadline) ? 'text-red-600' : ''
                        }`}>
                          <Calendar className="h-4 w-4" />
                          Deadline: {new Date(job.deadline).toLocaleDateString()}
                          {isDeadlineApproaching(job.deadline) && (
                            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">Soon</span>
                          )}
                        </span>
                      )}
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {job.applicationsCount || 0} applicants
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-2 mb-4">
                      <span className={`px-4 py-2 rounded-xl text-sm font-medium w-fit ${getTypeColor(job.type!)}`}>
                        {job.type?.replace('-', ' ')}
                      </span>
                      {formatSalary(job.salary) && (
                        <span className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white w-fit">
                          {formatSalary(job.salary)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handleApply(job)} 
                    disabled={!allowApplications}
                    className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold transition-colors"
                  >
                    {allowApplications ? 'Apply Now' : 'View Details'}
                  </Button>
                </div>
              
                <div className="mt-6">
                  <p className="text-gray-700 mb-6 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>
                  
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-sm text-black mb-3">Key Requirements:</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.slice(0, 3).map((req, index) => (
                          <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                            {req}
                          </span>
                        ))}
                        {job.requirements.length > 3 && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                            +{job.requirements.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                    {job.company?.website && (
                      <a
                        href={job.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-black transition-colors font-medium"
                      >
                        Company website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Application Modal */}
      {allowApplications && (
        <Dialog open={isApplicationModalOpen} onOpenChange={(open) => {
          setIsApplicationModalOpen(open);
          if (!open) {
            // Reset form and resume state when modal closes
            setFormData({});
            setResumeFile(null);
            setResumeUploadResponse(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-black">
                Apply for {selectedJob?.title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                <span className="text-lg">{selectedJob?.company?.logo}</span>
                <span className="font-semibold">{selectedJob?.company?.name}</span>
                {selectedJob?.location && (
                  <>
                    <span>•</span>
                    <span>{selectedJob.location}</span>
                  </>
                )}
              </div>
            </DialogHeader>

            {selectedJob && (
              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                {selectedJob.form.questions.map((question) => (
                  <div key={question.id} className="space-y-3">
                    <label 
                      htmlFor={question.id} 
                      className="block text-sm font-semibold text-black"
                    >
                      {question.title}
                      {question.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    
                    {question.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {question.description}
                      </p>
                    )}
                    
                    {renderFormField(question)}
                  </div>
                ))}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsApplicationModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-[140px] px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-semibold"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
