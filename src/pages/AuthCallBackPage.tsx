// /pages/AuthCallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '@/lib/authService';
import { toast } from 'sonner';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  useEffect(() => {
    const fetchAndRedirect = async () => {
      const userResponse = await authService.getUser();

      if (!userResponse.success || !userResponse.data?.email || !userResponse.data?.id) {
        toast.error("Failed to complete login");
        navigate(`/app/${tenantSlug}/login`);
        return;
      }

      const user = userResponse.data;
      try {
        // Call renderer API to link user UID with email
        const sessionResponse = await authService.getSession();
        const token = sessionResponse.success ? sessionResponse.data?.access_token : null;

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
            // Don't block login for this error, just log it
            toast.error('Warning: User linking failed, but login will continue');
          } else {
            const responseData = await response.json();
            console.log('User UID linked successfully:', responseData);
          }
        }
      } catch (error) {
        console.error('Error during user linking:', error);
        // Don't block login for this error, just log it
        toast.error('Warning: User linking failed, but login will continue');
      }

      localStorage.setItem('user_email', user.email);
      toast.success('Google login successful!');
      navigate(`/app/${tenantSlug}`);
    };

    fetchAndRedirect();
  }, [navigate, tenantSlug]);

  return <p className="p-6 text-center">Completing login…</p>;
};

export default AuthCallbackPage;
