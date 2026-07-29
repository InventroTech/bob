/** State, effects, and handlers for the jobs page. */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DynamicFormData } from '../DynamicForm';
import { FileUploadComponent } from '../FileUploadComponent';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

import type { Job, JobsPageComponentProps } from './types';
import { demoJobs } from './utils';

export function useJobsPage({
  config = {},
  className = ''
}: JobsPageComponentProps) {
  const { tenantId } = useTenant(); // Get tenant ID from hook
  const { session } = useAuth();
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
    const filtered = jobs.filter(job => {
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
    
    // Step 1: Immediately show success and close modal (don't wait for anything)
    toast.success('Application submitted successfully! We\'ll be in touch soon.');
    setFormData({});
    setResumeFile(null);
    setResumeUploadResponse(null);
    setIsApplicationModalOpen(false);
    setSelectedJob(null);
    setIsSubmitting(false);
    
    // Step 2: Process resume upload and application submission in background
    // Capture form data and job before closing modal
    const formDataSnapshot = { ...formData };
    const selectedJobSnapshot = selectedJob;
    
    if (resumeFile && submitEndpoint && fileUploadEndpoint && selectedJobSnapshot) {
      // Use setTimeout to ensure modal closes first, then process in background
      setTimeout(() => {
        processResumeAndSubmitInBackground(formDataSnapshot, selectedJobSnapshot, resumeFile);
      }, 100);
    }
  };

  // Background function to upload resume and submit application
  const processResumeAndSubmitInBackground = async (
    formDataSnapshot: Record<string, any>,
    selectedJobSnapshot: Job,
    resumeFileSnapshot: File
  ) => {
    try {
      console.log('Starting background resume upload and application submission');
      
      // Step 1: Upload resume
      let resumeUrl = '';
      let scanAnalysis: any = null;
      
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
      uploadFormData.append('file', resumeFileSnapshot);

      // Prepare headers for upload
      const uploadHeaders: HeadersInit = {};
      if (session?.access_token) {
        uploadHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        uploadHeaders['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      console.log('Uploading resume in background...');
      
      // Upload resume
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: uploadHeaders,
        body: uploadFormData,
      });

      if (!uploadResult.ok) {
        const errorText = await uploadResult.text();
        console.error('Resume upload failed in background:', errorText);
        return; // Silent fail
      }

      const uploadResponse = await uploadResult.json();
      console.log('Resume uploaded in background:', uploadResponse);
      
      // Extract file URL and scan analysis from response
      resumeUrl = uploadResponse?.files?.[0]?.url || uploadResponse?.url || uploadResponse?.fileUrl || uploadResponse?.file?.url || '';
      const rawScanAnalysis = uploadResponse?.response || uploadResponse?.analysis || uploadResponse?.data?.response;
      
      // Parse if it's a JSON string, otherwise use as-is (already an object)
      if (typeof rawScanAnalysis === 'string') {
        try {
          scanAnalysis = JSON.parse(rawScanAnalysis);
        } catch (e) {
          // If parsing fails, it might be a plain string, use as-is
          scanAnalysis = rawScanAnalysis;
        }
      } else {
        scanAnalysis = rawScanAnalysis;
      }
      
      console.log('Resume URL:', resumeUrl);
      console.log('Scan analysis (parsed):', scanAnalysis);
      console.log('Scan analysis type:', typeof scanAnalysis);

      // Step 2: Submit application with resume data
      // Extract name, email, phone from form data
      let applicantName = formDataSnapshot['fullName'] || formDataSnapshot['name'] || '';
      let applicantEmail = formDataSnapshot['email'] || '';
      let applicantPhone = formDataSnapshot['phone'] || '';
      
      // Find questions that are likely name/email/phone based on title
      selectedJobSnapshot.form.questions.forEach((question) => {
        const questionTitle = question.title.toLowerCase();
        const answer = formDataSnapshot[question.id];
        
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
        applicantName = formDataSnapshot[selectedJobSnapshot.form.questions[0]?.id] || 'Anonymous';
      }

      // Map remaining questions to answers format (a1, a2, a3...)
      const answers: Record<string, string> = {};
      let answerIndex = 1;
      
      selectedJobSnapshot.form.questions.forEach((question) => {
        const questionTitle = question.title.toLowerCase();
        const isNameField = questionTitle.includes('name') && questionTitle.includes('full');
        const isEmailField = questionTitle.includes('email');
        const isPhoneField = questionTitle.includes('phone');
        const isFileField = question.type === 'file' || questionTitle.includes('resume') || questionTitle.includes('cv');
        
        // Skip default fields and file uploads, only include custom questions in answers
        if (!isNameField && !isEmailField && !isPhoneField && !isFileField) {
          const answer = formDataSnapshot[question.id];
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
        name: applicantName,
        data: {
          name: applicantName,
          jobId: selectedJobSnapshot.id,
          department: selectedJobSnapshot.department || '',
          salary: typeof selectedJobSnapshot.salary === 'string' ? selectedJobSnapshot.salary : '',
          location: selectedJobSnapshot.location || '',
          criteria: selectedJobSnapshot.requirements?.join(', ') || '',
          skills: '',
          other_description: selectedJobSnapshot.description || '',
          email: applicantEmail,
          phone: applicantPhone,
          resumeUrl: resumeUrl || '',
          openairesponse: scanAnalysis || null, // Store as JSON object, not string
          answers: answers,
          submittedAt: new Date().toISOString()
        }
      };

      // Construct submit URL
      let submitUrl = submitEndpoint;
      if (apiMode === 'renderer') {
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        submitUrl = baseUrl ? `${baseUrl}${submitEndpoint}` : submitEndpoint;
      } else if (apiMode === 'direct' && apiBaseUrl) {
        submitUrl = `${apiBaseUrl}${submitEndpoint}`;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      console.log('Submitting application in background:', submitUrl);
      console.log('Application payload:', applicationPayload);
      
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(applicationPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Application submission failed in background:', errorText);
        return; // Silent fail
      }

      const result = await response.json();
      console.log('Application submitted successfully in background:', result);
      
      // Update application count
      setJobs(prev => prev.map(job => 
        job.id === selectedJobSnapshot.id 
          ? { ...job, applicationsCount: (job.applicationsCount || 0) + 1 }
          : job
      ));
      
    } catch (error) {
      // Silent fail - don't show error to user since it's background process
      console.error('Background resume upload and submission error:', error);
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

      case 'select': {
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
      }

      case 'radio': {
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
      }

      case 'checkbox': {
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
      }

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
              apiPrefix={apiMode === 'renderer' ? 'renderer' : apiMode === 'direct' ? 'renderer' : 'localhost'}
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
                  const extensions = cleaned.split(',').map((ext: string) => {
                    const trimmed = ext.trim();
                    return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
                  });
                  
                  return extensions.join(',');
                }
                return '.pdf,.doc,.docx';
              })()}
              maxFileSize={10}
              multiple={false}
              tenantSlug={tenantSlug || tenantId || undefined}
              hideUploadButton={true}
              onFileSelected={(file: File | null) => {
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


  return {
    config,
    className,
    tenantId,
    session,
    jobs,
    setJobs,
    filteredJobs,
    setFilteredJobs,
    loading,
    setLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    typeFilter,
    setTypeFilter,
    departmentFilter,
    setDepartmentFilter,
    selectedJob,
    setSelectedJob,
    isApplicationModalOpen,
    setIsApplicationModalOpen,
    formData,
    setFormData,
    isSubmitting,
    setIsSubmitting,
    resumeFile,
    setResumeFile,
    resumeUploadResponse,
    setResumeUploadResponse,
    title,
    description,
    apiEndpoint,
    apiMode,
    apiBaseUrl,
    useDemoData,
    tenantSlug,
    submitEndpoint,
    fileUploadEndpoint,
    showFilters,
    showStats,
    layout,
    maxJobs,
    allowApplications,
    dataMapping,
    mapApiDataToJob,
    fetchJobs,
    loadLocalJobs,
    locations,
    departments,
    handleApply,
    handleInputChange,
    handleSubmit,
    processResumeAndSubmitInBackground,
    renderFormField,
    getTypeColor,
    formatSalary,
    isDeadlineApproaching,
  };
}

export type JobsPageModel = ReturnType<typeof useJobsPage>;
