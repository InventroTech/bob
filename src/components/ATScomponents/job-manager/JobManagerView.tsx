/** Presentational JSX for the job manager. */

import React from 'react';
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
import { DynamicForm, QUESTION_TYPES, type QuestionType } from '../DynamicForm';

import type { JobManagerModel } from './useJobManager';
import {
  getStatusColor,
  getTypeIcon,
  isDeadlineApproaching,
} from './utils';

export function JobManagerView(props: JobManagerModel) {
  const {
    addEditQuestionField,
    addEditQuestionOption,
    addQuestionField,
    addQuestionOption,
    apiEndpoint,
    apiMode,
    className,
    customQuestions,
    editCustomQuestions,
    editJobData,
    error,
    handleCreateJob,
    handleDeleteJob,
    handleEditForm,
    handlePreviewForm,
    handleSaveEditedJob,
    isCreateModalOpen,
    isEditModalOpen,
    isPreviewModalOpen,
    jobs,
    layout,
    loading,
    newJobData,
    removeEditQuestionField,
    removeEditQuestionOption,
    removeQuestionField,
    removeQuestionOption,
    selectedJob,
    setEditJobData,
    setEditingJob,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    setIsPreviewModalOpen,
    setNewJobData,
    showCreateButton,
    showStats,
    stats,
    title,
    toggleJobStatus,
    updateEditQuestion,
    updateEditQuestionOption,
    updateEditQuestionType,
    updateQuestion,
    updateQuestionOption,
    updateQuestionType,
    editingJob,
  } = props;

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
}
