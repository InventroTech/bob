import React from 'react';
import { FileUploadComponent } from './FileUploadComponent';
import { toast } from 'sonner';

/**
 * Example usage of the FileUploadComponent
 * 
 * This component demonstrates how to use the FileUploadComponent
 * with different configurations for various use cases.
 */

export const FileUploadExample: React.FC = () => {
  // Handler for successful uploads
  const handleUploadSuccess = (response: any) => {
    console.log('Upload successful! Response:', response);
    // You can update state, refresh data, etc.
  };

  // Handler for upload errors
  const handleUploadError = (error: Error) => {
    console.error('Upload failed:', error);
    // You can show custom error messages, log errors, etc.
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">File Upload Component Examples</h1>
          <p className="text-gray-600">Different configurations for various use cases</p>
        </div>

        {/* Example 1: Resume Upload (Single File) */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Resume Upload (Single File)</h2>
          <FileUploadComponent
            title="Upload Your Resume"
            description="Upload your resume in PDF, DOC, or DOCX format"
            apiEndpoint="/api/upload/resume"
            acceptedFileTypes=".pdf,.doc,.docx"
            maxFileSize={5}
            multiple={false}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>

        {/* Example 2: Image Upload (Multiple Files) */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Portfolio Images (Multiple Files)</h2>
          <FileUploadComponent
            title="Upload Portfolio Images"
            description="Upload multiple images for your portfolio"
            apiEndpoint="/api/upload/images"
            acceptedFileTypes="image/*"
            maxFileSize={10}
            multiple={true}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>

        {/* Example 3: Document Upload (Any File Type) */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. General Documents (Multiple Files)</h2>
          <FileUploadComponent
            title="Upload Documents"
            description="Upload any type of document"
            apiEndpoint="/api/upload/documents"
            acceptedFileTypes="*"
            maxFileSize={20}
            multiple={true}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>

        {/* Example 4: CSV Import */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. CSV Data Import (Single File)</h2>
          <FileUploadComponent
            title="Import CSV Data"
            description="Upload a CSV file to import data"
            apiEndpoint="/api/import/csv"
            acceptedFileTypes=".csv"
            maxFileSize={50}
            multiple={false}
            onUploadSuccess={(response) => {
              console.log('CSV imported successfully:', response);
              toast.success(`Imported ${response.rowCount || 0} rows of data`);
            }}
            onUploadError={handleUploadError}
          />
        </div>

        {/* Example 5: Application Documents */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Job Application Documents</h2>
          <FileUploadComponent
            title="Application Documents"
            description="Upload your resume, cover letter, and supporting documents"
            apiEndpoint="/api/applications/documents"
            acceptedFileTypes=".pdf,.doc,.docx,.txt"
            maxFileSize={10}
            multiple={true}
            onUploadSuccess={(response) => {
              console.log('Application documents uploaded:', response);
              toast.success('Your application has been submitted successfully!');
            }}
            onUploadError={handleUploadError}
          />
        </div>

        {/* API Endpoint Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📘 API Endpoint Setup</h3>
          <p className="text-sm text-blue-800 mb-3">
            The FileUploadComponent makes a POST request to the specified API endpoint with FormData.
          </p>
          <div className="bg-white rounded border border-blue-200 p-4 font-mono text-xs">
            <p className="text-gray-700 mb-2"><strong>Request Format:</strong></p>
            <p className="text-gray-600">• Method: POST</p>
            <p className="text-gray-600">• Content-Type: multipart/form-data</p>
            <p className="text-gray-600">• Body: FormData with files</p>
            <br />
            <p className="text-gray-700 mb-2"><strong>FormData Fields:</strong></p>
            <p className="text-gray-600">• files (or file for single upload): File object(s)</p>
            <p className="text-gray-600">• uploadDate: ISO timestamp</p>
            <p className="text-gray-600">• fileCount: Number of files</p>
            <br />
            <p className="text-gray-700 mb-2"><strong>Expected Response:</strong></p>
            <p className="text-gray-600">• Status: 200 OK</p>
            <p className="text-gray-600">• Body: JSON object with upload details</p>
          </div>
        </div>

        {/* Integration Example */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">🔧 Integration Example</h3>
          <div className="bg-white rounded border border-green-200 p-4 font-mono text-xs space-y-2 overflow-x-auto">
            <pre className="text-gray-700">{`import { FileUploadComponent } from './FileUploadComponent';

// In your component
<FileUploadComponent
  title="Upload Resume"
  apiEndpoint="/api/upload/resume"
  acceptedFileTypes=".pdf,.doc,.docx"
  maxFileSize={5}
  multiple={false}
  onUploadSuccess={(response) => {
    console.log('Upload successful:', response);
    // Handle success (e.g., update state, show message)
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error);
    // Handle error (e.g., show error message)
  }}
/>`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadExample;

