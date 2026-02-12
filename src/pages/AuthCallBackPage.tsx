// /pages/AuthCallbackPage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT } from '@/lib/jwt';

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
        // Only link for new users (check JWT for role_id - if missing, user needs linking)
        const { data: { session } } = await supabase.auth.getSession();
        const isAlreadyLinked = session?.access_token && getRoleIdFromJWT(session.access_token);

        if (!isAlreadyLinked) {
          const result = await authService.linkUserUid(
            { uid: user.id, email: user.email },
            tenantSlug || 'bibhab-thepyro-ai'
          );

          if (result.success === false && result.error) {
            const errorCode = (result as any).code;
            const errorMessage = result.error || '';
            
            // Expected errors don't block login
            if (errorCode !== 'NO_TENANT_MEMBERSHIP' && 
                !errorMessage.includes('No TenantMembership found') &&
                !errorMessage.includes('already has a linked UID')) {
              // Only show toast for unexpected errors
              toast.error('Warning: User linking failed, but login will continue');
            }
          }
        }
      } catch (error) {
        console.error('Error during user linking:', error);
        // Don't block login for this error
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
