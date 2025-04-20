import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/lib/supabase';

const ProtectedAppRoute: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const { tenantId, role } = useTenant();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Only run check when we have slug, tenantId, and role
    if (!tenantSlug || tenantId === null || role === null) {
      return;
    }
    const checkAccess = async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();
      if (error || !data) {
        setAllowed(false);
      } else {
        const isMember = data.id === tenantId && ['owner', 'app_user'].includes(role);
        setAllowed(isMember);
      }
    };
    checkAccess();
  }, [tenantSlug, tenantId, role]);

  // Auth in progress
  if (authLoading) {
    return <div>Checking authentication...</div>;
  }
  // Not logged in
  if (!session) {
    return <Navigate to={`/app/${tenantSlug}/login`} replace />;
  }
  // Tenant info loading
  if (role === null || allowed === null) {
    return <div>Checking access...</div>;
  }
  // Not authorized
  if (!allowed) {
    return <Navigate to={`/app/${tenantSlug}/login`} replace />;
  }
  // Authorized
  return <Outlet />;
};

export default ProtectedAppRoute; 