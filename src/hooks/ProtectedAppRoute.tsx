import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const ProtectedAppRoute: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate(); // Used for programmatic navigation

  useEffect(() => {
    const checkAccess = async () => {
      if (!session?.user?.email || !tenantSlug) return;

      // 1. Get tenant by slug
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      console.log("tenant", tenant);

      if (tenantError || !tenant) {
        console.error("Tenant fetch failed", tenantError);
        setAllowed(false);
        return;
      }

      // 2. Get user role_id using email and tenant ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role_id') // Fetch role_id
        .eq('email', session.user.email)
        .eq('tenant_id', tenant.id)
        .single();

      console.log("user", user);

      if (userError || !user) {
        console.error("User fetch failed", userError);
        setAllowed(false);
        return;
      }

      // 3. Get the roles for the tenant and check if the user's role_id is valid for the tenant
      const { data: roles, error: rolesError } = await supabase
        .from('roles') // Assuming the roles are in the 'roles' table
        .select('id')
        .eq('tenant_id', tenant.id);

      console.log("roles", roles);

      if (rolesError || !roles) {
        console.error("Roles fetch failed", rolesError);
        setAllowed(false);
        return;
      }

      // 4. Check if the user's role_id exists in the roles array for the tenant
      const isValidRole = roles.some(role => role.id === user.role_id);

      if (isValidRole) {
        setAllowed(true);
      } else {
        setAllowed(false);
      }
    };

    if (!authLoading && !session) {
      console.log("Session is null, redirecting to login...");
      navigate(`/app/${tenantSlug}/login`, { replace: true });
      return;
    }

    checkAccess();
  }, [session, tenantSlug, authLoading, navigate]);

  console.log("allowed", allowed);
  console.log("authLoading", authLoading);
  console.log("session", session);

  if (authLoading || allowed === null) {
    console.log("Waiting for auth or access check...");
    return <div>Checking access...</div>;
  }

  // If session is not available, redirect to login
  if (!session) {
    console.log("No session, redirecting to login...");
    navigate(`/app/${tenantSlug}/login`, { replace: true });
    return null; // Ensure nothing is rendered after navigating
  }

  // If access is not allowed, redirect to login
  if (!allowed) {
    console.log("Access denied, redirecting to login...");
    navigate(`/app/${tenantSlug}/login`, { replace: true });
    return null; // Ensure nothing is rendered after navigating
  }

  return <Outlet />;
};

export default ProtectedAppRoute;
