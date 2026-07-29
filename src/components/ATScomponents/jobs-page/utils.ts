/** Demo data and helpers for the jobs page. */

import type { Job } from './types';

export const demoJobs: Job[] = [
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
