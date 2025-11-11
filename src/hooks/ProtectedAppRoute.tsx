import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getTenantIdFromJWT, getRoleIdFromJWT } from '@/lib/jwt';
import { authService, membershipService } from '@/lib/api';

interface PublicPage {
  id: string;
  name: string;
}

const UnauthorizedPage: React.FC<{ 
  onLogout: () => void; 
  tenantSlug: string;
}> = ({ onLogout, tenantSlug }) => {
  const [publicPages, setPublicPages] = useState<PublicPage[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch public pages for this tenant
    const fetchPublicPages = async () => {
      try {
        // Get tenant_id from slug
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();

        if (tenant) {
          // Get the public role ID
          const { data: publicRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'public')
            .eq('tenant_id', tenant.id)
            .single();

          // Fetch public and unassigned pages
          const query = supabase
            .from('pages')
            .select('id, name')
            .eq('tenant_id', tenant.id);

          // Allow pages with no role OR pages with public role (if it exists)
          if (publicRole) {
            query.or(`role.is.null,role.eq.${publicRole.id}`);
          } else {
            query.is('role', null);
          }

          const { data: pages } = await query;

          if (pages && pages.length > 0) {
            setPublicPages(pages);
          }
        }
      } catch (error) {
        console.error('Error fetching public pages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicPages();
  }, [tenantSlug]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">You don't have access to this organization.</p>
        
        {/* Show public pages if available */}
        {!loading && publicPages.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-700 font-medium mb-3">
              However, you can view these open access pages:
            </p>
            <div className="space-y-2">
              {publicPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => navigate(`/app/${tenantSlug}/public/${page.id}`)}
                  className="w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  🌐 {page.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

const ProtectedAppRoute: React.FC = () => {
  const { session, loading: authLoading, logout } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const accessCheckedRef = useRef<string | null>(null); // Track checked session/tenant combination

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      if (!session?.user?.email || !tenantSlug || !session?.access_token) return;

      // Create a unique key for this session/tenant combination
      const checkKey = `${session.user.id}-${tenantSlug}`;
      
      // Prevent redundant checks when session changes (e.g., on page focus)
      if (accessCheckedRef.current === checkKey && allowed !== null) {
        return;
      }

      try {
        // Extract tenant_id and role_id from JWT token (no API call needed)
        const token = session.access_token;
        const jwtTenantId = getTenantIdFromJWT(token);
        const jwtRoleId = getRoleIdFromJWT(token);

        if (!jwtTenantId || !jwtRoleId) {
          if (isMounted) {
            setErrorMessage('Unable to verify user credentials');
            setAllowed(false);
          }
          return;
        }

        // 1. Get tenant by slug to validate the slug exists and matches JWT tenant_id
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

        // Verify that the JWT tenant_id matches the tenant from slug
        if (tenant.id !== jwtTenantId) {
          if (isMounted) {
            setErrorMessage('User does not have access to this organization');
            setAllowed(false);
          }
          return;
        }

        // Link the user's UID from auth.users to our users table (non-blocking)
        // Only do this once per session to avoid redundant updates
        if (accessCheckedRef.current !== checkKey) {
          const result = await authService.linkUserUid(
            { uid: session.user.id, email: session.user.email },
            tenantSlug
          );

          if (result.success === false || result.error) {
            console.error('Failed to link user UID:', result.error);
            // Don't block access if linking fails
          }
        }

        // 2. Get the roles for the tenant to validate role_id exists using API
        let roles;
        try {
          roles = await membershipService.getRoles();
        } catch (error) {
          console.error('Error fetching roles:', error);
          if (isMounted) {
            setErrorMessage('Unable to verify user role');
            setAllowed(false);
          }
          return;
        }

        // 3. Check if the user's role_id (from JWT) exists in the roles array
        const isValidRole = roles.some(role => role.id === jwtRoleId);

        if (isMounted) {
          setAllowed(isValidRole);
          accessCheckedRef.current = checkKey;
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
    try {
      // Use the centralized logout function
      await logout();
      
      // Navigate to login page
      navigate(`/app/${tenantSlug}/login`);
      
    } catch (error) {
      console.error('Logout navigation error:', error);
    }
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
    return <UnauthorizedPage onLogout={handleLogout} tenantSlug={tenantSlug || ''} />;
  }

  return <Outlet />;
};

export default ProtectedAppRoute;
