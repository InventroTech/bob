'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import DashboardLayout from '../layout/DashboardLayout';
import { LeadTableComponent } from './LeadTableComponent';
import Papa from 'papaparse';

interface Lead {
  id?: string;  // Make id optional since it's auto-generated
  name: string;
  age?: string;
  phone: string;
  email: string;
  party: string;
  partycolor?: string;
  textcolor?: string;
  flag?: string;
  address?: string;
  tag?: string;
  image?: string;
  notes?: string;
  lastconnected?: string;
  info?: string;
  status?: string;
}

// Define expected columns with required fields marked
const EXPECTED_COLUMNS = [
  'name',
  'age',
  'phone',
  'email',
  'party',
  'partycolor',
  'textcolor',
  'flag',
  'address',
  'tag',
  'image',
  'notes',
  'lastconnected',
  'info',
  'status'
];

const REQUIRED_COLUMNS = ['name', 'phone', 'email', 'party'];

const SAMPLE_DATA = [
  {
    name: 'John Doe',
    age: '35',
    phone: '1234567890',
    email: 'john@example.com',
    party: 'Democratic',
    partycolor: 'blue',
    textcolor: 'white',
    flag: '🏳️',
    address: '123 Main St',
    tag: 'VIP',
    image: '',
    notes: 'Sample notes',
    lastconnected: '2024-03-20T00:00:00Z',
    info: 'Additional information',
    status: 'Active'
  }
];

export const LeadFormComponent = () => {
  const [formData, setFormData] = useState<Lead>({
    name: '',
    age: '',
    phone: '',
    email: '',
    party: '',
    partycolor: '',
    textcolor: '',
    flag: '',
    address: '',
    tag: '',
    image: '',
    notes: '',
    lastconnected: '',
    info: '',
    status: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const downloadTemplate = () => {
    try {
      const headerComment = `# Lead Import Template Instructions:
# 1. Do not modify the header row
# 2. Each field that contains commas must be enclosed in double quotes
# 3. If a field contains double quotes, escape them with another double quote (e.g., "John ""The Doc"" Smith")
# 4. Do not use single quotes
# 5. Required fields: name, phone, email, party
# 6. Dates should be in YYYY-MM-DD HH:mm:ss format
#\n`;

      const csv = Papa.unparse(SAMPLE_DATA, {
        quotes: true,
        quoteChar: '"',
      });

      const csvWithInstructions = headerComment + csv;
      const blob = new Blob([csvWithInstructions], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leads_template.csv';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error: any) {
      console.error('Template download error:', error);
      setMessage('Error creating template. Please try again or contact support.');
    }
  };

  const validateData = (data: Lead) => {
    const errors: string[] = [];
    
    if (!data.name?.trim()) errors.push('Name is required');
    if (!data.phone?.trim()) errors.push('Phone is required');
    if (!data.email?.trim()) errors.push('Email is required');
    if (!data.party?.trim()) errors.push('Party is required');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email.trim())) {
      errors.push('Invalid email format');
    }

    // Phone number validation (basic)
    const phoneRegex = /^\+?[\d\s-()]+$/;
    if (data.phone && !phoneRegex.test(data.phone.trim())) {
      errors.push('Invalid phone number format');
    }

    return errors;
  };

  const checkForDuplicates = async (data: Lead[]) => {
    const duplicates: { email: string[]; phone: string[] } = {
      email: [],
      phone: []
    };

    // First check for duplicates within the CSV file itself
    const emails = new Set<string>();
    const phones = new Set<string>();
    
    data.forEach((row, index) => {
      const email = row.email?.trim().toLowerCase();
      const phone = row.phone?.trim();
      
      if (email && emails.has(email)) {
        duplicates.email.push(`Row ${index + 2}: ${email}`);
      } else if (email) {
        emails.add(email);
      }
      
      if (phone && phones.has(phone)) {
        duplicates.phone.push(`Row ${index + 2}: ${phone}`);
      } else if (phone) {
        phones.add(phone);
      }
    });

    // Then check against the database
    try {
      // Check emails
      const { data: existingEmails } = await supabase
        .from('leads_table')
        .select('email')
        .in('email', Array.from(emails));

      if (existingEmails && existingEmails.length > 0) {
        existingEmails.forEach(row => {
          duplicates.email.push(`Database: ${row.email}`);
        });
      }

      // Check phones
      const { data: existingPhones } = await supabase
        .from('leads_table')
        .select('phone')
        .in('phone', Array.from(phones));

      if (existingPhones && existingPhones.length > 0) {
        existingPhones.forEach(row => {
          duplicates.phone.push(`Database: ${row.phone}`);
        });
      }

      return duplicates;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      throw new Error('Failed to check for duplicates. Please try again.');
    }
  };

  const cleanLeadData = (lead: Lead): Omit<Lead, 'id'> => {
    // Create a new object without the id field
    const { id, ...cleanedLead } = lead;
    
    return {
      ...cleanedLead,
      name: cleanedLead.name?.trim(),
      phone: cleanedLead.phone?.trim(),
      email: cleanedLead.email?.trim().toLowerCase(),
      party: cleanedLead.party?.trim(),
      lastconnected: cleanedLead.lastconnected ? new Date(cleanedLead.lastconnected).toISOString() : null
    };
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setMessage('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // First check if file is too large
      if (csvFile.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File is too large. Please keep it under 10MB.');
      }

      // Check if file is empty
      if (csvFile.size === 0) {
        throw new Error('File is empty. Please check the file and try again.');
      }

      // Use FileReader instead of text() method
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const text = event.target?.result;
          if (typeof text !== 'string') {
            throw new Error('Failed to read file content');
          }

          const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

          Papa.parse<Lead>(cleanText, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (header) => header.trim().toLowerCase(),
            quoteChar: '"',
            escapeChar: '"',
            complete: async (results) => {
              const { data, errors, meta } = results;
              
              console.log('CSV Headers:', meta.fields);
              console.log('First row of data:', data[0]);
              
              if (errors && errors.length > 0) {
                // Group errors by type for better reporting
                const quoteErrors = errors.filter(e => e.code === 'InvalidQuotes');
                const fieldErrors = errors.filter(e => e.code === 'TooManyFields' || e.code === 'TooFewFields');
                const otherErrors = errors.filter(e => !quoteErrors.includes(e) && !fieldErrors.includes(e));
                
                let errorMessage = 'CSV parsing errors found:\\n\\n';
                
                if (quoteErrors.length > 0) {
                  errorMessage += 'Quote Errors (fix these first):\\n';
                  errorMessage += '- Make sure all fields containing commas are properly enclosed in double quotes\\n';
                  errorMessage += '- If a field contains quotes, escape them by doubling them (e.g., "John ""The Doc"" Smith")\\n';
                  errorMessage += '- Remove any single quotes, use only double quotes\\n\\n';
                }
                
                if (fieldErrors.length > 0) {
                  errorMessage += 'Field Count Errors:\\n';
                  errorMessage += '- Each row must have exactly 15 fields\\n';
                  errorMessage += `- Expected fields: ${EXPECTED_COLUMNS.join(', ')}\\n`;
                  errorMessage += '- Check for extra commas in your data\\n\\n';
                }
                
                if (otherErrors.length > 0) {
                  errorMessage += 'Other Errors:\\n';
                  otherErrors.forEach(err => {
                    errorMessage += `- Row ${err.row !== undefined ? err.row + 2 : 'unknown'}: ${err.message}\\n`;
                  });
                }
                
                errorMessage += '\\nPlease download the template for reference.';
                setMessage(errorMessage);
                setLoading(false);
                return;
              }

              if (!data || data.length === 0) {
                setMessage('No valid data found in CSV file');
                setLoading(false);
                return;
              }

              try {
                // Check headers first
                const headers = Object.keys(data[0] || {});
                const missingRequired = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
                
                if (missingRequired.length > 0) {
                  setMessage(`Missing required columns: ${missingRequired.join(', ')}\\nPlease download the template for the correct format.`);
                  setLoading(false);
                  return;
                }

                // Validate and clean data
                const validatedData = [];
                const validationErrors = [];

                for (let i = 0; i < data.length; i++) {
                  const row = data[i];
                  const rowNum = i + 1;
                  const errors = validateData(row);

                  if (errors.length > 0) {
                    validationErrors.push(`Row ${rowNum}: ${errors.join(', ')}`);
                    continue;
                  }

                  // Clean the data and remove id field
                  validatedData.push(cleanLeadData(row));
                }

                if (validationErrors.length > 0) {
                  setMessage(`Validation errors:\\n${validationErrors.join('\\n')}`);
                  setLoading(false);
                  return;
                }

                // Check for duplicates before attempting insert
                const duplicates = await checkForDuplicates(validatedData);
                if (duplicates.email.length > 0 || duplicates.phone.length > 0) {
                  let duplicateMessage = 'Duplicate entries found:\\n\\n';
                  
                  if (duplicates.email.length > 0) {
                    duplicateMessage += 'Duplicate Emails:\\n' + duplicates.email.join('\\n') + '\\n\\n';
                  }
                  
                  if (duplicates.phone.length > 0) {
                    duplicateMessage += 'Duplicate Phone Numbers:\\n' + duplicates.phone.join('\\n');
                  }
                  
                  duplicateMessage += '\\n\\nPlease remove duplicates and try again.';
                  setMessage(duplicateMessage);
                  setLoading(false);
                  return;
                }

                // Process in batches
                const batchSize = 50;
                let successCount = 0;
                let errorCount = 0;

                for (let i = 0; i < validatedData.length; i += batchSize) {
                  const batch = validatedData.slice(i, i + batchSize);
                  const { error } = await supabase.from('leads_table').insert(batch);

                  if (error) {
                    console.error('Batch insert error:', error);
                    if (error.code === '23505') {
                      if (error.message.includes('leads_table_pkey')) {
                        // Skip this batch as it contains duplicate IDs
                        errorCount += batch.length;
                        continue;
                      }
                    }
                    errorCount += batch.length;
                  } else {
                    successCount += batch.length;
                  }

                  const progress = Math.round(((i + batchSize) / validatedData.length) * 100);
                  setUploadProgress(`Processed ${Math.min(i + batchSize, validatedData.length)} of ${validatedData.length} records (${progress}%)`);
                }

                if (errorCount > 0) {
                  setMessage(`Upload completed with some issues.\\nSuccessfully uploaded: ${successCount} leads\\nFailed to upload: ${errorCount} leads\\n\\nSome records may have failed due to duplicate emails or phone numbers.`);
                } else {
                  setMessage(`Successfully uploaded ${successCount} leads!`);
                }
                
                setCsvFile(null);
                setUploadProgress('');
              } catch (error: any) {
                console.error('Processing error:', error);
                setMessage(error.message);
              }
            },
            error: (error) => {
              console.error('CSV parsing error:', error);
              setMessage(`Error parsing CSV: ${error.message}\\n\\nTips:\\n1. Make sure your CSV is properly formatted\\n2. Download the template for reference\\n3. Check for special characters or incorrect quotes`);
            }
          });
        } catch (error: any) {
          console.error('Processing error:', error);
          setMessage(error.message);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setMessage('Error reading file. Please try downloading a fresh template and copying your data into it.');
        setLoading(false);
      };

      // Start reading the file
      reader.readAsText(csvFile);

    } catch (error: any) {
      console.error('File handling error:', error);
      setMessage(`Error handling file: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const validationErrors = validateData(formData);
    if (validationErrors.length > 0) {
      setMessage(`Validation errors:\\n${validationErrors.join('\\n')}`);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('leads_table')
        .insert([{
          ...formData,
          email: formData.email.trim().toLowerCase(),
          lastconnected: formData.lastconnected ? new Date(formData.lastconnected).toISOString() : null
        }]);

      if (error) {
        if (error.code === '23505') {
          setMessage('A lead with this email or phone number already exists.');
        } else {
          console.error('Insert error:', error);
          setMessage(`Insert failed: ${error.message}`);
        }
      } else {
        setMessage('Lead inserted successfully!');
        setFormData({
          name: '',
          age: '',
          phone: '',
          email: '',
          party: '',
          partycolor: '',
          textcolor: '',
          flag: '',
          address: '',
          tag: '',
          image: '',
          notes: '',
          lastconnected: '',
          info: '',
          status: ''
        });
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setMessage(`Unexpected error: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <DashboardLayout>
      {/* CSV Upload Section */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold mb-4">Bulk Upload Leads</h3>
        <div className="space-y-4">
          <div className="flex flex-col space-y-4">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 w-fit"
            >
              Download CSV Template
            </button>
            <div className="text-sm text-gray-600 space-y-2">
              <p>⚠️ Important CSV Guidelines:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use the template to ensure correct format</li>
                <li>Required fields: name, phone, email, party</li>
                <li>Enclose fields with commas in double quotes</li>
                <li>Escape quotes by doubling them (e.g., "John ""The Doc"" Smith")</li>
                <li>Each row must have exactly {EXPECTED_COLUMNS.length} fields</li>
                <li>Dates should be in YYYY-MM-DD HH:mm:ss format</li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-2">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  if (!e.target.files[0].name.toLowerCase().endsWith('.csv')) {
                    setMessage('Please upload a CSV file');
                    return;
                  }
                  setCsvFile(e.target.files[0]);
                  setMessage(null);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <button
            onClick={handleCsvUpload}
            disabled={loading || !csvFile}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Uploading...' : 'Upload CSV'}
          </button>
          {uploadProgress && (
            <div className="text-sm text-gray-600">{uploadProgress}</div>
          )}
        </div>
      </div>

      {/* Single Lead Form */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Add Single Lead</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key}>
              <label className="block font-medium capitalize">
                {key} {REQUIRED_COLUMNS.includes(key) && <span className="text-red-500">*</span>}
              </label>
              <input
                type={key === 'lastconnected' ? 'datetime-local' : 'text'}
                name={key}
                value={value}
                required={REQUIRED_COLUMNS.includes(key)}
                onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? 'Submitting...' : 'Submit Lead'}
          </button>
        </form>
      </div>

      {message && (
        <div className={`whitespace-pre-wrap mt-4 p-3 rounded ${
          message.includes('Error') || message.includes('failed') || message.includes('Missing') || message.includes('Validation')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <LeadTableComponent 
        config={{
          showFallbackOnly: true,
          emptyMessage: 'No leads data available. Please configure your data source.',
          title: 'Leads Table'
        }}
      />
    </DashboardLayout>
  );
}
