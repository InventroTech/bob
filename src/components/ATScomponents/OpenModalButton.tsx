import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DynamicForm, DynamicFormData } from './DynamicForm';
import { toast } from 'sonner';

export interface OpenModalButtonConfig {
  buttonTitle?: string;
  buttonColor?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  modalTitle?: string;
  selectedJobId?: string; // Reference to job instead of direct form
  submitEndpoint?: string;
  successMessage?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

interface OpenModalButtonProps {
  config?: OpenModalButtonConfig;
  className?: string;
}

export const OpenModalButton: React.FC<OpenModalButtonProps> = ({
  config = {},
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentForm, setCurrentForm] = useState<DynamicFormData | null>(null);

  // Default configuration
  const {
    buttonTitle = 'Apply Now',
    buttonColor = 'default',
    buttonSize = 'default',
    modalTitle = 'Job Application',
    selectedJobId,
    submitEndpoint = '/api/job-applications',
    successMessage = 'Application submitted successfully!',
    width = 'lg'
  } = config;

  // Load job form when selectedJobId changes
  useEffect(() => {
    if (selectedJobId) {
      const savedJobs = localStorage.getItem('ats-jobs');
      if (savedJobs) {
        try {
          const jobs = JSON.parse(savedJobs);
          const job = jobs.find((j: any) => j.id === selectedJobId);
          if (job) {
            setCurrentForm(job.form);
          }
        } catch (error) {
          console.error('Error loading job form:', error);
        }
      }
    }
  }, [selectedJobId]);

  // Default form if none provided
  const defaultForm: DynamicFormData = {
    id: 'default_form',
    title: 'Contact Form',
    description: 'Please fill out this form',
    questions: [
      {
        id: 'name',
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
        id: 'message',
        type: 'textarea',
        title: 'Message',
        required: true,
        placeholder: 'Enter your message here...'
      }
    ],
    settings: {
      allowMultipleSubmissions: true,
      showProgressBar: false,
      collectEmail: false
    }
  };

  const formToUse = currentForm || defaultForm;

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
    
    // Validate required fields
    const requiredQuestions = formToUse.questions.filter(q => q.required);
    const missingFields = requiredQuestions.filter(q => !formData[q.id] || formData[q.id].toString().trim() === '');
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.title).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call - replace with actual endpoint
      const response = await fetch(submitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJobId,
          formId: formToUse.id,
          formTitle: formToUse.title,
          responses: formData,
          submittedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success(successMessage);
        setFormData({});
        setIsOpen(false);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to submit form. Please try again.');
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

  // Get modal width class
  const getModalWidth = () => {
    switch (width) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case '2xl': return 'max-w-2xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-lg';
    }
  };

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant={buttonColor} 
            size={buttonSize}
            className="w-full"
          >
            {buttonTitle}
          </Button>
        </DialogTrigger>
        
        <DialogContent className={`${getModalWidth()} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {modalTitle}
            </DialogTitle>
            {formToUse.description && (
              <p className="text-sm text-gray-600 mt-2">
                {formToUse.description}
              </p>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {formToUse.questions.map((question) => (
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
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
