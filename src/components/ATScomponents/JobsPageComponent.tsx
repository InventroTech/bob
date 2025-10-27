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
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicForm, DynamicFormData } from './DynamicForm';

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
  salary?: {
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
  title?: string;
  description?: string;
  showFilters?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
  allowApplications?: boolean;
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuration with defaults
  const {
    title = 'Available Positions',
    description = 'Discover exciting opportunities and take the next step in your career',
    showFilters = true,
    showStats = true,
    layout = 'grid',
    maxJobs = 10,
    allowApplications = true
  } = config;

  // Load jobs (demo data + localStorage jobs)
  useEffect(() => {
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
  }, [maxJobs]);

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
    const missingFields = requiredQuestions.filter(q => !formData[q.id] || formData[q.id].toString().trim() === '');
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.title).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const applicationData = {
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        company: selectedJob.company?.name,
        formId: selectedJob.form.id,
        responses: formData,
        submittedAt: new Date().toISOString()
      };
      
      console.log('Application submitted:', applicationData);
      
      toast.success('Application submitted successfully! We\'ll be in touch soon.');
      setFormData({});
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
      toast.error('Failed to submit application. Please try again.');
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
        return (
          <select
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
          >
            <option value="">Select an option</option>
            {question.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
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

  const formatSalary = (salary?: { min?: number; max?: number; currency?: string }) => {
    if (!salary) return null;
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
        <Dialog open={isApplicationModalOpen} onOpenChange={setIsApplicationModalOpen}>
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
