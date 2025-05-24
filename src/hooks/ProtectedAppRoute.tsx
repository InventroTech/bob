import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const UnauthorizedPage: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full mx-4">
      <div className="mb-6">
        <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-6">You don't have access to this organization.</p>
      <button
        onClick={onLogout}
        className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
      >
        Logout
      </button>
    </div>
  </div>
);

const ProtectedAppRoute: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      if (!session?.user?.email || !tenantSlug) return;

      try {
        // 1. Get tenant by slug
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();

        if (tenantError || !tenant) {
          if (isMounted) {
            setErrorMessage('Tenant not found');
            setAllowed(false);
          }
          return;
        }

        // 2. Get user role_id using email and tenant ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('role_id')
          .eq('email', session.user.email)
          .eq('tenant_id', tenant.id)
          .single();

        if (userError || !user) {
          if (isMounted) {
            setErrorMessage('User not found in this organization');
            setAllowed(false);
          }
          return;
        }

        // Link the user's UID from auth.users to our users table
        const { error: updateError } = await supabase
          .from('users')
          .update({ uid: session.user.id })
          .eq('email', session.user.email)
          .eq('tenant_id', tenant.id);

        if (updateError) {
          console.error('Failed to link user UID:', updateError);
          // Don't block access if linking fails
        }

        // 3. Get the roles for the tenant
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('id')
          .eq('tenant_id', tenant.id);

        if (rolesError || !roles) {
          if (isMounted) {
            setErrorMessage('Unable to verify user role');
            setAllowed(false);
          }
          return;
        }

        // 4. Check if the user's role_id exists in the roles array
        const isValidRole = roles.some(role => role.id === user.role_id);

        if (isMounted) {
          setAllowed(isValidRole);
          if (!isValidRole) {
            setErrorMessage('User does not have access to this organization');
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage('An error occurred while checking access');
          setAllowed(false);
        }
      }
    };

    if (!authLoading) {
      if (!session) {
        navigate(`/app/${tenantSlug}/login`, { replace: true });
        return;
      }
      checkAccess();
    }

    return () => {
      isMounted = false;
    };
  }, [session, tenantSlug, authLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/app/${tenantSlug}/login`);
  };

  if (authLoading || allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    navigate(`/app/${tenantSlug}/login`, { replace: true });
    return null;
  }

  if (!allowed) {
    return <UnauthorizedPage onLogout={handleLogout} />;
  }

  return <Outlet />;
};

export default ProtectedAppRoute;
