// /pages/AuthCallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  useEffect(() => {
    const fetchAndRedirect = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user?.email) {
        toast.error("Failed to complete login");
        navigate(`/app/${tenantSlug}/login`);
        return;
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
