import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
} from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'shortlisted' | 'accepted' | 'rejected';
  submittedAt: string;
  experience?: string;
  location?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  resumeUrl?: string;
  coverLetter?: string;
  responses: Record<string, any>;
  rating?: number;
  notes?: string;
  interviewDate?: string;
  source?: string;
}

export interface Job {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'draft';
}

export interface ApplicantTableConfig {
  // Basic Settings
  title?: string;
  description?: string;
  
  // API Configuration
  apiEndpoint?: string;
  apiPrefix?: 'supabase' | 'renderer';
  statusDataApiEndpoint?: string;
  useDemoData?: boolean; // Force use demo data instead of API
  
  // Display Options
  showJobSelector?: boolean;
  showStats?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  showExport?: boolean;
  showBulkActions?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  showStatusBadges?: boolean;
  showRatings?: boolean;
  showNotes?: boolean;
  showActions?: boolean;
  compactView?: boolean;
  highlightNewApplications?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  
  // Column Configuration
  columns?: Array<{
    key: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'status' | 'date' | 'number' | 'rating' | 'actions' | 'badge' | 'boolean';
    accessor?: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    visible?: boolean;
    format?: 'currency' | 'percentage' | 'date' | 'datetime' | 'relative-time';
    statusColors?: Record<string, string>;
  }>;
  
  // Advanced Configuration
  customFields?: Record<string, any>;
  filterOptions?: {
    statusOptions?: Array<{ value: string; label: string; color?: string }>;
    experienceOptions?: Array<{ value: string; label: string }>;
    locationOptions?: Array<{ value: string; label: string }>;
    customFilters?: Array<{
      key: string;
      label: string;
      type: 'select' | 'multiselect' | 'date-range' | 'text';
      options?: Array<{ value: string; label: string }>;
    }>;
  };
  
  // Data Transformation
  dataMapping?: {
    idField?: string;
    nameField?: string;
    emailField?: string;
    phoneField?: string;
    statusField?: string;
    dateField?: string;
    customMappings?: Record<string, string>;
  };
}

interface ApplicantTableComponentProps {
  config?: ApplicantTableConfig;
  className?: string;
}

// Demo data
const demoJobs: Job[] = [
  { id: '1', title: 'Senior Frontend Developer', department: 'Engineering', location: 'Remote', type: 'full-time', status: 'active' },
  { id: '2', title: 'Product Manager', department: 'Product', location: 'New York', type: 'full-time', status: 'active' },
  { id: '3', title: 'UX Designer', department: 'Design', location: 'San Francisco', type: 'full-time', status: 'active' },
  { id: '4', title: 'Data Analyst', department: 'Analytics', location: 'Remote', type: 'contract', status: 'active' },
  { id: '5', title: 'Marketing Intern', department: 'Marketing', location: 'Chicago', type: 'internship', status: 'active' },
];

const demoApplications: Application[] = [
  {
    id: '1',
    jobId: '1',
    jobTitle: 'Senior Frontend Developer',
    applicantName: 'Sarah Johnson',
    applicantEmail: 'sarah.johnson@email.com',
    applicantPhone: '+1-555-0123',
    status: 'reviewing',
    submittedAt: '2024-01-15T10:30:00Z',
    experience: '5 years',
    location: 'New York, NY',
    expectedSalary: '$120,000',
    noticePeriod: '2 weeks',
    rating: 4,
    source: 'LinkedIn',
    resumeUrl: 'https://example.com/resume-sarah-johnson.pdf',
    coverLetter: 'Dear Hiring Manager,\n\nI am excited to apply for the Senior Frontend Developer position at your company. With 5 years of experience in React, TypeScript, and Node.js, I have successfully delivered multiple high-impact projects that have improved user engagement and business metrics.\n\nIn my current role, I led the development of a customer dashboard that increased user retention by 25%. I am passionate about creating intuitive user experiences and writing clean, maintainable code.\n\nI would love to discuss how my skills and experience can contribute to your team.\n\nBest regards,\nSarah Johnson',
    responses: { skills: 'React, TypeScript, Node.js', portfolio: 'https://sarahjohnson.dev' }
  },
  {
    id: '2',
    jobId: '1',
    jobTitle: 'Senior Frontend Developer',
    applicantName: 'Michael Chen',
    applicantEmail: 'michael.chen@email.com',
    applicantPhone: '+1-555-0124',
    status: 'interviewed',
    submittedAt: '2024-01-14T14:20:00Z',
    experience: '7 years',
    location: 'San Francisco, CA',
    expectedSalary: '$140,000',
    noticePeriod: '1 month',
    rating: 5,
    interviewDate: '2024-01-20T15:00:00Z',
    source: 'Company Website',
    resumeUrl: 'https://example.com/resume-michael-chen.pdf',
    coverLetter: 'Hello,\n\nI am writing to express my strong interest in the Senior Frontend Developer role. With 7 years of experience building scalable web applications, I have developed expertise in React, Vue.js, and Python.\n\nI have led cross-functional teams and mentored junior developers while maintaining high code quality standards. My recent project involved architecting a microservices-based frontend that serves over 1 million users daily.\n\nI am excited about the opportunity to contribute to your innovative team.\n\nThank you for your consideration,\nMichael Chen',
    responses: { skills: 'React, Vue.js, Python', portfolio: 'https://michaelchen.io' }
  },
  {
    id: '3',
    jobId: '2',
    jobTitle: 'Product Manager',
    applicantName: 'Emily Rodriguez',
    applicantEmail: 'emily.rodriguez@email.com',
    applicantPhone: '+1-555-0125',
    status: 'shortlisted',
    submittedAt: '2024-01-13T09:15:00Z',
    experience: '6 years',
    location: 'Austin, TX',
    expectedSalary: '$130,000',
    noticePeriod: '3 weeks',
    rating: 4,
    source: 'Referral',
    responses: { experience: 'Led 3 product launches', tools: 'Jira, Figma, Analytics' }
  },
  {
    id: '4',
    jobId: '1',
    jobTitle: 'Senior Frontend Developer',
    applicantName: 'David Kim',
    applicantEmail: 'david.kim@email.com',
    status: 'pending',
    submittedAt: '2024-01-16T16:45:00Z',
    experience: '3 years',
    location: 'Seattle, WA',
    expectedSalary: '$100,000',
    noticePeriod: 'Immediate',
    source: 'Indeed',
    responses: { skills: 'React, JavaScript, CSS', github: 'https://github.com/davidkim' }
  },
  {
    id: '5',
    jobId: '3',
    jobTitle: 'UX Designer',
    applicantName: 'Lisa Wang',
    applicantEmail: 'lisa.wang@email.com',
    applicantPhone: '+1-555-0127',
    status: 'accepted',
    submittedAt: '2024-01-12T11:30:00Z',
    experience: '4 years',
    location: 'Los Angeles, CA',
    expectedSalary: '$95,000',
    noticePeriod: '2 weeks',
    rating: 5,
    source: 'Dribbble',
    responses: { portfolio: 'https://lisawang.design', tools: 'Figma, Sketch, Principle' }
  },
  {
    id: '6',
    jobId: '2',
    jobTitle: 'Product Manager',
    applicantName: 'James Wilson',
    applicantEmail: 'james.wilson@email.com',
    status: 'rejected',
    submittedAt: '2024-01-11T13:20:00Z',
    experience: '2 years',
    location: 'Boston, MA',
    expectedSalary: '$110,000',
    noticePeriod: '1 month',
    rating: 2,
    source: 'LinkedIn',
    responses: { experience: 'Junior PM at startup', education: 'MBA from Harvard' }
  }
];

export const ApplicantTableComponent: React.FC<ApplicantTableComponentProps> = ({
  config = {},
  className = ''
}) => {
  const {
    title = 'Job Applications',
    description = 'Manage and review job applications',
    apiEndpoint,
    apiPrefix = 'supabase',
    statusDataApiEndpoint,
    useDemoData = false,
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
    { key: 'applicantName', label: 'Applicant', type: 'text' as const, visible: true, sortable: true },
    { key: 'applicantEmail', label: 'Contact', type: 'email' as const, visible: true, sortable: false },
    { key: 'status', label: 'Status', type: 'status' as const, visible: true, sortable: true },
    { key: 'submittedAt', label: 'Applied', type: 'date' as const, visible: true, sortable: true },
    { key: 'experience', label: 'Experience', type: 'text' as const, visible: true, sortable: true },
    { key: 'location', label: 'Location', type: 'text' as const, visible: true, sortable: false },
    { key: 'expectedSalary', label: 'Expected Salary', type: 'text' as const, visible: true, sortable: false },
    { key: 'rating', label: 'Rating', type: 'rating' as const, visible: true, sortable: true },
    { key: 'actions', label: 'Actions', type: 'actions' as const, visible: true, sortable: false }
  ];

  const visibleColumns = (columns && columns.length > 0 ? columns : defaultColumns).filter(col => col.visible !== false);

  // State
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>(demoJobs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Data mapping helper
  const mapApiDataToApplication = (apiData: any): Application => {
    const {
      idField = 'id',
      nameField = 'applicantName',
      emailField = 'applicantEmail',
      phoneField = 'applicantPhone',
      statusField = 'status',
      dateField = 'submittedAt'
    } = dataMapping;

    return {
      id: apiData[idField] || apiData.id || '',
      jobId: apiData.jobId || apiData.job_id || '',
      jobTitle: apiData.jobTitle || apiData.job_title || '',
      applicantName: apiData[nameField] || apiData.applicantName || apiData.name || '',
      applicantEmail: apiData[emailField] || apiData.applicantEmail || apiData.email || '',
      applicantPhone: apiData[phoneField] || apiData.applicantPhone || apiData.phone,
      status: apiData[statusField] || apiData.status || 'pending',
      submittedAt: apiData[dateField] || apiData.submittedAt || apiData.created_at || new Date().toISOString(),
      experience: apiData.experience || apiData.years_experience,
      location: apiData.location || apiData.city,
      expectedSalary: apiData.expectedSalary || apiData.expected_salary,
      noticePeriod: apiData.noticePeriod || apiData.notice_period,
      resumeUrl: apiData.resumeUrl || apiData.resume_url,
      coverLetter: apiData.coverLetter || apiData.cover_letter,
      responses: apiData.responses || apiData.form_responses || {},
      rating: apiData.rating || apiData.score,
      notes: apiData.notes || apiData.internal_notes,
      interviewDate: apiData.interviewDate || apiData.interview_date,
      source: apiData.source || apiData.application_source
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
      let url = apiEndpoint;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add API prefix specific logic
      if (apiPrefix === 'renderer') {
        // Add renderer-specific headers if needed
        headers['X-API-Source'] = 'renderer';
      }

      console.log('Fetching applications from:', url);
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
      console.log('API response data:', data);
      
      // Handle different response structures
      const applicationsData = Array.isArray(data) ? data : (data.data || data.applications || []);
      
      if (!Array.isArray(applicationsData)) {
        console.warn('API response is not an array:', applicationsData);
        throw new Error('API response does not contain a valid applications array');
      }
      
      // Map API data to our Application interface
      const mappedApplications = applicationsData.map(mapApiDataToApplication);
      console.log('Mapped applications:', mappedApplications);
      
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

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let filtered = applications.filter(app => {
      // Job filter
      if (selectedJobId !== 'all' && app.jobId !== selectedJobId) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!app.applicantName.toLowerCase().includes(searchLower) &&
            !app.applicantEmail.toLowerCase().includes(searchLower) &&
            !app.jobTitle.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      
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
      
      // Location filter
      if (locationFilter !== 'all') {
        if (locationFilter === 'remote' && !app.location?.toLowerCase().includes('remote')) return false;
        if (locationFilter !== 'remote' && app.location !== locationFilter) return false;
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
  }, [applications, selectedJobId, searchTerm, statusFilter, experienceFilter, locationFilter, sortField, sortDirection]);

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
      pending: jobApplications.filter(app => app.status === 'pending').length,
      reviewing: jobApplications.filter(app => app.status === 'reviewing').length,
      interviewed: jobApplications.filter(app => app.status === 'interviewed').length,
      shortlisted: jobApplications.filter(app => app.status === 'shortlisted').length,
      accepted: jobApplications.filter(app => app.status === 'accepted').length,
      rejected: jobApplications.filter(app => app.status === 'rejected').length,
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

  const handleExport = () => {
    // In real app, this would export to CSV/Excel
    console.log('Exporting applications...', filteredAndSortedApplications);
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
    const fieldValue = application[column.accessor || column.key as keyof Application];
    
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
                <div className="text-sm text-gray-600">{application.jobTitle}</div>
              </div>
              {isNewApplication(application.submittedAt) && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">New</Badge>
              )}
            </div>
          );
        }
        return <span className="text-sm text-gray-900">{fieldValue || 'Not specified'}</span>;
        
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
        
      case 'status':
        return showStatusBadges ? (
          <Badge className={`${getStatusColor(application.status)} flex items-center gap-1 w-fit`}>
            {getStatusIcon(application.status)}
            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
          </Badge>
        ) : (
          <Select
            value={application.status}
            onValueChange={(value) => handleStatusChange(application.id, value as Application['status'])}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="interviewed">Interviewed</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        );
        
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
        
      case 'rating':
        return showRatings && application.rating ? (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full ${
                  i < application.rating! ? 'bg-yellow-400' : 'bg-gray-200'
                }`}
              />
            ))}
            <span className="ml-2 text-sm text-gray-600">({application.rating}/5)</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Not rated</span>
        );
        
      case 'number':
        if (column.format === 'currency') {
          return <span className="text-sm text-gray-900">${fieldValue}</span>;
        }
        return <span className="text-sm text-gray-900">{fieldValue}</span>;
        
      case 'badge':
        return <Badge variant="outline">{fieldValue}</Badge>;
        
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

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="space-y-8 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8" />
              {title}
            </h2>
            <p className="text-xl text-gray-600 mt-2">{description}</p>
          </div>
          
          {showExport && (
            <Button 
              onClick={handleExport}
              className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </Button>
          )}
        </div>

        {/* Job Selector */}
        {showJobSelector && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Select Job:
              </Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-80 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs ({applications.length} applications)</SelectItem>
                  {jobs.map(job => {
                    const jobAppCount = applications.filter(app => app.jobId === job.id).length;
                    return (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} ({jobAppCount} applications)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.reviewing}</div>
                <div className="text-sm text-gray-600">Reviewing</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.interviewed}</div>
                <div className="text-sm text-gray-600">Interviewed</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-indigo-600">{stats.shortlisted}</div>
                <div className="text-sm text-gray-600">Shortlisted</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                <div className="text-sm text-gray-600">Accepted</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {showSearch && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search
                  </Label>
                  <Input
                    placeholder="Name, email, or job title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3">Experience</Label>
                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Experience</SelectItem>
                    <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                    <SelectItem value="senior">Senior Level (6+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3">Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    {Array.from(new Set(applications.map(app => app.location).filter(Boolean))).map(location => (
                      <SelectItem key={location} value={location!}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {showBulkActions && selectedApplications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedApplications.length} application(s) selected
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkStatusChange('reviewing')}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Mark as Reviewing
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkStatusChange('shortlisted')}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Shortlist
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkStatusChange('rejected')}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Loading applications...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-2">API Error</h4>
                  <div className="text-red-700 text-sm whitespace-pre-line">{error}</div>
                  {apiEndpoint && (
                    <div className="mt-3 p-3 bg-red-100 rounded border text-xs">
                      <strong>Debug Info:</strong><br />
                      Endpoint: <code className="bg-red-200 px-1 rounded">{apiEndpoint}</code><br />
                      API Type: <code className="bg-red-200 px-1 rounded">{apiPrefix}</code><br />
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
          
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                {showBulkActions && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedApplications.length === paginatedApplications.length && paginatedApplications.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                {visibleColumns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className={`font-semibold text-gray-900 ${
                      column.sortable && sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => column.sortable && sortable && handleSort(column.accessor || column.key)}
                    style={{ width: column.width }}
                  >
                    <div className={`flex items-center gap-2 ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                      {column.type === 'text' && column.key === 'applicantName' && <User className="h-4 w-4" />}
                      {column.type === 'email' && <Mail className="h-4 w-4" />}
                      {column.type === 'date' && <Calendar className="h-4 w-4" />}
                      {column.type === 'text' && column.key === 'experience' && <Briefcase className="h-4 w-4" />}
                      {column.type === 'text' && column.key === 'location' && <MapPin className="h-4 w-4" />}
                      {column.label}
                      {column.sortable && sortable && sortField === (column.accessor || column.key) && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedApplications.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={visibleColumns.length + (showBulkActions ? 1 : 0)} 
                    className="text-center py-12"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <Users className="h-16 w-16 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">No applications found</h3>
                        <p className="text-gray-600">
                          {loading ? 'Loading...' : error ? 'Error loading data' : 'Try adjusting your filters or select a different job'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedApplications.map((application) => (
                  <TableRow 
                    key={application.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${isNewApplication(application.submittedAt) ? 'bg-blue-50' : ''} ${compactView ? 'h-12' : 'h-16'}`}
                    onClick={() => handleViewApplication(application)}
                  >
                    {showBulkActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedApplications.includes(application.id)}
                          onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.map((column) => (
                      <TableCell 
                        key={column.key}
                        onClick={(e) => (column.type === 'status' || column.type === 'actions') ? e.stopPropagation() : undefined}
                        className={column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}
                      >
                        {renderCellContent(column, application)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedApplications.length)} of {filteredAndSortedApplications.length} applications
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-gray-300"
              >
                Previous
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                  className={currentPage === i + 1 ? "bg-gray-900 text-white" : "border-gray-300"}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-300"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* View Application Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-bold text-gray-900">
                  {selectedApplication?.applicantName}
                </DialogTitle>
                {selectedApplication && (
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(selectedApplication.status)} flex items-center gap-1`}>
                      {getStatusIcon(selectedApplication.status)}
                      {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                    </Badge>
                    {selectedApplication.rating && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-4 w-4 rounded-full ${
                              i < selectedApplication.rating! ? 'bg-yellow-400' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-gray-600">({selectedApplication.rating}/5)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-600 mt-2">
                Application for {selectedApplication?.jobTitle}
              </p>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-8 mt-6">
                {/* Quick Actions */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusChange(selectedApplication.id, 'shortlisted')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Shortlist
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStatusChange(selectedApplication.id, 'interviewed')}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStatusChange(selectedApplication.id, 'rejected')}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Personal Info */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${selectedApplication.applicantEmail}`} className="text-blue-600 hover:underline">
                            {selectedApplication.applicantEmail}
                          </a>
                        </div>
                        {selectedApplication.applicantPhone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{selectedApplication.applicantPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{selectedApplication.location || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>Applied {formatDate(selectedApplication.submittedAt)}</span>
                        </div>
                        {selectedApplication.source && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">Source:</span>
                            <Badge variant="outline">{selectedApplication.source}</Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Professional Details */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Professional Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Experience:</span>
                          <p className="text-gray-900">{selectedApplication.experience || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Expected Salary:</span>
                          <p className="text-gray-900">{selectedApplication.expectedSalary || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Notice Period:</span>
                          <p className="text-gray-900">{selectedApplication.noticePeriod || 'Not specified'}</p>
                        </div>
                        {selectedApplication.resumeUrl && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Resume:</span>
                            <a 
                              href={selectedApplication.resumeUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline mt-1"
                            >
                              <FileText className="h-4 w-4" />
                              View Resume
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Application Responses */}
                  <div className="lg:col-span-2 space-y-6">
                    {selectedApplication.coverLetter && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cover Letter</h3>
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {selectedApplication.coverLetter}
                          </p>
                        </div>
                      </div>
                    )}

                    {Object.keys(selectedApplication.responses).length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Responses</h3>
                        <div className="space-y-4">
                          {Object.entries(selectedApplication.responses).map(([key, value]) => (
                            <div key={key} className="border-b border-gray-100 pb-4 last:border-b-0">
                              <h4 className="font-medium text-gray-900 mb-2 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </h4>
                              <div className="text-gray-700 leading-relaxed">
                                {typeof value === 'string' && value.length > 100 ? (
                                  <div className="whitespace-pre-wrap">{value}</div>
                                ) : (
                                  <span>{value}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h3>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Add notes about this applicant..."
                          value={selectedApplication.notes || ''}
                          onChange={(e) => {
                            // In a real app, this would update the application
                            console.log('Updating notes:', e.target.value);
                          }}
                          className="min-h-[100px] border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                        <div className="flex justify-end">
                          <Button size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
