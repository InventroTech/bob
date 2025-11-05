import React from 'react';
import { JobsPageComponent } from './JobsPageComponent';
import type { JobsPageComponentConfig } from './JobsPageComponent';

// Example configuration showing how to use the new API features
const exampleConfig: JobsPageComponentConfig = {
  title: 'Join Our Team',
  description: 'Discover amazing career opportunities and be part of our growing company',
  
  // API Configuration
  apiEndpoint: '/api/jobs', // Your jobs API endpoint here
  apiPrefix: 'renderer', // or 'supabase'
  useDemoData: false, // Set to true to use demo data instead of API
  
  // Display Options
  showFilters: true,
  showStats: true,
  layout: 'grid', // or 'list'
  maxJobs: 20,
  allowApplications: true,
  
  // Data Mapping for API Response
  dataMapping: {
    idField: 'job_id',           // Map to your API's ID field
    titleField: 'job_title',     // Map to your API's title field
    descriptionField: 'job_description', // Map to your API's description field
    departmentField: 'dept_name', // Map to your API's department field
    locationField: 'job_location', // Map to your API's location field
    typeField: 'employment_type', // Map to your API's type field
    statusField: 'job_status',   // Map to your API's status field
    salaryField: 'salary_info',  // Map to your API's salary field
    createdAtField: 'created_at' // Map to your API's creation date field
  }
};

// Example of expected API response structure
const exampleApiResponse = [
  {
    job_id: "1",
    job_title: "Senior React Developer",
    job_description: "We're looking for an experienced React developer...",
    dept_name: "Engineering",
    job_location: "San Francisco, CA / Remote",
    employment_type: "full-time",
    job_status: "active",
    salary_info: {
      min: 120000,
      max: 180000,
      currency: "USD"
    },
    created_at: "2024-01-15T10:30:00Z",
    requirements: ["5+ years React", "TypeScript experience"],
    benefits: ["Health insurance", "Remote work", "Stock options"]
  }
  // ... more jobs
];

export const JobsBoardExample: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Enhanced Jobs Board Example
        </h1>
        <p className="text-gray-600 mb-6">
          This example shows the new configurable Jobs Board with API integration, 
          custom field mapping, and advanced configuration options.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Key Features Demonstrated:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Custom API endpoint configuration (/api/jobs)</li>
            <li>• Data mapping for different API response structures</li>
            <li>• Demo data mode toggle for testing</li>
            <li>• Comprehensive error handling with debugging info</li>
            <li>• Automatic fallback to demo data on API errors</li>
            <li>• Support for various API response formats</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">Expected API Response Format:</h3>
          <pre className="text-green-800 text-xs bg-green-100 p-3 rounded overflow-x-auto">
{JSON.stringify(exampleApiResponse, null, 2)}
          </pre>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Configuration Options:</h3>
          <div className="text-yellow-800 text-sm space-y-1">
            <p><strong>API Endpoint:</strong> Configure your jobs API URL</p>
            <p><strong>API Prefix:</strong> Choose between 'supabase' or 'renderer' API types</p>
            <p><strong>Demo Data Mode:</strong> Toggle to use demo data for testing</p>
            <p><strong>Data Mapping:</strong> Map your API field names to the component structure</p>
            <p><strong>Error Handling:</strong> Automatic fallback and detailed error messages</p>
          </div>
        </div>
      </div>
      
      <JobsPageComponent config={exampleConfig} />
    </div>
  );
};

export default JobsBoardExample;
