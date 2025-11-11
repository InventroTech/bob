import React from 'react';
import { FileUploadExample } from '@/components/ATScomponents/FileUploadExample';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * File Upload Demo Page
 * 
 * This page demonstrates the FileUploadComponent with various configurations.
 * You can test all the different upload scenarios here.
 * 
 * To add this page to your routes, add the following to your router:
 * 
 * import FileUploadDemo from '@/pages/FileUploadDemo';
 * 
 * <Route path="/demo/file-upload" element={<FileUploadDemo />} />
 */

const FileUploadDemo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">File Upload Component Demo</h1>
              <p className="text-sm text-gray-600 mt-1">
                Test the file upload component with different configurations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="max-w-7xl mx-auto">
        <FileUploadExample />
      </div>

      {/* Footer with Instructions */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Demo Instructions</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              This demo page shows various configurations of the FileUploadComponent.
              Try uploading different file types to see how validation works.
            </p>
            <p className="font-medium mt-4">Note:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The API endpoints shown are examples - replace with your actual endpoints</li>
              <li>File uploads will fail unless you have backend endpoints set up</li>
              <li>All client-side validation (file type, size) works without a backend</li>
              <li>Check the browser console to see the upload attempts</li>
            </ul>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Files Created:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• FileUploadComponent.tsx (Main component)</li>
                <li>• FileUploadConfig.tsx (Configuration)</li>
                <li>• FileUploadExample.tsx (Examples)</li>
                <li>• FileUploadIntegrationGuide.tsx (Patterns)</li>
                <li>• FileUpload_README.md (Documentation)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Drag and drop support</li>
                <li>✅ File type validation</li>
                <li>✅ File size validation</li>
                <li>✅ Multiple file upload</li>
                <li>✅ Image preview</li>
                <li>✅ API POST integration</li>
                <li>✅ Error handling</li>
                <li>✅ Progress indicators</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-6 bg-gray-900 text-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">💻 Quick Start Code</h3>
          <pre className="text-xs overflow-x-auto">
{`import { FileUploadComponent } from '@/components/ATScomponents/FileUploadComponent';

function MyComponent() {
  const handleUploadSuccess = (response: any) => {
    console.log('Upload successful:', response);
    // Handle the uploaded file(s)
  };

  return (
    <FileUploadComponent
      title="Upload Your Resume"
      description="Upload PDF, DOC, or DOCX"
      apiEndpoint="/api/upload/resume"
      acceptedFileTypes=".pdf,.doc,.docx"
      maxFileSize={5}
      multiple={false}
      onUploadSuccess={handleUploadSuccess}
      onUploadError={(error) => console.error(error)}
    />
  );
}`}
          </pre>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-16" />
    </div>
  );
};

export default FileUploadDemo;

