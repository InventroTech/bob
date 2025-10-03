import React, { useRef, useState, useEffect } from 'react';
import { FaFileAlt, FaImage } from 'react-icons/fa';
import { apiService } from '@/lib/apiService';
import { authService } from '@/lib/authService';

interface FileUploadFormProps {
  leadId: string;
  leadName: string;
}

interface AppUserData { // Renamed to avoid confusion with SupabaseUser
  id: number; 
  name: string;
}

const FileUploadForm: React.FC<FileUploadFormProps> = ({ leadId, leadName }) => {
  const [link, setLink] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [appUser, setAppUser] = useState<AppUserData | null>(null); // Stores {id, name} from your 'users' table

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetches user details (like name) from your custom 'users' table using the email from Auth.
  const fetchAppUserDetails = async (authUser: any): Promise<AppUserData | null> => {
    if (!authUser || !authUser.email) {
      console.log('No authenticated user or email found.');
      setAppUser(null); // Clear local app user state
      return null;
    }

    console.log('=== Fetching App User Details for email from Auth:', authUser.email, '===');
    try {
      // Use API service to get user details
      const response = await fetch(`${import.meta.env.VITE_RENDER_API_URL}/users/by-email/${authUser.email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user details: ${response.statusText}`);
      }

      const userDetailsFromDB = await response.json();

      if (userDetailsFromDB && userDetailsFromDB.success) {
        console.log('=== App User Details Retrieved from DB ===', userDetailsFromDB.data);
        const userData = userDetailsFromDB.data;
        const fetchedAppUser: AppUserData = {
            id: userData.id,
            name: userData.name,
        };
        setAppUser(fetchedAppUser);
        return fetchedAppUser;
      } else {
        console.warn('No user profile found in "users" table for email:', authUser.email);
        setMessage(`Warning: No profile found for ${authUser.email}. Uploads may use default naming or fail if name is critical.`);
        setAppUser(null);
        return null;
      }
    } catch (e: any) {
      console.error('Exception in fetchAppUserDetails:', e.message);
      setAppUser(null);
      return null;
    }
  };

  // Effect for initial Supabase config check and setting up auth listener
  useEffect(() => {
    console.log('=== FileUploadForm Mount/Config Check ===');
    setIsSupabaseConfigured(true); // Always true since we're using API endpoints now

      // Immediately fetch current user on load
      authService.getUser().then((response) => {
        if (response.success && response.data) {
          console.log('Initial Auth User:', response.data);
          fetchAppUserDetails(response.data);
          // Set the user_email in localStorage if your other components rely on it.
          // However, this component will now prioritize the auth session.
          localStorage.setItem('user_email', response.data.email || '');
        } else {
          setAppUser(null);
          localStorage.removeItem('user_email'); // Clear if no auth user
        }
      });

      // Listen for auth state changes using authService
      const unsubscribe = authService.onAuthStateChange(async (event, session) => {
        console.log('Supabase Auth State Change:', event, session);
        const authUser = session?.user ?? null;
        if (authUser) {
          await fetchAppUserDetails(authUser);
          // Update localStorage as well, for other parts of the app that might still use it.
          localStorage.setItem('user_email', authUser.email || '');
          console.log(`Auth state changed. User: ${authUser.email}. localStorage updated.`);
        } else {
          setAppUser(null);
          localStorage.removeItem('user_email');
          console.log('Auth state changed. No user. localStorage cleared.');
          setMessage('You are not signed in. Please sign in to upload.');
        }
      });

      return () => {
        unsubscribe();
        console.log("Unsubscribed from auth changes.");
      };
  }, []); // Runs once on mount

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    } else {
      setPdfFile(null);
    }
    setMessage('');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
    setMessage('');
  };

  const handleUpload = async () => {
    console.log('=== Upload Button Clicked ===');
    console.log('Current state:', {
      uploading,
      hasFile: !!(pdfFile || imageFile || link),
      isConfigured: isSupabaseConfigured,
      user: appUser
    });

    if (!isSupabaseConfigured) {
      console.error('Upload failed: Not configured');
      setMessage('System is not configured correctly. Cannot upload.');
      return;
    }

    // Get the most current authenticated user
    console.log('Fetching current auth user...');
    const userResponse = await authService.getUser();

    if (!userResponse.success || !userResponse.data) {
      console.error('Auth error or no user:', userResponse.error);
      setMessage('Error: Could not verify authentication. Please sign in again.');
      setUploading(false);
      return;
    }

    const currentAuthUser = userResponse.data;
    console.log('Current auth user:', currentAuthUser.email);
    
    // Fetch app user details
    console.log('Fetching app user details...');
    const userForPath = await fetchAppUserDetails(currentAuthUser);

    if (!userForPath) {
      console.error('No app user details found');
      setMessage('Error: User profile not found or incomplete. Cannot determine upload path.');
      setUploading(false);
      return;
    }

    console.log('User details for upload:', userForPath);

    if (!leadId || !leadName) {
      setMessage('Error: Lead information (ID and Name) is required for upload.');
      setUploading(false);
      return;
    }

    if (!pdfFile && !imageFile && !link) {
      setMessage('Please select a file or provide a link to upload.');
      setUploading(false);
      return;
    }

    setUploading(true);
    setMessage(''); 
    let currentMessages = [];

    try {
      // Use the name from the fetched appUser (userForPath.name)
      const sanitizedUserName = userForPath.name.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
      const sanitizedLeadName = leadName.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');

      if (pdfFile) {
        const pdfFilePath = `public/pdfs/${sanitizedUserName}/${sanitizedLeadName}/${Date.now()}-${pdfFile.name.replace(/\s+/g, '_')}`;
        console.log('Attempting to upload PDF to:', pdfFilePath);
        
        const response = await apiService.uploadFile(pdfFile, pdfFilePath);
        if (!response.success) {
          throw new Error(`PDF Upload Error: ${response.error}`);
        }
        const data = response.data;
        console.log('PDF Upload Success:', data);
        currentMessages.push(`PDF "${pdfFile.name}" uploaded.`);
      }

      if (imageFile) {
        const imageFilePath = `public/images/${sanitizedUserName}/${sanitizedLeadName}/${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
        console.log('Attempting to upload Image to:', imageFilePath);

        const response = await apiService.uploadFile(imageFile, imageFilePath);
        if (!response.success) {
          throw new Error(`Image Upload Error: ${response.error}`);
        }
        const data = response.data;
        console.log('Image Upload Success:', data);
        currentMessages.push(`Image "${imageFile.name}" uploaded.`);
      }

      if (link) {
        console.log('Processing link:', link);
        try {
          // Create a text file with the link
          const linkFileName = `link_${Date.now()}.txt`;
          const linkContent = new File([link], linkFileName, { type: 'text/plain' });
          const linkFilePath = `public/links/${sanitizedUserName}/${sanitizedLeadName}/${linkFileName}`;
          
          console.log('Storing link in storage:', linkFilePath);
          
          const response = await apiService.uploadFile(linkContent, linkFilePath);
          if (!response.success) {
            throw new Error(`Link Storage Error: ${response.error}`);
          }

          // Get the public URL for the stored link
          const urlResponse = await apiService.getFileUrl(linkFilePath);
          if (urlResponse.success) {
            const publicUrl = urlResponse.data;
            console.log('Link stored successfully at:', publicUrl);
          }
          currentMessages.push(`Link "${link}" stored.`);
        } catch (linkErr: any) {
          console.error('Error storing link:', linkErr);
          throw new Error(`Failed to store link: ${linkErr.message}`);
        }
      }

      if (currentMessages.length > 0) {
        setMessage(currentMessages.join(' '));
        setLink('');
        setPdfFile(null);
        setImageFile(null);
        if(pdfInputRef.current) pdfInputRef.current.value = '';
        if(imageInputRef.current) imageInputRef.current.value = '';
      }

    } catch (err: any) {
      console.error('Upload process failed:', err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2 p-4 bg-white shadow rounded-lg">
      <label className="block text-sm font-medium text-gray-700">Attachment</label>
      <div className="flex items-center border border-gray-300 rounded-lg px-4 py-2 gap-4 w-full focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <input
          type="text"
          placeholder="Paste link here"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="flex-grow outline-none bg-transparent text-sm"
          disabled={uploading || !isSupabaseConfigured || !appUser}
        />

        <div
          onClick={() => !uploading && isSupabaseConfigured && appUser && pdfInputRef.current?.click()}
          className={`flex items-center gap-2 text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors ${uploading || !isSupabaseConfigured || !appUser ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={pdfFile ? pdfFile.name : "Add PDF File"}
        >
          <FaFileAlt className="text-lg" />
          <span className="text-xs truncate max-w-[80px] sm:max-w-[100px]">{pdfFile ? pdfFile.name : 'Add File'}</span>
          <input
            type="file"
            accept="application/pdf"
            ref={pdfInputRef}
            onChange={handlePdfFileChange}
            className="hidden"
            disabled={uploading || !isSupabaseConfigured || !appUser}
          />
        </div>

        <div
          onClick={() => !uploading && isSupabaseConfigured && appUser && imageInputRef.current?.click()}
          className={`flex items-center gap-2 text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors ${uploading || !isSupabaseConfigured || !appUser ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={imageFile ? imageFile.name : "Add Image File"}
        >
          <FaImage className="text-lg" />
          <span className="text-xs truncate max-w-[80px] sm:max-w-[100px]">{imageFile ? imageFile.name : 'Add Image'}</span>
          <input
            type="file"
            accept="image/*"
            ref={imageInputRef}
            onChange={handleImageFileChange}
            className="hidden"
            disabled={uploading || !isSupabaseConfigured || !appUser}
          />
        </div>
      </div>

      <button
        onClick={handleUpload}
        className="w-full mt-3 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        disabled={uploading || (!pdfFile && !imageFile && !link) || !isSupabaseConfigured || !appUser}
      >
        {uploading ? 'Uploading...' : (appUser ? 'Upload Attachments' : 'Sign In to Upload')}
      </button>

      {message && (
        <p className={`mt-3 text-xs text-center ${message.toLowerCase().startsWith('error:') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}
      {!isSupabaseConfigured && (
        <p className="mt-3 text-xs text-center text-red-500">
          Warning: File upload system is not configured. Check environment variables.
        </p>
      )}
      {!appUser && isSupabaseConfigured && (
        <p className="mt-3 text-xs text-center text-orange-500">
          Please sign in to attach files.
        </p>
      )}
    </div>
  );
};

export default FileUploadForm;