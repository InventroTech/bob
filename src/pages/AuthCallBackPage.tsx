// /pages/AuthCallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Starting callback handling...');
        console.log('URL:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('Hash:', window.location.hash);

        // Check for error in URL
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const type = urlParams.get('type');

        if (error) {
          console.error('Auth error:', { error, errorDescription });
          toast.error(errorDescription || 'Authentication failed');
          navigate(`/app/${tenantSlug}/login`);
          return;
        }

        // Handle password reset
        if (type === 'recovery') {
          console.log('Handling password reset...');
          navigate(`/app/${tenantSlug}/auth/reset-password`);
          return;
        }

        // First try to get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Initial session check:', { session, error: sessionError });

        if (sessionError) {
          console.error('Session error:', sessionError);
          toast.error("Failed to complete login");
          navigate(`/app/${tenantSlug}/login`);
          return;
        }

        // If no session, try to handle the OAuth response
        if (!session) {
          console.log('No session found, handling OAuth response...');
          const { data: { session: newSession }, error: oauthError } = await supabase.auth.getSession();
          console.log('OAuth response handling:', { session: newSession, error: oauthError });

          if (oauthError) {
            console.error('OAuth error:', oauthError);
            toast.error("Failed to complete login");
            navigate(`/app/${tenantSlug}/login`);
            return;
          }

          if (!newSession?.user?.email) {
            console.error('No user email found after OAuth');
            toast.error("Failed to complete login");
            navigate(`/app/${tenantSlug}/login`);
            return;
          }

          // Store the email in localStorage
          localStorage.setItem('user_email', newSession.user.email);
          
          // Verify the user exists in the public.users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', newSession.user.email)
            .single();

          if (userError || !userData) {
            console.error('User not found in public.users:', userError);
            toast.error("User account not found");
            navigate(`/app/${tenantSlug}/login`);
            return;
          }

          toast.success('Login successful!');
          navigate(`/app/${tenantSlug}`);
          return;
        }

        // If we have a session, proceed with verification
        if (!session.user?.email) {
          console.error('No user email found in session');
          toast.error("Failed to complete login");
          navigate(`/app/${tenantSlug}/login`);
          return;
        }

        // Store the email in localStorage
        localStorage.setItem('user_email', session.user.email);
        
        // Verify the user exists in the public.users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single();

        if (userError || !userData) {
          console.error('User not found in public.users:', userError);
          toast.error("User account not found");
          navigate(`/app/${tenantSlug}/login`);
          return;
        }

        toast.success('Login successful!');
        navigate(`/app/${tenantSlug}`);
      } catch (error) {
        console.error('Callback error:', error);
        toast.error("Failed to complete login");
        navigate(`/app/${tenantSlug}/login`);
      }
    };

    handleCallback();
  }, [navigate, tenantSlug]);

  return <p className="p-6 text-center">Completing login…</p>;
};

export default AuthCallbackPage;
