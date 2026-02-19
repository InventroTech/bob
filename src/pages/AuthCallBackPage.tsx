// /pages/AuthCallbackPage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { authService } from '@/lib/api/services/auth';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const fetchAndRedirect = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user?.email || !user?.id) {
        toast.error("Failed to complete login");
        navigate(`/app/${tenantSlug}/login`);
        return;
      }

      try {
        // NEW: Use centralized auth service to link user UID with email
        console.log('Linking user UID via auth service');
        console.log('Payload:', { uid: user.id, email: user.email });

        const result = await authService.linkUserUid(
          { uid: user.id, email: user.email },
          tenantSlug || 'bibhab-thepyro-ai'
        );

        if (result.success === false || result.error) {
          console.error('Error linking user UID:', result.error);
          // Don't block login for this error, just log it
          toast.error('Warning: User linking failed, but login will continue');
        } else {
          console.log('User UID linked successfully:', result);
        }

        /* BACKWARD COMPATIBILITY: Legacy fetch-based implementation
         * Uncomment below and comment above if you need to revert to old implementation
         * 
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (token) {
          const baseUrl = import.meta.env.VITE_RENDER_API_URL;
          const apiUrl = `${baseUrl}/accounts/link-user-uid/`;
          
          console.log('Linking user UID via:', apiUrl);
          console.log('Payload:', { uid: user.id, email: user.email });

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Tenant-Slug': 'bibhab-thepyro-ai'
            },
            body: JSON.stringify({
              uid: user.id,
              email: user.email
            })
          });

          if (result.success === false && result.error) {
            const errorCode = (result as any).code;
            const errorMessage = result.error || '';
            
            // Expected errors don't block login and don't show toast
            const isExpectedError = 
              errorCode === 'NO_TENANT_MEMBERSHIP' || 
              errorMessage.includes('No TenantMembership found') ||
              errorMessage.includes('already has a linked UID') ||
              errorMessage.includes('already linked');
            
            if (!isExpectedError) {
              // Only show toast for unexpected errors
              toast.error('Warning: User linking failed, but login will continue');
            }
          } else if (result.success === true) {
            // User was successfully linked (or already linked) - refresh session to get new JWT with user_data
            // This ensures the JWT contains tenant_id and role_id before redirecting to protected route
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn('Session refresh failed after linking:', refreshError);
                // Don't block login - the existing session might still work
              } else {
                console.log('Session refreshed successfully after linking user UID');
                // Session is now updated with new JWT that should contain user_data
              }
            } catch (refreshErr) {
              console.error('Error refreshing session after linking:', refreshErr);
              // Don't block login - continue with existing session
            }
          }
        }

        /* BACKWARD COMPATIBILITY: Legacy fetch-based implementation
         * Uncomment below and comment above if you need to revert to old implementation
         * 
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (token) {
          const baseUrl = import.meta.env.VITE_RENDER_API_URL;
          const apiUrl = `${baseUrl}/accounts/link-user-uid/`;
          
          console.log('Linking user UID via:', apiUrl);
          console.log('Payload:', { uid: user.id, email: user.email });

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Tenant-Slug': 'bibhab-thepyro-ai'
            },
            body: JSON.stringify({
              uid: user.id,
              email: user.email
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error linking user UID:', errorData);
            toast.error('Warning: User linking failed, but login will continue');
          } else {
            const responseData = await response.json();
            console.log('User UID linked successfully:', responseData);
          }
        }
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error linking user UID:', errorData);
            toast.error('Warning: User linking failed, but login will continue');
          } else {
            const responseData = await response.json();
            console.log('User UID linked successfully:', responseData);
          }
        }
        */
      } catch (error) {
        console.error('Error during user linking:', error);
        // Don't block login for this error, just log it
        toast.error('Warning: User linking failed, but login will continue');
      }

      localStorage.setItem('user_email', user.email);
      toast.success('Google login successful!', { duration: 2000});
      navigate(`/app/${tenantSlug}`);
    };

    fetchAndRedirect();
  }, [navigate, tenantSlug]);

  return <p className="p-6 text-center">Completing login…</p>;
};

export default AuthCallbackPage;
