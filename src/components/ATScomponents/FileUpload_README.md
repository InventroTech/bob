# FileUploadComponent Documentation

A fully-featured file upload component with drag-and-drop functionality, file validation, and API integration.

## Features

✅ **Drag and Drop** - Drag files into the upload area  
✅ **Click to Browse** - Traditional file browser  
✅ **File Validation** - Type and size validation  
✅ **Multiple Files** - Support for single or multiple file uploads  
✅ **Preview** - Image preview for uploaded images  
✅ **Progress Feedback** - Visual feedback during upload  
✅ **API Integration** - POST request to custom endpoint  
✅ **Error Handling** - Comprehensive error handling with callbacks  
✅ **Responsive Design** - Works on all screen sizes  

## Installation

The component is already available in the ATS components directory:
```
src/components/ATScomponents/FileUploadComponent.tsx
```

## Basic Usage

```typescript
import { FileUploadComponent } from './FileUploadComponent';

function MyComponent() {
  return (
    <FileUploadComponent
      apiEndpoint="/api/upload"
      acceptedFileTypes=".pdf,.doc,.docx"
      maxFileSize={10}
      multiple={true}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | 'Upload Files' | Header title for the component |
| `description` | string | 'Drag and drop files...' | Description text in drop area |
| `apiEndpoint` | string | **Required** | API endpoint for POST request |
| `acceptedFileTypes` | string | '*' | Accepted file types (e.g., ".pdf,.doc" or "image/*") |
| `maxFileSize` | number | 10 | Maximum file size in MB |
| `multiple` | boolean | true | Allow multiple file uploads |
| `className` | string | '' | Additional CSS classes |
| `onUploadSuccess` | function | undefined | Callback on successful upload |
| `onUploadError` | function | undefined | Callback on upload error |

## File Type Formats

### Specific Extensions
```typescript
acceptedFileTypes=".pdf,.doc,.docx"
```

### MIME Type Wildcards
```typescript
acceptedFileTypes="image/*"  // All images
acceptedFileTypes="video/*"  // All videos
acceptedFileTypes="audio/*"  // All audio
```

### Any File Type
```typescript
acceptedFileTypes="*"
```

## Preset Configurations

Use predefined configurations from `FileUploadConfig.tsx`:

```typescript
import { fileUploadPresets } from './FileUploadConfig';

// Resume upload
<FileUploadComponent
  {...fileUploadPresets.resume}
  apiEndpoint="/api/upload/resume"
/>

// Portfolio images
<FileUploadComponent
  {...fileUploadPresets.portfolioImages}
  apiEndpoint="/api/upload/images"
/>

// CSV import
<FileUploadComponent
  {...fileUploadPresets.csvImport}
  apiEndpoint="/api/import/csv"
/>
```

### Available Presets

- `resume` - Single PDF/DOC resume upload
- `coverLetter` - Single cover letter upload
- `portfolioImages` - Multiple image uploads
- `profilePhoto` - Single profile photo
- `supportingDocuments` - Multiple supporting documents
- `csvImport` - CSV file import
- `generalDocuments` - Any document type
- `applicationBundle` - Multiple application documents

## API Integration

### Request Format

The component sends a `multipart/form-data` POST request:

```typescript
POST /api/upload
Content-Type: multipart/form-data

FormData fields:
- files (or file): File object(s)
- uploadDate: ISO timestamp
- fileCount: Number of files
```

### Expected Response

The API should return a JSON response:

```typescript
{
  "success": true,
  "message": "Files uploaded successfully",
  "files": [
    {
      "filename": "abc123.pdf",
      "originalName": "resume.pdf",
      "size": 123456,
      "url": "/uploads/abc123.pdf",
      "mimeType": "application/pdf"
    }
  ],
  "uploadDate": "2024-01-01T12:00:00Z",
  "fileCount": 1
}
```

### Example Backend (Node.js/Express)

```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.array('files'), (req, res) => {
  const files = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    url: `/uploads/${file.filename}`,
    mimeType: file.mimetype
  }));

  res.json({
    success: true,
    message: 'Files uploaded successfully',
    files,
    uploadDate: new Date().toISOString(),
    fileCount: files.length
  });
});
```

## Callbacks

### onUploadSuccess

Called when upload completes successfully:

```typescript
<FileUploadComponent
  apiEndpoint="/api/upload"
  onUploadSuccess={(response) => {
    console.log('Upload successful!', response);
    // Update UI, show success message, etc.
  }}
/>
```

### onUploadError

Called when upload fails:

```typescript
<FileUploadComponent
  apiEndpoint="/api/upload"
  onUploadError={(error) => {
    console.error('Upload failed:', error);
    // Show error message, log error, etc.
  }}
/>
```

## Complete Examples

### Example 1: Job Application Resume Upload

```typescript
import { FileUploadComponent } from './FileUploadComponent';
import { toast } from 'sonner';

function JobApplicationForm() {
  const handleResumeUpload = (response: any) => {
    // Save the resume URL to application data
    setApplicationData(prev => ({
      ...prev,
      resumeUrl: response.files[0].url
    }));
    toast.success('Resume uploaded successfully!');
  };

  return (
    <FileUploadComponent
      title="Upload Your Resume"
      description="PDF, DOC, or DOCX format (max 5MB)"
      apiEndpoint="/api/applications/resume"
      acceptedFileTypes=".pdf,.doc,.docx"
      maxFileSize={5}
      multiple={false}
      onUploadSuccess={handleResumeUpload}
    />
  );
}
```

### Example 2: Portfolio Images

```typescript
function PortfolioUpload() {
  const [portfolioImages, setPortfolioImages] = useState([]);

  const handleImagesUpload = (response: any) => {
    setPortfolioImages(prev => [...prev, ...response.files]);
    toast.success(`Uploaded ${response.fileCount} image(s)`);
  };

  return (
    <div>
      <FileUploadComponent
        title="Upload Portfolio Images"
        apiEndpoint="/api/portfolio/images"
        acceptedFileTypes="image/*"
        maxFileSize={10}
        multiple={true}
        onUploadSuccess={handleImagesUpload}
      />
      
      {/* Display uploaded images */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {portfolioImages.map((img, idx) => (
          <img key={idx} src={img.url} alt={img.originalName} />
        ))}
      </div>
    </div>
  );
}
```

### Example 3: CSV Data Import

```typescript
function DataImport() {
  const handleCsvUpload = async (response: any) => {
    // Process the CSV data
    const data = await parseCSV(response.files[0].url);
    toast.success(`Imported ${data.length} rows`);
  };

  return (
    <FileUploadComponent
      title="Import CSV Data"
      description="Upload a CSV file with customer data"
      apiEndpoint="/api/import/csv"
      acceptedFileTypes=".csv"
      maxFileSize={50}
      multiple={false}
      onUploadSuccess={handleCsvUpload}
    />
  );
}
```

## Styling

The component uses Tailwind CSS and shadcn/ui components. You can customize it by:

### 1. Adding Custom Classes

```typescript
<FileUploadComponent
  className="my-custom-upload"
  apiEndpoint="/api/upload"
/>
```

### 2. Modifying the Component

Edit `FileUploadComponent.tsx` to change colors, sizes, or layout.

### 3. Theme Integration

The component automatically inherits your shadcn/ui theme configuration.

## Validation

### Client-Side Validation

The component validates files before upload:

1. **File Size** - Checks against `maxFileSize` prop
2. **File Type** - Validates against `acceptedFileTypes`
3. **User Feedback** - Shows toast notifications for invalid files

### Server-Side Validation

Always validate on the server:

```javascript
// Example: Validate file size and type
app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  
  // Validate size
  if (file.size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large' });
  }
  
  // Validate type
  const allowedTypes = ['application/pdf', 'application/msword'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  res.json({ success: true, file });
});
```

## Error Handling

The component handles various error scenarios:

- **Network Errors** - Failed API requests
- **Invalid Files** - Wrong type or size
- **Server Errors** - 4xx/5xx responses
- **Validation Errors** - Client-side validation

All errors trigger toast notifications and the `onUploadError` callback.

## Accessibility

- Keyboard navigation support
- Screen reader friendly
- Focus indicators
- ARIA labels

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Files Not Uploading

1. Check API endpoint is correct
2. Verify CORS is configured
3. Check file size limits
4. Verify file type is accepted

### Drag and Drop Not Working

1. Ensure browser supports drag and drop
2. Check for conflicting event handlers
3. Verify file types are accepted

### Preview Not Showing

- Preview only works for image files
- Check image URL is accessible
- Verify CORS for image loading

## Testing

```typescript
// Example test
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadComponent } from './FileUploadComponent';

test('renders file upload component', () => {
  render(<FileUploadComponent apiEndpoint="/api/upload" />);
  expect(screen.getByText(/upload files/i)).toBeInTheDocument();
});

test('handles file selection', () => {
  const { container } = render(<FileUploadComponent apiEndpoint="/api/upload" />);
  const input = container.querySelector('input[type="file"]');
  
  const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  
  expect(screen.getByText('test.pdf')).toBeInTheDocument();
});
```

## License

MIT

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.

