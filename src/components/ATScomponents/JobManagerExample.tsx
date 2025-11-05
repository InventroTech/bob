import React from 'react';
import { JobManagerComponent } from './JobManagerComponent';
import type { JobManagerComponentConfig } from './JobManagerComponent';

// Example configuration showing how to use the new API features
const exampleConfig: JobManagerComponentConfig = {
  title: 'HR Job Management System',
  showCreateButton: true,
  showStats: true,
  layout: 'grid',
  maxJobs: 25,
  
  // API Configuration
  apiEndpoint: '/api/jobs', // Your jobs API endpoint here
  apiPrefix: 'renderer', // or 'supabase'
  useDemoData: false, // Set to true to use localStorage only
  
  // Data Mapping for API Response/Request
  dataMapping: {
    idField: 'job_id',           // Map to your API's ID field
    titleField: 'position_title', // Map to your API's title field
    descriptionField: 'job_description', // Map to your API's description field
    departmentField: 'dept_name', // Map to your API's department field
    locationField: 'job_location', // Map to your API's location field
    typeField: 'employment_type', // Map to your API's type field
    statusField: 'job_status',   // Map to your API's status field
    deadlineField: 'application_deadline', // Map to your API's deadline field
    createdAtField: 'created_at' // Map to your API's creation date field
  }
};

// Example of expected API response structure (GET /api/jobs)
const exampleGetResponse = [
  {
    job_id: "1",
    position_title: "Senior React Developer",
    job_description: "We're looking for an experienced React developer...",
    dept_name: "Engineering",
    job_location: "San Francisco, CA / Remote",
    employment_type: "full-time",
    job_status: "active",
    application_deadline: "2024-12-31",
    created_at: "2024-01-15T10:30:00Z",
    requireResume: true,
    form: {
      id: "form_1",
      title: "Senior React Developer Application",
      questions: [
        { id: "fullName", type: "text", title: "Full Name", required: true },
        { id: "email", type: "email", title: "Email", required: true }
      ]
    }
  }
  // ... more jobs
];

// Example of POST request payload (POST /api/jobs)
const examplePostPayload = {
  job_id: "job_1234567890",
  position_title: "Frontend Developer",
  job_description: "Join our team as a Frontend Developer...",
  dept_name: "Engineering",
  job_location: "Remote",
  employment_type: "full-time",
  job_status: "draft",
  application_deadline: "2024-12-31",
  created_at: "2024-01-15T10:30:00Z",
  requireResume: false,
  form: {
    id: "form_1234567890",
    title: "Frontend Developer Application",
    questions: [
      { id: "fullName", type: "text", title: "Full Name", required: true },
      { id: "email", type: "email", title: "Email Address", required: true },
      { id: "phone", type: "phone", title: "Phone Number", required: true }
    ]
  },
  applicationsCount: 0
};

export const JobManagerExample: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Enhanced Job Manager Example
        </h1>
        <p className="text-gray-600 mb-6">
          This example shows the new configurable Job Manager with API integration for both 
          fetching existing jobs (GET) and creating new jobs (POST).
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Key Features Demonstrated:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• <strong>GET API:</strong> Fetch existing jobs from {exampleConfig.apiEndpoint}</li>
            <li>• <strong>POST API:</strong> Create new jobs via API with automatic sync</li>
            <li>• <strong>Data Mapping:</strong> Custom field mapping for different API structures</li>
            <li>• <strong>Fallback Handling:</strong> Graceful fallback to localStorage on API errors</li>
            <li>• <strong>Dual Mode:</strong> Works with API or localStorage (demo mode)</li>
            <li>• <strong>Error Handling:</strong> Comprehensive error display and debugging</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">GET Request (Fetch Jobs):</h3>
            <pre className="text-green-800 text-xs bg-green-100 p-3 rounded overflow-x-auto">
{`GET ${exampleConfig.apiEndpoint}
Headers: {
  "Content-Type": "application/json",
  "X-API-Source": "${exampleConfig.apiPrefix}"
}

Response:
${JSON.stringify(exampleGetResponse, null, 2)}`}
            </pre>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">POST Request (Create Job):</h3>
            <pre className="text-orange-800 text-xs bg-orange-100 p-3 rounded overflow-x-auto">
{`POST ${exampleConfig.apiEndpoint}
Headers: {
  "Content-Type": "application/json",
  "X-API-Source": "${exampleConfig.apiPrefix}"
}

Body:
${JSON.stringify(examplePostPayload, null, 2)}`}
            </pre>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">API Workflow:</h3>
          <div className="text-yellow-800 text-sm space-y-2">
            <p><strong>1. Component Mount:</strong> Fetches jobs via GET request</p>
            <p><strong>2. Create Job:</strong> Adds to local state + sends POST request</p>
            <p><strong>3. API Success:</strong> Shows "Job created successfully!"</p>
            <p><strong>4. API Failure:</strong> Shows "Job created locally (API sync failed)"</p>
            <p><strong>5. Error Handling:</strong> Falls back to localStorage with detailed error info</p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-900 mb-2">Configuration Options:</h3>
          <div className="text-purple-800 text-sm grid grid-cols-2 gap-4">
            <div>
              <p><strong>API Endpoint:</strong> Configure your jobs API URL</p>
              <p><strong>API Prefix:</strong> Choose between 'supabase' or 'renderer'</p>
              <p><strong>Demo Data Mode:</strong> Toggle to use localStorage only</p>
            </div>
            <div>
              <p><strong>Data Mapping:</strong> Map API field names to component structure</p>
              <p><strong>Error Handling:</strong> Automatic fallback and detailed debugging</p>
              <p><strong>Dual Sync:</strong> Local state + API synchronization</p>
            </div>
          </div>
        </div>
      </div>
      
      <JobManagerComponent config={exampleConfig} />
    </div>
  );
};

export default JobManagerExample;
