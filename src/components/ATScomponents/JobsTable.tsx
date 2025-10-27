import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Eye, 
  Download, 
  Filter,
  Calendar,
  Users,
  Briefcase,
  Mail,
  Phone
} from 'lucide-react';

// Application interface
interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'accepted' | 'rejected';
  submittedAt: string;
  responses: Record<string, any>;
  company?: string;
  department?: string;
  location?: string;
}

// Demo applications data
const demoApplications: JobApplication[] = [
  {
    id: 'app_1',
    jobId: 'job_1',
    jobTitle: 'Senior Frontend Developer',
    applicantName: 'John Smith',
    applicantEmail: 'john.smith@email.com',
    applicantPhone: '+1 (555) 123-4567',
    status: 'reviewing',
    submittedAt: '2024-11-15T10:30:00Z',
    company: 'TechCorp Inc.',
    department: 'Engineering',
    location: 'San Francisco, CA',
    responses: {
      fullName: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+1 (555) 123-4567',
      experience: '5-7 years',
      portfolio: 'https://github.com/johnsmith',
      coverLetter: 'I am excited to apply for this position...',
      availability: '2024-12-01',
      remote: 'true'
    }
  },
  {
    id: 'app_2',
    jobId: 'job_1',
    jobTitle: 'Senior Frontend Developer',
    applicantName: 'Sarah Johnson',
    applicantEmail: 'sarah.j@email.com',
    applicantPhone: '+1 (555) 987-6543',
    status: 'interviewed',
    submittedAt: '2024-11-14T14:20:00Z',
    company: 'TechCorp Inc.',
    department: 'Engineering',
    location: 'San Francisco, CA',
    responses: {
      fullName: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+1 (555) 987-6543',
      experience: '8-10 years',
      portfolio: 'https://sarahjohnson.dev',
      coverLetter: 'With over 8 years of experience in React development...',
      availability: '2024-11-20',
      remote: 'true'
    }
  },
  {
    id: 'app_3',
    jobId: 'job_2',
    jobTitle: 'Product Manager',
    applicantName: 'Mike Chen',
    applicantEmail: 'mike.chen@email.com',
    status: 'pending',
    submittedAt: '2024-11-16T09:15:00Z',
    company: 'InnovateLabs',
    department: 'Product',
    location: 'New York, NY',
    responses: {
      fullName: 'Mike Chen',
      email: 'mike.chen@email.com',
      experience: '4-6 years',
      productTypes: ['B2B SaaS', 'Enterprise Software'],
      methodology: 'Agile/Scrum',
      achievement: 'Led the development of a new feature that increased user engagement by 40%'
    }
  },
  {
    id: 'app_4',
    jobId: 'job_3',
    jobTitle: 'UX/UI Designer',
    applicantName: 'Emily Rodriguez',
    applicantEmail: 'emily.r@email.com',
    status: 'accepted',
    submittedAt: '2024-11-12T16:45:00Z',
    company: 'DesignStudio Pro',
    department: 'Design',
    location: 'Austin, TX',
    responses: {
      fullName: 'Emily Rodriguez',
      email: 'emily.r@email.com',
      portfolio: 'https://emilydesigns.com',
      tools: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator'],
      designProcess: 'I start with user research and empathy mapping...'
    }
  },
  {
    id: 'app_5',
    jobId: 'job_4',
    jobTitle: 'Marketing Intern',
    applicantName: 'Alex Thompson',
    applicantEmail: 'alex.t@student.edu',
    status: 'rejected',
    submittedAt: '2024-11-10T11:30:00Z',
    company: 'GrowthHackers',
    department: 'Marketing',
    location: 'Remote',
    responses: {
      fullName: 'Alex Thompson',
      email: 'alex.t@student.edu',
      university: 'State University',
      graduationDate: '2025-05-15',
      interests: ['Social Media Marketing', 'Content Marketing'],
      motivation: 'I am passionate about digital marketing and eager to learn...'
    }
  }
];

interface JobsTableProps {
  className?: string;
}

export const JobsTable: React.FC<JobsTableProps> = ({ className = '' }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);

  // Load applications (demo data + any real submissions)
  useEffect(() => {
    // In a real app, this would fetch from your backend
    setApplications(demoApplications);
    setFilteredApplications(demoApplications);
  }, []);

  // Filter applications
  useEffect(() => {
    let filtered = applications.filter(app => {
      const matchesSearch = 
        app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesJob = jobFilter === 'all' || app.jobTitle === jobFilter;
      
      return matchesSearch && matchesStatus && matchesJob;
    });
    
    setFilteredApplications(filtered);
  }, [applications, searchTerm, statusFilter, jobFilter]);

  // Get unique job titles for filter
  const jobTitles = Array.from(new Set(applications.map(app => app.jobTitle)));

  // Update application status
  const updateApplicationStatus = (applicationId: string, newStatus: JobApplication['status']) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, status: newStatus } : app
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewing': return 'bg-blue-100 text-blue-800';
      case 'interviewed': return 'bg-purple-100 text-purple-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusCounts = () => {
    const counts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: applications.length,
      pending: counts.pending || 0,
      reviewing: counts.reviewing || 0,
      interviewed: counts.interviewed || 0,
      accepted: counts.accepted || 0,
      rejected: counts.rejected || 0
    };
  };

  const stats = getStatusCounts();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Stats */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <Briefcase className="h-6 w-6" />
          Job Applications
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.reviewing}</div>
              <div className="text-sm text-gray-600">Reviewing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.interviewed}</div>
              <div className="text-sm text-gray-600">Interviewed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <div className="text-sm text-gray-600">Accepted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                Search Applications
              </label>
              <Input
                placeholder="Name, email, job title, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="interviewed">Interviewed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="h-4 w-4 inline mr-1" />
                Job Position
              </label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All positions</SelectItem>
                  {jobTitles.map(title => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Applications ({filteredApplications.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-500">No applications found</p>
                        <p className="text-sm text-gray-400">
                          Try adjusting your search criteria
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.applicantName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {application.applicantEmail}
                          </div>
                          {application.applicantPhone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {application.applicantPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.jobTitle}</div>
                          {application.department && (
                            <div className="text-sm text-gray-500">{application.department}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.company}</div>
                          {application.location && (
                            <div className="text-sm text-gray-500">{application.location}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={application.status}
                          onValueChange={(value: JobApplication['status']) => 
                            updateApplicationStatus(application.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={getStatusColor(application.status)}>
                              {application.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="reviewing">Reviewing</SelectItem>
                            <SelectItem value="interviewed">Interviewed</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(application.submittedAt).toLocaleDateString()}
                          </div>
                          <div className="text-gray-500">
                            {new Date(application.submittedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApplication(application)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Application Details</h3>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedApplication(null)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Applicant</label>
                    <p className="text-sm">{selectedApplication.applicantName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Position</label>
                    <p className="text-sm">{selectedApplication.jobTitle}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm">{selectedApplication.applicantEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Applied</label>
                    <p className="text-sm">
                      {new Date(selectedApplication.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Application Responses
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    {Object.entries(selectedApplication.responses).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <p className="text-sm mt-1">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
