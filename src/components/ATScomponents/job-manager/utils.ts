/** Pure helpers for the job manager module. */

import type { DynamicFormData, QuestionType } from '../DynamicForm';

export const createDefaultForm = (jobTitle: string, requireResume: boolean = false): DynamicFormData => ({
  id: `form_${Date.now()}`,
  title: `Application for ${jobTitle}`,
  description: 'Please fill out this application form to apply for this position.',
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
      title: 'Years of Experience',
      required: true,
      options: ['0-1 years', '2-3 years', '4-5 years', '6-10 years', '10+ years']
    },
    {
      id: 'coverLetter',
      type: 'textarea',
      title: 'Cover Letter',
      description: 'Tell us why you\'re interested in this position',
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
      id: 'relocate',
      type: 'boolean',
      title: 'Are you willing to relocate?',
      required: false
    },
    ...(requireResume ? [{
      id: 'resume',
      type: 'file' as QuestionType,
      title: 'Resume/CV',
      description: 'Please upload your resume or CV (PDF, DOC, DOCX)',
      required: true,
      validation: {
        pattern: '\\.(pdf|doc|docx)$'
      }
    }] : [])
  ],
  settings: {
    allowMultipleSubmissions: false,
    showProgressBar: true,
    collectEmail: true
  }
});


export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'draft': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getTypeIcon = (type: string) => {
  switch (type) {
    case 'full-time': return '🕘';
    case 'part-time': return '⏰';
    case 'contract': return '📝';
    case 'internship': return '🎓';
    default: return '💼';
  }
};

// Check if deadline is approaching (within 7 days)
export const isDeadlineApproaching = (deadline?: string) => {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays >= 0;
};

// Get stats
