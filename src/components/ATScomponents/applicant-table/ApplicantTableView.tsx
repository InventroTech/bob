/** Presentational JSX for the applicant table. */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/select';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { CustomButton } from '../../ui/CustomButton';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';

import type { ApplicantTableModel } from './useApplicantTable';

export function ApplicantTableView(props: ApplicantTableModel) {
  const {
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
    renderCellContent
  } = props;

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="space-y-8 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8" />
              {title}
            </h3>
            <p className="text-xl text-gray-600 mt-2">{description}</p>
          </div>
          
          {showExport && (
            <CustomButton 
              onClick={handleExport}
              icon={<Download className="h-5 w-5" />}
              className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold"
            >
              Export
            </CustomButton>
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
                  {jobs.length > 0 ? (
                    jobs.map(job => {
                      const jobAppCount = applications.filter(app => app.jobId === job.id).length;
                      return (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title} ({jobAppCount} applications)
                        </SelectItem>
                      );
                    })
                  ) : (
                    // Extract unique jobs from applications if jobs list is empty
                    Array.from(new Map(applications.map(app => [app.jobId, { id: app.jobId, title: app.jobTitle }])).values())
                      .filter(job => job.id && job.title)
                      .map(job => {
                        const jobAppCount = applications.filter(app => app.jobId === job.id).length;
                        return (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title} ({jobAppCount} applications)
                          </SelectItem>
                        );
                      })
                  )}
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
                <div className="text-2xl font-bold text-gray-600">{stats.initial}</div>
                <div className="text-sm text-gray-600">Initial</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.assignmentPending}</div>
                <div className="text-sm text-gray-600">Assignment Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.interview}</div>
                <div className="text-sm text-gray-600">Interview</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.hr}</div>
                <div className="text-sm text-gray-600">HR</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.hire}</div>
                <div className="text-sm text-gray-600">Hire</div>
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
                <Label className="text-sm font-medium text-gray-700 mb-3">Stage</Label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="Initial">Initial</SelectItem>
                    <SelectItem value="Assignment Pending">Assignment Pending</SelectItem>
                    <SelectItem value="Interview">Interview</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Hire">Hire</SelectItem>
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
                {visibleColumns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className={`font-semibold text-gray-900 py-4 ${
                      column.sortable && sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => column.sortable && sortable && handleSort(column.accessor || column.key)}
                    style={{ width: column.width, textAlign: column.align === 'center' ? 'center' : column.align === 'right' ? 'right' : 'left' }}
                  >
                    <div className={`flex items-center gap-2 ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                      {column.type === 'text' && column.key === 'applicantName' && <User className="h-4 w-4" />}
                      {column.type === 'email' && <Mail className="h-4 w-4" />}
                      {column.type === 'date' && <Calendar className="h-4 w-4" />}
                      {column.type === 'text' && column.key === 'experience' && <Briefcase className="h-4 w-4" />}
                      {column.type === 'skills' && <Briefcase className="h-4 w-4" />}
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
                    colSpan={visibleColumns.length} 
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
                    {visibleColumns.map((column) => (
                      <TableCell 
                        key={column.key}
                        onClick={(e) => (column.type === 'actions') ? e.stopPropagation() : undefined}
                        style={{ width: column.width, textAlign: column.align === 'center' ? 'center' : column.align === 'right' ? 'right' : 'left' }}
                        className={`${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'} py-4`}
                      >
                        <div className={`flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                          {renderCellContent(column, application)}
                        </div>
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
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-600 mt-2">
                Application for {selectedApplication?.jobTitle}
              </p>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-8 mt-6">
                {/* Stage and Quick Actions */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStageColor(selectedApplication.stage || 'Initial')} text-base px-4 py-2`}>
                      Current Stage: {selectedApplication.stage || 'Initial'}
                    </Badge>
                    {getNextStage(selectedApplication.stage || 'Initial') && (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleNextStep(selectedApplication)}
                      >
                        Next Step: {getNextStage(selectedApplication.stage || 'Initial')}
                      </Button>
                    )}
                    {selectedApplication.stage !== 'Rejected' && selectedApplication.stage !== 'Hire' && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReject(selectedApplication)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
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
                          <span className="text-sm font-medium text-gray-700">Skills:</span>
                          <p className="text-gray-900">{selectedApplication.skills || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Experience:</span>
                          <p className="text-gray-900">{selectedApplication.experience || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">College:</span>
                          <p className="text-gray-900">{selectedApplication.college || 'Not specified'}</p>
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

                  {/* Right Column - Application Responses and OpenAI Data */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Application Answers */}
                    {selectedApplication.fullData?.answers && Object.keys(selectedApplication.fullData.answers).length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Answers</h3>
                        <div className="space-y-4">
                          {Object.entries(selectedApplication.fullData.answers).map(([key, value]) => (
                            <div key={key} className="border-b border-gray-100 pb-4 last:border-b-0">
                              <h4 className="font-medium text-gray-900 mb-2">
                                Question {key.replace('a', '')}
                              </h4>
                              <div className="text-gray-700 leading-relaxed">
                                {typeof value === 'string' && value.length > 100 ? (
                                  <div className="whitespace-pre-wrap">{value}</div>
                                ) : (
                                  <span>{String(value)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OpenAI Resume Analysis */}
                    {selectedApplication.fullData?.openairesponse && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Resume Analysis (AI)
                        </h3>
                        <div className="space-y-6">
                          {/* Skills */}
                          {selectedApplication.fullData.openairesponse.skills && selectedApplication.fullData.openairesponse.skills.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Skills</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedApplication.fullData.openairesponse.skills.map((skill: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {selectedApplication.fullData.openairesponse.education && selectedApplication.fullData.openairesponse.education.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Education</h4>
                              <div className="space-y-3">
                                {selectedApplication.fullData.openairesponse.education.map((edu: any, idx: number) => (
                                  <div key={idx} className="border-l-2 border-blue-200 pl-4">
                                    <div className="font-medium text-gray-900">{edu.degree}</div>
                                    <div className="text-sm text-gray-600">{edu.college}</div>
                                    {(edu.start_year || edu.end_year) && (
                                      <div className="text-xs text-gray-500">
                                        {edu.start_year} {edu.end_year ? `- ${edu.end_year}` : ''}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {selectedApplication.fullData.openairesponse.experience && selectedApplication.fullData.openairesponse.experience.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Experience</h4>
                              <div className="space-y-4">
                                {selectedApplication.fullData.openairesponse.experience.map((exp: any, idx: number) => (
                                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                    <div className="font-medium text-gray-900">{exp.position}</div>
                                    <div className="text-sm text-gray-600">{exp.company}</div>
                                    <div className="text-xs text-gray-500 mb-2">{exp.duration}</div>
                                    {exp.description && (
                                      <div className="text-sm text-gray-700 mt-2">{exp.description}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Projects */}
                          {selectedApplication.fullData.openairesponse.projects && selectedApplication.fullData.openairesponse.projects.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Projects</h4>
                              <div className="space-y-4">
                                {selectedApplication.fullData.openairesponse.projects.map((project: any, idx: number) => (
                                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                    <div className="font-medium text-gray-900 mb-2">{project.name}</div>
                                    {project.description && (
                                      <div className="text-sm text-gray-700 mb-2">{project.description}</div>
                                    )}
                                    {project.tech_stack && project.tech_stack.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {project.tech_stack.map((tech: string, techIdx: number) => (
                                          <Badge key={techIdx} variant="outline" className="text-xs">
                                            {tech}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Links */}
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                            {selectedApplication.fullData.openairesponse.github && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">GitHub:</span>
                                <a href={`https://github.com/${selectedApplication.fullData.openairesponse.github}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                                  {selectedApplication.fullData.openairesponse.github}
                                </a>
                              </div>
                            )}
                            {selectedApplication.fullData.openairesponse.linkedin && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">LinkedIn:</span>
                                <span className="ml-2">{selectedApplication.fullData.openairesponse.linkedin}</span>
                              </div>
                            )}
                            {selectedApplication.fullData.openairesponse.portfolio && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Portfolio:</span>
                                <span className="ml-2">{selectedApplication.fullData.openairesponse.portfolio}</span>
                              </div>
                            )}
                            {selectedApplication.fullData.openairesponse.ats_score !== undefined && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">ATS Score:</span>
                                <Badge className="ml-2">{selectedApplication.fullData.openairesponse.ats_score}</Badge>
                              </div>
                            )}
                          </div>
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
}
