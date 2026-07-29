/** State, effects, and handlers for the applicant table. */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import type {
  ApplicantStage,
  Application,
  Job,
  ApplicantTableConfig,
  ApplicantTableComponentProps,
} from './types';
import { demoJobs, demoApplications } from './utils';

import {
  Search,
  Filter,
  Download,
  Eye,
  Mail,
  Phone,
  Calendar,
  User,
  Briefcase,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';

export function useApplicantTable({
  config = {},
  className = ''
}: ApplicantTableComponentProps) {
  const { tenantId } = useTenant(); // Get tenant ID from hook
  const { session } = useAuth();
  const {
    title = 'Job Applications',
    description = 'Manage and review job applications',
    apiEndpoint,
    apiPrefix = 'localhost',
    statusDataApiEndpoint,
    updateEndpoint,
    useDemoData = false,
    tenantSlug,
    showJobSelector = true,
    showStats = true,
    showFilters = true,
    showSearch = true,
    showExport = true,
    showBulkActions = true,
    showPagination = true,
    pageSize = 10,
    sortable = true,
    showStatusBadges = true,
    showRatings = true,
    showNotes = true,
    showActions = true,
    compactView = false,
    highlightNewApplications = true,
    autoRefresh = false,
    refreshInterval = 30000,
    columns = [],
    dataMapping = {},
    filterOptions = {}
  } = config;

  // Default columns if none configured
  const defaultColumns = [
    { key: 'applicantName', label: 'Applicant', type: 'text' as const, visible: true, sortable: true, accessor: 'applicantName', align: 'left' as const, width: '200px' },
    { key: 'stage', label: 'Stage', type: 'stage' as const, visible: true, sortable: true, accessor: 'stage', align: 'left' as const, width: '150px' },
    { key: 'skills', label: 'Skills', type: 'skills' as const, visible: true, sortable: false, accessor: 'skills', align: 'left' as const, width: '300px' },
    { key: 'experience', label: 'Experience', type: 'text' as const, visible: true, sortable: false, accessor: 'experience', align: 'left' as const, width: '200px' },
    { key: 'college', label: 'College', type: 'text' as const, visible: true, sortable: false, accessor: 'college', align: 'left' as const, width: '200px' }
  ];

  const visibleColumns = (columns && columns.length > 0 ? columns : defaultColumns).filter(col => col.visible !== false);

  // State
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>(demoJobs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Data mapping helper
  const mapApiDataToApplication = (apiData: any): Application => {
    console.log('    📥 Raw applicant data:', apiData);
    
    // Backend returns: { id, entity_type, name, data: {...}, created_at, updated_at }
    // Extract nested data object
    const nestedData = apiData.data || {};
    console.log('    📦 Applicant nested data:', nestedData);
    
    const {
      idField = 'id',
      nameField = 'name',
      emailField = 'email',
      phoneField = 'phone',
      statusField = 'status',
      dateField = 'submittedAt'
    } = dataMapping;

    // Get job title from jobs list if available
    const jobId = String(nestedData.jobId || apiData.jobId || '');
    const job = jobs.find(j => j.id === jobId);

    // Extract stage from nestedData or default to 'Initial'
    const stage: ApplicantStage = nestedData.stage || apiData.stage || 'Initial';

    // Store full data structure including openairesponse
    const fullData = {
      name: nestedData.name || apiData.name,
      email: nestedData.email || apiData.email,
      phone: nestedData.phone || apiData.phone,
      jobId: nestedData.jobId || apiData.jobId,
      salary: nestedData.salary,
      skills: nestedData.skills,
      answers: nestedData.answers || {},
      criteria: nestedData.criteria,
      location: nestedData.location,
      resumeUrl: nestedData.resumeUrl,
      department: nestedData.department,
      submittedAt: nestedData.submittedAt || apiData.created_at,
      openairesponse: (() => {
        if (nestedData.openairesponse) {
          if (typeof nestedData.openairesponse === 'string') {
            try {
              return JSON.parse(nestedData.openairesponse);
            } catch (e) {
              console.warn('Failed to parse openairesponse as JSON:', e);
              return null;
            }
          }
          return nestedData.openairesponse;
        }
        return null;
      })(),
      other_description: nestedData.other_description
    };

    // Extract skills, experience, and college from OpenAI response
    const openaiResponse = fullData.openairesponse;
    let skillsStr = '';
    let experienceStr = '';
    let collegeStr = '';

    if (openaiResponse) {
      // Extract skills
      if (openaiResponse.skills && Array.isArray(openaiResponse.skills)) {
        skillsStr = openaiResponse.skills.join(', ');
      } else if (typeof openaiResponse.skills === 'string') {
        skillsStr = openaiResponse.skills;
      }

      // Extract experience (from experience array)
      if (openaiResponse.experience && Array.isArray(openaiResponse.experience) && openaiResponse.experience.length > 0) {
        const exp = openaiResponse.experience[0];
        experienceStr = exp.position || exp.company || exp.duration || '';
        if (exp.company && exp.position) {
          experienceStr = `${exp.position} at ${exp.company}`;
        }
      } else if (typeof openaiResponse.experience === 'string') {
        experienceStr = openaiResponse.experience;
      }

      // Extract college (from education array)
      if (openaiResponse.education && Array.isArray(openaiResponse.education) && openaiResponse.education.length > 0) {
        const edu = openaiResponse.education[0];
        collegeStr = edu.college || edu.institution || '';
        if (edu.degree) {
          collegeStr = collegeStr ? `${edu.degree} from ${collegeStr}` : edu.degree;
        }
      } else if (typeof openaiResponse.education === 'string') {
        collegeStr = openaiResponse.education;
      }
    }

    return {
      id: apiData[idField] || apiData.id || '',
      jobId: jobId,
      jobTitle: job?.title || nestedData.jobTitle || apiData.jobTitle || `Job ${jobId}` || 'Unknown Position',
      applicantName: nestedData[nameField] || nestedData.name || apiData.name || 'Anonymous',
      applicantEmail: nestedData[emailField] || nestedData.email || apiData.email || '',
      applicantPhone: nestedData[phoneField] || nestedData.phone || apiData.phone || '',
      status: nestedData[statusField] || nestedData.status || apiData.status || 'pending',
      stage: stage,
      submittedAt: nestedData[dateField] || nestedData.submittedAt || apiData.created_at || new Date().toISOString(),
      experience: experienceStr || nestedData.experience || apiData.experience || '',
      location: nestedData.location || apiData.location || '',
      expectedSalary: nestedData.salary || nestedData.expectedSalary || apiData.salary || '',
      noticePeriod: nestedData.noticePeriod || apiData.notice_period || '',
      resumeUrl: nestedData.resumeUrl || apiData.resume_url || '',
      coverLetter: nestedData.coverLetter || apiData.cover_letter || '',
      responses: nestedData.answers || nestedData.responses || apiData.responses || {},
      rating: nestedData.rating || apiData.rating || 0,
      notes: nestedData.notes || apiData.notes || '',
      interviewDate: nestedData.interviewDate || apiData.interview_date || '',
      source: nestedData.source || apiData.source || 'Direct',
      skills: skillsStr,
      college: collegeStr,
      fullData: fullData // Store full data structure
    };
  };

  // API fetching functions
  const fetchApplications = async () => {
    if (!apiEndpoint || useDemoData) {
      // Use demo data if no API endpoint configured or demo mode enabled
      console.log('Using demo data:', useDemoData ? 'Demo mode enabled' : 'No API endpoint configured');
      setApplications(demoApplications);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construct full URL based on API prefix
      let url = apiEndpoint;
      if (apiPrefix === 'renderer') {
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
      } else if (apiPrefix === 'localhost') {
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

      console.log('Fetching applications from:', url);
      console.log('Using tenant slug:', effectiveTenantSlug);
      console.log('Request headers:', headers);

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Get response text to see what was returned
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

      // Handle wrapped response: { data: [...], page_meta: {...} }
      let applicationsData;
      if (Array.isArray(data)) {
        applicationsData = data;
        console.log('  Direct array response');
      } else if (data.data && Array.isArray(data.data)) {
        applicationsData = data.data; // Extract from wrapper
        console.log('  Wrapped response - extracted data array');
        console.log('  Page meta:', data.page_meta);
        console.log('  Total applicants:', data.page_meta?.total_count);
      } else if (data.applications && Array.isArray(data.applications)) {
        applicationsData = data.applications;
        console.log('  Applications array found');
      } else {
        applicationsData = [];
        console.log('  No valid data array found, using empty array');
      }

      console.log('  Number of applicants:', applicationsData.length);
      
      if (!Array.isArray(applicationsData)) {
        console.warn('❌ API response is not an array:', applicationsData);
        throw new Error('API response does not contain a valid applications array');
      }
      
      // Map API data to our Application interface
      const mappedApplications = applicationsData.map(mapApiDataToApplication);
      console.log('✅ Mapped applications:', mappedApplications);
      
      setApplications(mappedApplications);
    } catch (err) {
      console.error('Error fetching applications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      setError(errorMessage);
      
      // Show detailed error for debugging
      if (errorMessage.includes('<!DOCTYPE')) {
        setError('API endpoint returned HTML instead of JSON. Please check:\n1. The endpoint URL is correct\n2. The API server is running\n3. Authentication is not required\n4. CORS is properly configured');
      }
      
      // Fallback to demo data on error
      setApplications(demoApplications);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when API config changes
  useEffect(() => {
    fetchApplications();
  }, [apiEndpoint, apiPrefix]);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchApplications();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, apiEndpoint]);

  // Extract unique jobs from applications whenever applications change
  useEffect(() => {
    if (applications.length > 0) {
      const uniqueJobsMap = new Map<string, Job>();
      applications.forEach(app => {
        if (app.jobId && app.jobTitle && !uniqueJobsMap.has(String(app.jobId))) {
          uniqueJobsMap.set(String(app.jobId), {
            id: String(app.jobId),
            title: app.jobTitle,
            department: app.fullData?.department,
            location: app.location,
            status: 'active' as const
          });
        }
      });
      const extractedJobs = Array.from(uniqueJobsMap.values());
      if (extractedJobs.length > 0) {
        setJobs(extractedJobs);
        console.log('✅ Updated jobs from applications:', extractedJobs);
      }
    }
  }, [applications]);

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    const filtered = applications.filter(app => {
      // Job filter
      if (selectedJobId !== 'all' && String(app.jobId) !== String(selectedJobId)) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!app.applicantName.toLowerCase().includes(searchLower) &&
            !app.applicantEmail.toLowerCase().includes(searchLower) &&
            !app.jobTitle.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Stage filter
      if (stageFilter !== 'all') {
        const appStage = app.stage || 'Initial';
        if (appStage !== stageFilter) return false;
      }
      
      // Experience filter
      if (experienceFilter !== 'all') {
        const exp = parseInt(app.experience || '0');
        switch (experienceFilter) {
          case 'entry': return exp <= 2;
          case 'mid': return exp >= 3 && exp <= 5;
          case 'senior': return exp >= 6;
          default: return true;
        }
      }
      
      
      return true;
    });

    // Sort
    if (sortable) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortField as keyof Application];
        let bVal: any = b[sortField as keyof Application];
        
        if (sortField === 'submittedAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sortField === 'rating') {
          aVal = aVal || 0;
          bVal = bVal || 0;
        }
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [applications, selectedJobId, searchTerm, stageFilter, experienceFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedApplications.length / pageSize);
  const paginatedApplications = showPagination 
    ? filteredAndSortedApplications.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredAndSortedApplications;

  // Statistics
  const stats = useMemo(() => {
    const jobApplications = selectedJobId === 'all' 
      ? applications 
      : applications.filter(app => app.jobId === selectedJobId);
      
    return {
      total: jobApplications.length,
      initial: jobApplications.filter(app => (app.stage || 'Initial') === 'Initial').length,
      assignmentPending: jobApplications.filter(app => app.stage === 'Assignment Pending').length,
      interview: jobApplications.filter(app => app.stage === 'Interview').length,
      hr: jobApplications.filter(app => app.stage === 'HR').length,
      rejected: jobApplications.filter(app => app.stage === 'Rejected').length,
      hire: jobApplications.filter(app => app.stage === 'Hire').length,
    };
  }, [applications, selectedJobId]);

  // Handlers
  const handleSort = (field: string) => {
    if (!sortable) return;
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStatusChange = (applicationId: string, newStatus: Application['status']) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, status: newStatus } : app
    ));
  };

  const handleBulkStatusChange = (newStatus: Application['status']) => {
    setApplications(prev => prev.map(app => 
      selectedApplications.includes(app.id) ? { ...app, status: newStatus } : app
    ));
    setSelectedApplications([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(paginatedApplications.map(app => app.id));
    } else {
      setSelectedApplications([]);
    }
  };

  const handleSelectApplication = (applicationId: string, checked: boolean) => {
    if (checked) {
      setSelectedApplications(prev => [...prev, applicationId]);
    } else {
      setSelectedApplications(prev => prev.filter(id => id !== applicationId));
    }
  };

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
    setIsViewModalOpen(true);
  };

  // Stage management functions
  const getNextStage = (currentStage: ApplicantStage): ApplicantStage | null => {
    const stageOrder: ApplicantStage[] = ['Initial', 'Assignment Pending', 'Interview', 'HR', 'Hire'];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
      return null; // No next stage or already at final stage
    }
    return stageOrder[currentIndex + 1];
  };

  const updateApplicantStage = async (applicationId: string, newStage: ApplicantStage) => {
    // Find the current application to preserve its data
    const currentApp = applications.find(a => a.id === applicationId);
    if (!currentApp) return;

    // Update local state immediately for better UX
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, stage: newStage } : app
    ));

    // Also update selectedApplication if modal is open
    if (selectedApplication?.id === applicationId) {
      setSelectedApplication(prev => prev ? { ...prev, stage: newStage } : null);
    }

    // Update via API if endpoint is configured
    if (updateEndpoint && !useDemoData) {
      try {
        let url = updateEndpoint;
        if (apiPrefix === 'renderer') {
          const baseUrl = import.meta.env.VITE_RENDER_API_URL;
          url = baseUrl ? `${baseUrl}${updateEndpoint}` : updateEndpoint;
        } else if (apiPrefix === 'localhost') {
          const baseUrl = import.meta.env.VITE_LOCAL_API_URL;
          url = baseUrl ? `${baseUrl}${updateEndpoint}` : updateEndpoint;
        }

        // Construct URL with application ID - ensure trailing slash for Django compatibility
        const updateUrl = url.endsWith('/') 
          ? `${url}${applicationId}/` 
          : `${url}/${applicationId}/`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const effectiveTenantSlug = tenantSlug || tenantId;
        if (effectiveTenantSlug) {
          headers['X-Tenant-Slug'] = effectiveTenantSlug;
        }

        // Prepare payload - include record_id if available (for backend compatibility)
        const payload: any = {
          entity_type: 'Applicant', // Required by backend
          stage: newStage,
          data: {
            ...(currentApp.fullData || {}),
            stage: newStage
          }
        };

        // Include record_id if the backend requires it (similar to job updates)
        if (applicationId) {
          payload.id = applicationId;
          payload.record_id = applicationId;
        }

        console.log('Updating applicant stage:', {
          applicationId,
          newStage,
          url: updateUrl,
          payload
        });

        const response = await fetch(updateUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Update response error:', errorText);
          throw new Error(`Failed to update stage: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Stage updated successfully:', result);
        
        // Show success notification
        toast.success(`Applicant stage updated to: ${newStage}`);
      } catch (error) {
        console.error('Error updating stage:', error);
        
        // Revert local state on error
        const previousStage = currentApp.stage || 'Initial';
        setApplications(prev => prev.map(app => 
          app.id === applicationId ? { ...app, stage: previousStage } : app
        ));
        
        // Also revert selectedApplication if modal is open
        if (selectedApplication?.id === applicationId) {
          setSelectedApplication(prev => prev ? { ...prev, stage: previousStage } : null);
        }
        
        // Show error notification
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to update stage: ${errorMessage}`);
      }
    } else {
      // If no API endpoint, just log the local update
      console.log(`Stage updated locally to: ${newStage} (no API endpoint configured)`);
    }
  };

  const handleNextStep = (application: Application) => {
    const currentStage = application.stage || 'Initial';
    const nextStage = getNextStage(currentStage);
    if (nextStage) {
      updateApplicantStage(application.id, nextStage);
    }
  };

  const handleReject = (application: Application) => {
    updateApplicantStage(application.id, 'Rejected');
  };

  const handleExport = () => {
    // In real app, this would export to CSV/Excel
    console.log('Exporting applications...', filteredAndSortedApplications);
  };

  const getStageColor = (stage: ApplicantStage) => {
    switch (stage) {
      case 'Initial': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Assignment Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Interview': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HR': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Hire': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'interviewed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isNewApplication = (submittedAt: string) => {
    if (!highlightNewApplications) return false;
    const submitted = new Date(submittedAt);
    const now = new Date();
    const diffHours = (now.getTime() - submitted.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  // Helper function to render cell content based on column type
  const renderCellContent = (column: any, application: Application) => {
    const fieldValue = (application as any)[column.accessor || column.key];
    
    switch (column.type) {
      case 'text':
        if (column.key === 'applicantName') {
          return (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{application.applicantName}</div>
                {isNewApplication(application.submittedAt) && (
                  <Badge className="bg-blue-100 text-blue-800 text-sm mt-1">New</Badge>
                )}
              </div>
            </div>
          );
        }
        if (column.key === 'skills') {
          if (!application.skills) {
            return <span className="text-sm text-gray-400">Not specified</span>;
          }
          // Split skills by comma and display as chips
          const skillsList = application.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
          return (
            <div className="flex flex-wrap gap-1.5">
              {skillsList.map((skill: string, idx: number) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 border-0"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          );
        }
        if (column.key === 'experience') {
          return (
            <span className="text-sm text-gray-900">
              {application.experience || 'Not specified'}
            </span>
          );
        }
        if (column.key === 'college') {
          return (
            <span className="text-sm text-gray-900">
              {application.college || 'Not specified'}
            </span>
          );
        }
        return <span className="text-sm text-gray-900">{String(fieldValue ?? 'Not specified')}</span>;
        
      case 'email':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-gray-400" />
              <a href={`mailto:${application.applicantEmail}`} className="text-blue-600 hover:underline">
                {application.applicantEmail}
              </a>
            </div>
            {application.applicantPhone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-3 w-3 text-gray-400" />
                {application.applicantPhone}
              </div>
            )}
          </div>
        );
        
      case 'phone':
        return application.applicantPhone ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-3 w-3 text-gray-400" />
            {application.applicantPhone}
          </div>
        ) : <span className="text-sm text-gray-400">Not provided</span>;
        
      case 'skills': {
        if (!application.skills) {
          return <span className="text-sm text-gray-400">Not specified</span>;
        }
        // Split skills by comma and display as chips
        const skillsList = application.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        return (
          <div className="flex flex-wrap gap-1.5">
            {skillsList.map((skill: string, idx: number) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 border-0"
              >
                {skill}
              </Badge>
            ))}
          </div>
        );
      }
        
      case 'stage': {
        const currentStage = application.stage || 'Initial';
        return (
          <Badge className={`${getStageColor(currentStage)} flex items-center gap-1 w-fit`}>
            {currentStage}
          </Badge>
        );
      }
        
      case 'date':
        if (column.format === 'relative-time') {
          // Use relative time format
          const date = new Date(fieldValue as string);
          const now = new Date();
          const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
          if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays} days ago`;
        }
        return (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-3 w-3" />
            {formatDate(fieldValue as string)}
          </div>
        );
        
      case 'number':
        if (column.format === 'currency') {
          return <span className="text-sm text-gray-900">${String(fieldValue ?? '')}</span>;
        }
        return <span className="text-sm text-gray-900">{String(fieldValue ?? '')}</span>;
        
      case 'badge':
        return <Badge variant="outline">{String(fieldValue ?? '')}</Badge>;
        
      case 'boolean':
        return fieldValue ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        );
        
      case 'actions':
        return showActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewApplication(application)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange(application.id, 'shortlisted')}>
                Shortlist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(application.id, 'rejected')}>
                Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null;
        
      default:
        return <span className="text-sm text-gray-900">{fieldValue?.toString() || 'N/A'}</span>;
    }
  };


  return {
    config,
    className,
    tenantId,
    session,
    title,
    description,
    apiEndpoint,
    apiPrefix,
    statusDataApiEndpoint,
    updateEndpoint,
    useDemoData,
    tenantSlug,
    showJobSelector,
    showStats,
    showFilters,
    showSearch,
    showExport,
    showBulkActions,
    showPagination,
    pageSize,
    sortable,
    showStatusBadges,
    showRatings,
    showNotes,
    showActions,
    compactView,
    highlightNewApplications,
    autoRefresh,
    refreshInterval,
    columns,
    dataMapping,
    filterOptions,
    defaultColumns,
    visibleColumns,
    selectedJobId,
    setSelectedJobId,
    applications,
    setApplications,
    jobs,
    setJobs,
    loading,
    setLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    stageFilter,
    setStageFilter,
    experienceFilter,
    setExperienceFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    currentPage,
    setCurrentPage,
    selectedApplications,
    setSelectedApplications,
    isViewModalOpen,
    setIsViewModalOpen,
    selectedApplication,
    setSelectedApplication,
    mapApiDataToApplication,
    fetchApplications,
    filteredAndSortedApplications,
    totalPages,
    paginatedApplications,
    stats,
    handleSort,
    handleStatusChange,
    handleBulkStatusChange,
    handleSelectAll,
    handleSelectApplication,
    handleViewApplication,
    getNextStage,
    updateApplicantStage,
    handleNextStep,
    handleReject,
    handleExport,
    getStageColor,
    getStatusColor,
    getStatusIcon,
    formatDate,
    isNewApplication,
    renderCellContent,
  };
}

export type ApplicantTableModel = ReturnType<typeof useApplicantTable>;
