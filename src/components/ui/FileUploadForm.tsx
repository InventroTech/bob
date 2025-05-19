import React, { useRef, useState, useEffect } from 'react';
import { FaFileAlt, FaImage } from 'react-icons/fa';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

// --- Supabase Configuration ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BUCKET_NAME = import.meta.env.VITE_SUPABASE_BUCKET_NAME;

let supabase: SupabaseClient | undefined;
if (supabaseUrl && supabaseAnonKey && BUCKET_NAME) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    "Supabase configuration is missing. File uploads will not work. " +
    "Ensure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_SUPABASE_BUCKET_NAME are set."
  );
}
// --- End Supabase Configuration ---

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

  // Fetches user details (like name) from your custom 'users' table using the email from Supabase Auth.
  const fetchAppUserDetails = async (authUser: SupabaseUser | null): Promise<AppUserData | null> => {
    if (!supabase) {
      console.error('Supabase client not initialized in fetchAppUserDetails');
      return null;
    }
    if (!authUser || !authUser.email) {
      console.log('No Supabase authenticated user or email found.');
      setAppUser(null); // Clear local app user state
      return null;
    }

    console.log('=== Fetching App User Details for email from Supabase Auth:', authUser.email, '===');
    try {
      const { data: userDetailsFromDB, error } = await supabase
        .from('users') // Your custom table storing user profiles
        .select('id, name') // Assuming 'name' is the column for the user's display name
        .eq('email', authUser.email)
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching user details from "users" table:', error.message);
        setMessage(`Error: Could not fetch profile for ${authUser.email}.`);
        setAppUser(null);
        return null;
      }

      if (userDetailsFromDB) {
        console.log('=== App User Details Retrieved from DB ===', userDetailsFromDB);
        const fetchedAppUser: AppUserData = {
            id: userDetailsFromDB.id,
            name: userDetailsFromDB.name,
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
    if (supabaseUrl && supabaseAnonKey && BUCKET_NAME) {
      setIsSupabaseConfigured(true);
      console.log('Supabase is configured.');

      if (!supabase) {
        console.error("Supabase client could not be initialized despite config values present.");
        setIsSupabaseConfigured(false); // Mark as not configured if client is still undefined
        setMessage("Error: Supabase client initialization failed.");
        return;
      }

      // Immediately fetch current user on load
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        console.log('Initial Supabase Auth User:', authUser);
        if (authUser) {
          fetchAppUserDetails(authUser);
          // Set the user_email in localStorage if your other components rely on it.
          // However, this component will now prioritize the auth session.
          localStorage.setItem('user_email', authUser.email || '');
        } else {
          setAppUser(null);
          localStorage.removeItem('user_email'); // Clear if no auth user
        }
      });

      // Listen for Supabase auth state changes (login, logout)
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
        if (authListener && typeof authListener.subscription?.unsubscribe === 'function') {
          authListener.subscription.unsubscribe();
          console.log("Unsubscribed from Supabase auth changes.");
        }
      };
    } else {
      setIsSupabaseConfigured(false);
      console.error('Supabase is NOT configured on mount. Check .env variables.');
      let missingVars = [];
      if (!supabaseUrl) missingVars.push("VITE_SUPABASE_URL");
      if (!supabaseAnonKey) missingVars.push("VITE_SUPABASE_ANON_KEY");
      if (!BUCKET_NAME) missingVars.push("VITE_SUPABASE_BUCKET_NAME");
      setMessage(`Error: Supabase config missing: ${missingVars.join(', ')}`);
    }
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

    if (!isSupabaseConfigured || !supabase) {
      console.error('Upload failed: Supabase not configured');
      setMessage('Supabase is not configured correctly. Cannot upload.');
      return;
    }

    // Get the most current Supabase authenticated user
    console.log('Fetching current auth user...');
    const { data: { user: currentAuthUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentAuthUser) {
      console.error('Auth error or no user:', authError);
      setMessage('Error: Could not verify authentication. Please sign in again.');
      setUploading(false);
      return;
    }

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
        
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME!) 
          .upload(pdfFilePath, pdfFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'application/pdf'
          });

        if (error) {
          throw new Error(`PDF Upload Error: ${error.message}`);
        }
        console.log('PDF Upload Success:', data);
        currentMessages.push(`PDF "${pdfFile.name}" uploaded.`);
      }

      if (imageFile) {
        const imageFilePath = `public/images/${sanitizedUserName}/${sanitizedLeadName}/${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
        console.log('Attempting to upload Image to:', imageFilePath);

        const { data, error } = await supabase.storage
          .from(BUCKET_NAME!)
          .upload(imageFilePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type 
          });

        if (error) {
          throw new Error(`Image Upload Error: ${error.message}`);
        }
        console.log('Image Upload Success:', data);
        currentMessages.push(`Image "${imageFile.name}" uploaded.`);
      }

      if (link) {
        console.log('Processing link:', link);
        try {
          // Create a text file with the link
          const linkFileName = `link_${Date.now()}.txt`;
          const linkContent = new Blob([link], { type: 'text/plain' });
          const linkFilePath = `public/links/${sanitizedUserName}/${sanitizedLeadName}/${linkFileName}`;
          
          console.log('Storing link in storage:', linkFilePath);
          
          const { data: linkData, error: linkError } = await supabase.storage
            .from(BUCKET_NAME!)
            .upload(linkFilePath, linkContent, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'text/plain'
            });

          if (linkError) {
            throw new Error(`Link Storage Error: ${linkError.message}`);
          }

          // Get the public URL for the stored link
          const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME!)
            .getPublicUrl(linkFilePath);

          console.log('Link stored successfully at:', publicUrl);
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