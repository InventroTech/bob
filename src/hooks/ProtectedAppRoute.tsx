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
          // Get the public role via membership API (Django authz at /membership/roles)
          const publicRole = await membershipService.getPublicRole(tenantSlug || undefined);

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
        <h5>Access Denied</h5>
        <p>You don't have access to this organization.</p>
        
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
      // [STEP 4] The app redirects to /app/:tenantSlug (dashboard), which is wrapped by ProtectedAppRoute
      console.log('[ProtectedAppRoute] STEP 4: Route accessed, starting access check', {
        tenantSlug,
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        userId: session?.user?.id,
        hasAccessToken: !!session?.access_token,
      });

      if (!session?.user?.email || !tenantSlug || !session?.access_token) {
        console.log('[ProtectedAppRoute] STEP 4: Missing required data, aborting check', {
          hasEmail: !!session?.user?.email,
          hasTenantSlug: !!tenantSlug,
          hasAccessToken: !!session?.access_token,
        });
        return;
      }

      // Create a unique key for this session/tenant combination
      const checkKey = `${session.user.id}-${tenantSlug}`;
      
      // Prevent redundant checks when session changes (e.g., on page focus)
      if (accessCheckedRef.current === checkKey && allowed !== null) {
        console.log('[ProtectedAppRoute] STEP 4: Already checked this session/tenant combination, skipping');
        return;
      }

      try {
        // [STEP 5] ProtectedAppRoute decides allow/deny by reading the JWT
        console.log('[ProtectedAppRoute] STEP 5: Starting access check - Hybrid Approach (JWT-first with API fallback)');
        const token = session.access_token;
        let jwtTenantId = getTenantIdFromJWT(token);
        let jwtRoleId = getRoleIdFromJWT(token);

        console.log('[ProtectedAppRoute] STEP 5: JWT claims extracted', {
          jwtTenantId: jwtTenantId || 'MISSING',
          jwtRoleId: jwtRoleId || 'MISSING',
          hasTenantId: !!jwtTenantId,
          hasRoleId: !!jwtRoleId,
          usingJWT: !!(jwtTenantId && jwtRoleId),
        });

        // HYBRID APPROACH: If JWT lacks user_data, fallback to API call
        if (!jwtTenantId || !jwtRoleId) {
          console.log('[ProtectedAppRoute] STEP 5: ⚠️ JWT missing user_data - Falling back to API call');
          console.log('[ProtectedAppRoute] STEP 5: This is expected on first-time login');
          
          try {
            const membership = await membershipService.getMyMembership(tenantSlug);
            
            if (membership?.tenant_id && membership?.role_id) {
              // Use API response as fallback
              jwtTenantId = membership.tenant_id;
              jwtRoleId = membership.role_id;
              
              console.log('[ProtectedAppRoute] STEP 5: ✅ API fallback successful', {
                tenant_id: jwtTenantId,
                role_id: jwtRoleId,
                role_key: membership.role_key,
                source: 'API_FALLBACK',
              });
            } else {
              console.error('[ProtectedAppRoute] STEP 5: ❌ API fallback failed - No membership found', {
                membershipResponse: membership,
                hasTenantId: !!membership?.tenant_id,
                hasRoleId: !!membership?.role_id,
                error: membership?.error,
              });
              if (isMounted) {
                setErrorMessage('Unable to verify user credentials');
                setAllowed(false);
              }
              return;
            }
          } catch (apiError: any) {
            console.error('[ProtectedAppRoute] STEP 5: ❌ API fallback error', {
              error: apiError.message,
              status: apiError.response?.status,
              statusText: apiError.response?.statusText,
            });
            if (isMounted) {
              setErrorMessage('Unable to verify user credentials');
              setAllowed(false);
            }
            return;
          }
        } else {
          console.log('[ProtectedAppRoute] STEP 5: ✅ Using JWT claims (fast path)', {
            tenant_id: jwtTenantId,
            role_id: jwtRoleId,
            source: 'JWT',
          });
        }

        // 1. Get tenant by slug to validate the slug exists and matches JWT tenant_id
        console.log('[ProtectedAppRoute] STEP 5.1: Validating tenant slug exists', { tenantSlug });
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();

        if (tenantError || !tenant) {
          console.error('[ProtectedAppRoute] STEP 5.1: Tenant not found - Access Denied', {
            tenantSlug,
            error: tenantError?.message,
          });
          if (isMounted) {
            setErrorMessage('Tenant not found');
            setAllowed(false);
          }
          return;
        }

        console.log('[ProtectedAppRoute] STEP 5.1: Tenant found', {
          tenantId: tenant.id,
          jwtTenantId,
          match: tenant.id === jwtTenantId,
        });

        // Verify that the tenant_id (from JWT or API) matches the tenant from slug
        if (tenant.id !== jwtTenantId) {
          console.error('[ProtectedAppRoute] STEP 5.1: Tenant ID mismatch - Access Denied', {
            tenantIdFromSlug: tenant.id,
            tenantIdFromSource: jwtTenantId,
            source: jwtTenantId ? (getTenantIdFromJWT(token) === jwtTenantId ? 'JWT' : 'API_FALLBACK') : 'UNKNOWN',
          });
          if (isMounted) {
            setErrorMessage('User does not have access to this organization');
            setAllowed(false);
          }
          return;
        }
        
        console.log('[ProtectedAppRoute] STEP 5.1: ✅ Tenant ID matches', {
          tenantId: tenant.id,
          source: getTenantIdFromJWT(token) === jwtTenantId ? 'JWT' : 'API_FALLBACK',
        });

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
        console.log('[ProtectedAppRoute] STEP 5.2: Fetching roles for tenant validation');
        let roles;
        try {
          roles = await membershipService.getRoles();
          console.log('[ProtectedAppRoute] STEP 5.2: Roles fetched', {
            rolesCount: roles?.length || 0,
            roleIds: roles?.map(r => r.id) || [],
          });
        } catch (error) {
          console.error('[ProtectedAppRoute] STEP 5.2: Error fetching roles - Access Denied', error);
          if (isMounted) {
            setErrorMessage('Unable to verify user role');
            setAllowed(false);
          }
          return;
        }

        // 3. Check if the user's role_id (from JWT or API) exists in the roles array
        console.log('[ProtectedAppRoute] STEP 5.3: Validating role_id exists in roles array', {
          roleId: jwtRoleId,
          source: getRoleIdFromJWT(token) === jwtRoleId ? 'JWT' : 'API_FALLBACK',
          availableRoleIds: roles?.map(r => r.id) || [],
          rolesCount: roles?.length || 0,
        });
        const isValidRole = roles.some(role => role.id === jwtRoleId);

        console.log('[ProtectedAppRoute] STEP 5.3: Role validation result', {
          isValidRole,
          roleId: jwtRoleId,
          foundInRoles: isValidRole,
          source: getRoleIdFromJWT(token) === jwtRoleId ? 'JWT' : 'API_FALLBACK',
        });

        if (isMounted) {
          setAllowed(isValidRole);
          accessCheckedRef.current = checkKey;
          if (!isValidRole) {
            console.error('[ProtectedAppRoute] STEP 5.3: ❌ Role ID not found in roles - Access Denied', {
              roleId: jwtRoleId,
              availableRoleIds: roles?.map(r => r.id) || [],
              source: getRoleIdFromJWT(token) === jwtRoleId ? 'JWT' : 'API_FALLBACK',
            });
            setErrorMessage('User does not have access to this organization');
          } else {
            console.log('[ProtectedAppRoute] STEP 5.3: ✅ Access granted - user has valid role', {
              roleId: jwtRoleId,
              source: getRoleIdFromJWT(token) === jwtRoleId ? 'JWT' : 'API_FALLBACK',
            });
          }
        }
      } catch (error) {
        console.error('[ProtectedAppRoute] STEP 5: Unexpected error during access check', error);
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
