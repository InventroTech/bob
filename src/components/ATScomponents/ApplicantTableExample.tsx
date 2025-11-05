import React from 'react';
import { ApplicantTableComponent } from './ApplicantTableComponent';
import type { ApplicantTableConfig } from './ApplicantTableComponent';

// Example configuration showing how to use the new API features
const exampleConfig: ApplicantTableConfig = {
  title: 'Job Applications Dashboard',
  description: 'Manage applications with custom API integration',
  
  // API Configuration
  apiEndpoint: '/api/applications', // Your API endpoint here
  apiPrefix: 'renderer', // or 'supabase'
  statusDataApiEndpoint: '/api/application-stats',
  
  // Display Options
  showJobSelector: true,
  showStats: true,
  showFilters: true,
  showSearch: true,
  showExport: true,
  showBulkActions: true,
  showPagination: true,
  pageSize: 15,
  sortable: true,
  showStatusBadges: true,
  showRatings: true,
  showActions: true,
  compactView: false,
  highlightNewApplications: true,
  autoRefresh: true,
  refreshInterval: 60000, // 1 minute
  
  // Custom Column Configuration
  columns: [
    {
      key: 'applicantName',
      label: 'Candidate',
      type: 'text',
      accessor: 'applicant_name', // Custom field mapping
      sortable: true,
      visible: true,
      width: '200px'
    },
    {
      key: 'applicantEmail',
      label: 'Contact Info',
      type: 'email',
      accessor: 'email', // Custom field mapping
      sortable: false,
      visible: true,
      width: '250px'
    },
    {
      key: 'status',
      label: 'Application Status',
      type: 'status',
      accessor: 'current_status', // Custom field mapping
      sortable: true,
      visible: true,
      width: '150px',
      statusColors: {
        'pending': 'bg-yellow-100 text-yellow-800',
        'reviewing': 'bg-blue-100 text-blue-800',
        'accepted': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800'
      }
    },
    {
      key: 'submittedAt',
      label: 'Applied Date',
      type: 'date',
      accessor: 'created_at', // Custom field mapping
      sortable: true,
      visible: true,
      format: 'date', // or 'relative-time'
      width: '120px'
    },
    {
      key: 'experience',
      label: 'Years Experience',
      type: 'text',
      accessor: 'years_experience', // Custom field mapping
      sortable: true,
      visible: true,
      width: '120px'
    },
    {
      key: 'expectedSalary',
      label: 'Expected Salary',
      type: 'number',
      accessor: 'salary_expectation', // Custom field mapping
      sortable: false,
      visible: true,
      format: 'currency',
      width: '130px'
    },
    {
      key: 'rating',
      label: 'Score',
      type: 'rating',
      accessor: 'interview_score', // Custom field mapping
      sortable: true,
      visible: true,
      width: '100px'
    },
    {
      key: 'actions',
      label: 'Actions',
      type: 'actions',
      sortable: false,
      visible: true,
      width: '80px'
    }
  ],
  
  // Data Mapping for API Response
  dataMapping: {
    idField: 'application_id',
    nameField: 'applicant_name',
    emailField: 'email',
    phoneField: 'phone_number',
    statusField: 'current_status',
    dateField: 'created_at'
  },
  
  // Custom Filter Options
  filterOptions: {
    statusOptions: [
      { value: 'pending', label: 'Pending Review', color: 'yellow' },
      { value: 'reviewing', label: 'Under Review', color: 'blue' },
      { value: 'interviewed', label: 'Interviewed', color: 'purple' },
      { value: 'shortlisted', label: 'Shortlisted', color: 'indigo' },
      { value: 'accepted', label: 'Accepted', color: 'green' },
      { value: 'rejected', label: 'Rejected', color: 'red' }
    ],
    experienceOptions: [
      { value: 'entry', label: 'Entry Level (0-2 years)' },
      { value: 'mid', label: 'Mid Level (3-5 years)' },
      { value: 'senior', label: 'Senior Level (6+ years)' }
    ],
    customFilters: [
      {
        key: 'department',
        label: 'Department',
        type: 'select',
        options: [
          { value: 'engineering', label: 'Engineering' },
          { value: 'product', label: 'Product' },
          { value: 'design', label: 'Design' },
          { value: 'marketing', label: 'Marketing' }
        ]
      }
    ]
  }
};

export const ApplicantTableExample: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Enhanced Applicant Table Example
        </h1>
        <p className="text-gray-600 mb-6">
          This example shows the new configurable ApplicantTable with API integration, 
          custom columns, data mapping, and advanced filtering options.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Key Features Demonstrated:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Custom API endpoint configuration (/api/applications)</li>
            <li>• Dynamic column configuration with custom field mapping</li>
            <li>• Data mapping for different API response structures</li>
            <li>• Custom status colors and filter options</li>
            <li>• Auto-refresh functionality (60 seconds)</li>
            <li>• Flexible column types (text, email, status, date, rating, actions)</li>
          </ul>
        </div>
      </div>
      
      <ApplicantTableComponent config={exampleConfig} />
    </div>
  );
};

export default ApplicantTableExample;
