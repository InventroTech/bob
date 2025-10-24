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
import { DynamicForm, DynamicFormData } from '@/components/ATScomponents/DynamicForm';

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

// Demo data
const demoJobs: Job[] = [
  {
    id: 'job_1',
    title: 'Senior Frontend Developer',
    description: 'We are looking for an experienced Frontend Developer to join our dynamic team. You will be responsible for building user-facing features using React, TypeScript, and modern web technologies. The ideal candidate should have a strong understanding of responsive design, state management, and performance optimization.',
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
      'Experience with state management (Redux/Zustand)',
      'Knowledge of modern build tools',
      'Understanding of web performance optimization'
    ],
    benefits: [
      'Health, dental, and vision insurance',
      'Flexible work arrangements',
      'Professional development budget',
      'Stock options',
      'Unlimited PTO'
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
          id: 'phone',
          type: 'phone',
          title: 'Phone Number',
          required: true,
          placeholder: '+1 (555) 123-4567'
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
          placeholder: 'https://github.com/yourname or portfolio link'
        },
        {
          id: 'coverLetter',
          type: 'textarea',
          title: 'Cover Letter',
          description: 'Tell us why you\'re interested in this position and what makes you a great fit',
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
          id: 'remote',
          type: 'boolean',
          title: 'Are you open to remote work?',
          required: false
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
    description: 'Join our product team to drive the development of innovative features that delight our users. You\'ll work closely with engineering, design, and business stakeholders to define product requirements, prioritize features, and ensure successful product launches.',
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
      'Strong analytical and communication skills',
      'Background in B2B SaaS products',
      'Data-driven decision making'
    ],
    benefits: [
      'Comprehensive health coverage',
      'Equity participation',
      'Learning and development stipend',
      'Flexible PTO',
      'Commuter benefits'
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
        },
        {
          id: 'productTypes',
          type: 'checkbox',
          title: 'What types of products have you managed?',
          required: true,
          options: ['B2B SaaS', 'B2C Mobile Apps', 'E-commerce', 'Enterprise Software', 'Consumer Web']
        },
        {
          id: 'methodology',
          type: 'radio',
          title: 'Which product development methodology do you prefer?',
          required: true,
          options: ['Agile/Scrum', 'Kanban', 'Lean Startup', 'Design Thinking', 'Other']
        },
        {
          id: 'achievement',
          type: 'textarea',
          title: 'Describe your biggest product achievement',
          required: true,
          placeholder: 'Tell us about a product you launched or improved...'
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
    description: 'We\'re seeking a talented UX/UI Designer to create intuitive and beautiful user experiences. You\'ll be responsible for the entire design process from user research and wireframing to high-fidelity mockups and prototyping.',
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
      'Experience with user research and testing',
      'Understanding of design systems'
    ],
    benefits: [
      'Creative freedom and autonomy',
      'Top-tier design tools and equipment',
      'Conference and workshop attendance',
      'Flexible work schedule',
      'Health and wellness programs'
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
        },
        {
          id: 'tools',
          type: 'checkbox',
          title: 'Which design tools are you proficient in?',
          required: true,
          options: ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'Principle', 'Framer']
        },
        {
          id: 'designProcess',
          type: 'textarea',
          title: 'Describe your design process',
          required: true,
          placeholder: 'Walk us through how you approach a new design challenge...'
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
  },
  {
    id: 'job_4',
    title: 'Marketing Intern',
    description: 'Join our marketing team as an intern and gain hands-on experience in digital marketing, content creation, and campaign management. This is a great opportunity for students or recent graduates to learn and grow in a fast-paced environment.',
    department: 'Marketing',
    location: 'Remote',
    type: 'internship',
    status: 'active',
    deadline: '2024-12-20',
    salary: {
      min: 20,
      max: 25,
      currency: 'USD'
    },
    requirements: [
      'Currently pursuing or recently completed marketing/communications degree',
      'Strong written and verbal communication skills',
      'Familiarity with social media platforms',
      'Basic understanding of digital marketing',
      'Eagerness to learn and take initiative'
    ],
    benefits: [
      'Mentorship from senior marketers',
      'Real-world project experience',
      'Flexible remote work',
      'Potential for full-time offer',
      'Professional development opportunities'
    ],
    form: {
      id: 'form_4',
      title: 'Marketing Intern Application',
      description: 'Tell us about your interest in marketing and what you hope to learn.',
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
          id: 'university',
          type: 'text',
          title: 'University/School',
          required: true,
          placeholder: 'Your current or recent school'
        },
        {
          id: 'graduationDate',
          type: 'date',
          title: 'Expected/Actual Graduation Date',
          required: true
        },
        {
          id: 'interests',
          type: 'checkbox',
          title: 'Which areas of marketing interest you most?',
          required: true,
          options: ['Social Media Marketing', 'Content Marketing', 'Email Marketing', 'SEO/SEM', 'Analytics', 'Brand Management']
        },
        {
          id: 'motivation',
          type: 'textarea',
          title: 'Why are you interested in this internship?',
          required: true,
          placeholder: 'Tell us what motivates you about marketing...'
        }
      ],
      settings: {
        allowMultipleSubmissions: false,
        showProgressBar: true,
        collectEmail: true
      }
    },
    createdAt: '2024-11-10T16:45:00Z',
    applicationsCount: 7,
    company: {
      name: 'GrowthHackers',
      logo: '📈',
      website: 'https://growthhackers.com'
    }
  }
];

export const JobsPage: React.FC = () => {
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
    
    setJobs(allJobs);
    setFilteredJobs(allJobs);
  }, []);

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
      
      // In a real app, this would be sent to your backend
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
      
      // Update application count (in real app, this would come from backend)
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          />
        );

      case 'select':
        return (
          <select
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an option</option>
            {question.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  required={question.required}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleInputChange(question.id, [...currentValues, option]);
                    } else {
                      handleInputChange(question.id, currentValues.filter((v: string) => v !== option));
                    }
                  }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={question.id}
                value="true"
                checked={value === 'true'}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                required={question.required}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={question.id}
                value="false"
                checked={value === 'false'}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                required={question.required}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">No</span>
            </label>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Your Dream Job</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover exciting opportunities and take the next step in your career
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                Search Jobs
              </label>
              <Input
                placeholder="Job title, company, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Location
              </label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Job Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="h-4 w-4 inline mr-1" />
                Department
              </label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
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

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{filteredJobs.length}</span> of{' '}
            <span className="font-semibold">{jobs.length}</span> jobs
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="h-4 w-4" />
            {(searchTerm || locationFilter !== 'all' || typeFilter !== 'all' || departmentFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setLocationFilter('all');
                  setTypeFilter('all');
                  setDepartmentFilter('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-6">
          {filteredJobs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search criteria or check back later for new opportunities
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setLocationFilter('all');
                    setTypeFilter('all');
                    setDepartmentFilter('all');
                  }}
                >
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{job.company?.logo}</span>
                        <div>
                          <CardTitle className="text-xl">{job.title}</CardTitle>
                          <p className="text-gray-600 font-medium">{job.company?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        )}
                        {job.department && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {job.department}
                          </span>
                        )}
                        {job.deadline && (
                          <span className={`flex items-center gap-1 ${
                            isDeadlineApproaching(job.deadline) ? 'text-red-600' : ''
                          }`}>
                            <Calendar className="h-4 w-4" />
                            Deadline: {new Date(job.deadline).toLocaleDateString()}
                            {isDeadlineApproaching(job.deadline) && (
                              <Badge variant="destructive" className="ml-1 text-xs">Soon</Badge>
                            )}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.applicationsCount || 0} applicants
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getTypeColor(job.type!)}>
                          {job.type?.replace('-', ' ')}
                        </Badge>
                        {formatSalary(job.salary) && (
                          <Badge variant="outline">
                            {formatSalary(job.salary)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button onClick={() => handleApply(job)}>
                      Apply Now
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {job.description}
                  </p>
                  
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">Key Requirements:</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.slice(0, 3).map((req, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {job.requirements.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{job.requirements.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                    {job.company?.website && (
                      <a
                        href={job.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        Company website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Application Modal */}
      <Dialog open={isApplicationModalOpen} onOpenChange={setIsApplicationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Apply for {selectedJob?.title}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{selectedJob?.company?.logo}</span>
              <span>{selectedJob?.company?.name}</span>
              {selectedJob?.location && (
                <>
                  <span>•</span>
                  <span>{selectedJob.location}</span>
                </>
              )}
            </div>
          </DialogHeader>

          {selectedJob && (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {selectedJob.form.questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <label 
                    htmlFor={question.id} 
                    className="block text-sm font-medium text-gray-700"
                  >
                    {question.title}
                    {question.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  
                  {question.description && (
                    <p className="text-xs text-gray-500 mb-2">
                      {question.description}
                    </p>
                  )}
                  
                  {renderFormField(question)}
                </div>
              ))}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplicationModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
