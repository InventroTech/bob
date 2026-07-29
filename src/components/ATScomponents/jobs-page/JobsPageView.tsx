/** Presentational JSX for the jobs page. */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
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
import { DynamicForm } from '../DynamicForm';
import { FileUploadComponent } from '../FileUploadComponent';

import type { JobsPageModel } from './useJobsPage';

export function JobsPageView(props: JobsPageModel) {
  const {
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
    isDeadlineApproaching
  } = props;

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
                  
                  <CustomButton 
                    onClick={() => handleApply(job)} 
                    disabled={!allowApplications}
                    className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold transition-colors"
                  >
                    {allowApplications ? 'Apply Now' : 'View Details'}
                  </CustomButton>
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
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-gray-50 to-white">
            <div className="overflow-y-auto max-h-[95vh] pr-2">
              <DialogHeader className="pb-6 border-b border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="text-4xl bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4">
                    {selectedJob?.company?.logo || '💼'}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-3xl font-bold text-gray-900 mb-2">
                      {selectedJob?.title}
                    </DialogTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">{selectedJob?.company?.name}</span>
                      {selectedJob?.location && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {selectedJob.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {selectedJob && (
                <div className="mt-6 space-y-6">
                  {/* Job Details Section */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-gray-700" />
                      Job Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {selectedJob.department && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 text-xs">Department</p>
                            <p className="font-semibold text-gray-900">{selectedJob.department}</p>
                          </div>
                        </div>
                      )}
                      {selectedJob.type && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 text-xs">Type</p>
                            <p className="font-semibold text-gray-900 capitalize">{selectedJob.type.replace('-', ' ')}</p>
                          </div>
                        </div>
                      )}
                      {formatSalary(selectedJob.salary) && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">💰</span>
                          <div>
                            <p className="text-gray-500 text-xs">Salary</p>
                            <p className="font-semibold text-gray-900">{formatSalary(selectedJob.salary)}</p>
                          </div>
                        </div>
                      )}
                      {selectedJob.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 text-xs">Deadline</p>
                            <p className="font-semibold text-gray-900">{new Date(selectedJob.deadline).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job Description Section */}
                  {selectedJob.description && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Job Description</h3>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {selectedJob.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Requirements Section */}
                  {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Requirements</h3>
                      <ul className="space-y-2">
                        {selectedJob.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-3 text-gray-700">
                            <span className="text-gray-400 mt-1">•</span>
                            <span className="flex-1">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Application Form Section */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Application Form</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {selectedJob.form.questions.map((question) => (
                        <div key={question.id} className="space-y-2">
                          <label 
                            htmlFor={question.id} 
                            className="block text-sm font-semibold text-gray-900"
                          >
                            {question.title}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          
                          {question.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {question.description}
                            </p>
                          )}
                          
                          <div className="mt-1">
                            {renderFormField(question)}
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                        <CustomButton
                          type="button"
                          variant="outline"
                          onClick={() => setIsApplicationModalOpen(false)}
                          disabled={isSubmitting}
                          className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          Cancel
                        </CustomButton>
                        <CustomButton
                          type="submit"
                          disabled={isSubmitting}
                          loading={isSubmitting}
                          className="min-w-[140px] px-6 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 font-semibold shadow-lg transition-all"
                        >
                          Submit Application
                        </CustomButton>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
