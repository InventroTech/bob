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
      if (!session?.user?.email || !tenantSlug || !session?.access_token) return;

      // Create a unique key for this session/tenant combination
      const checkKey = `${session.user.id}-${tenantSlug}`;
      
      // Prevent redundant checks when session changes (e.g., on page focus)
      if (accessCheckedRef.current === checkKey && allowed !== null) {
        return;
      }

      try {
        // Extract tenant_id and role_id from JWT token (no API call needed)
        let token = session.access_token;
        let jwtTenantId = getTenantIdFromJWT(token);
        let jwtRoleId = getRoleIdFromJWT(token);

        // If JWT missing user_data, try refresh and link first
        if (!jwtTenantId || !jwtRoleId) {
          console.log('JWT missing user_data, attempting to link and refresh...');
          
          // First, ensure user is linked
          if (accessCheckedRef.current !== checkKey) {
            const linkResult = await authService.linkUserUid(
              { uid: session.user.id, email: session.user.email },
              tenantSlug
            );
            
            if (linkResult.success) {
              console.log('User linked successfully, refreshing session...');
              // Wait a moment for backend to process
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Refresh session to get new JWT with user_data
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (!refreshError && refreshData?.session?.access_token) {
                token = refreshData.session.access_token;
                jwtTenantId = getTenantIdFromJWT(token);
                jwtRoleId = getRoleIdFromJWT(token);
                console.log(`After link+refresh: role_id=${!!jwtRoleId}, tenant_id=${!!jwtTenantId}`);
                
                // Poll for user_data if still missing
                if (!jwtTenantId || !jwtRoleId) {
                  let attempts = 0;
                  const maxAttempts = 20;
                  while (attempts < maxAttempts && (!jwtTenantId || !jwtRoleId)) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    if (currentSession?.access_token) {
                      token = currentSession.access_token;
                      jwtTenantId = getTenantIdFromJWT(token);
                      jwtRoleId = getRoleIdFromJWT(token);
                      if (jwtTenantId && jwtRoleId) {
                        console.log(`Found user_data after ${attempts} polling attempts`);
                        break;
                      }
                    }
                    attempts++;
                  }
                }
              }
            }
          }
        }

        if (!jwtTenantId || !jwtRoleId) {
          console.error('Unable to get user_data in JWT after all attempts');
          if (isMounted) {
            setErrorMessage('Unable to verify user credentials. Please logout and login again.');
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

        // Ensure user is linked AND JWT has user_data BEFORE calling getRoles()
        // Backend requires both: TenantMembership exists AND JWT has user_data.tenant_id
        // Only do this once per session to avoid redundant updates
        if (accessCheckedRef.current !== checkKey) {
          console.log(`Linking user UID: ${session.user.id}, email: ${session.user.email}, tenant: ${tenantSlug}`);
          const result = await authService.linkUserUid(
            { uid: session.user.id, email: session.user.email },
            tenantSlug
          );

          console.log('Link user result:', result);
          
          if (result.success === false || result.error) {
            console.error('Failed to link user UID:', result.error);
            // If linking fails, backend won't authorize getRoles() - show error
            if (isMounted) {
              setErrorMessage('Unable to verify user membership. Please logout and login again.');
              setAllowed(false);
            }
            return;
          }
          
          // Log link success details
          if (result.activated_memberships) {
            console.log(`Successfully linked user: ${result.activated_memberships} membership(s) activated`);
          }
          
          // After linking, refresh session to get JWT with user_data
          console.log('User linked, refreshing session to get JWT with user_data...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData?.session?.access_token) {
            // Update token and check for user_data
            token = refreshData.session.access_token;
            jwtTenantId = getTenantIdFromJWT(token);
            jwtRoleId = getRoleIdFromJWT(token);
            
            // If still missing user_data, poll for it (hook might be slow in staging)
            if (!jwtTenantId || !jwtRoleId) {
              console.log('JWT still missing user_data after refresh, polling...');
              let attempts = 0;
              const maxAttempts = 25; // 5 seconds
              while (attempts < maxAttempts && (!jwtTenantId || !jwtRoleId)) {
                await new Promise(resolve => setTimeout(resolve, 200));
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession?.access_token) {
                  token = currentSession.access_token;
                  jwtTenantId = getTenantIdFromJWT(token);
                  jwtRoleId = getRoleIdFromJWT(token);
                  if (jwtTenantId && jwtRoleId) {
                    console.log(`Found user_data after ${attempts} polling attempts`);
                    break;
                  }
                }
                attempts++;
              }
            }
            
            // Verify tenant_id still matches after refresh
            if (jwtTenantId && tenant.id !== jwtTenantId) {
              console.error('Tenant ID mismatch after refresh:', { jwtTenantId, tenantId: tenant.id });
              if (isMounted) {
                setErrorMessage('User does not have access to this organization');
                setAllowed(false);
              }
              return;
            }
          } else {
            console.warn('Session refresh failed after linking:', refreshError);
          }
          
          // Wait longer after linking and refresh to ensure backend has processed
          // Staging may have slower database writes and cache invalidation
          console.log('Waiting for backend to process link and refresh...');
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 seconds
        }

        // 2. Get the roles for the tenant to validate role_id exists using API
        // IMPORTANT: Only call this if JWT has user_data (backend needs it for tenant resolution)
        let roles;
        try {
          // Ensure we're using the latest session token (might have been refreshed)
          // Get fresh session to ensure interceptor uses latest token
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.access_token) {
            token = currentSession.access_token;
            // Re-check user_data with latest token
            jwtTenantId = getTenantIdFromJWT(token);
            jwtRoleId = getRoleIdFromJWT(token);
            
            // If still missing user_data, wait and poll (staging hook might be slow)
            if (!jwtTenantId || !jwtRoleId) {
              console.log('JWT still missing user_data, polling before API call...');
              let pollAttempts = 0;
              const maxPollAttempts = 15; // 3 seconds
              while (pollAttempts < maxPollAttempts && (!jwtTenantId || !jwtRoleId)) {
                await new Promise(resolve => setTimeout(resolve, 200));
                const { data: { session: pollSession } } = await supabase.auth.getSession();
                if (pollSession?.access_token) {
                  token = pollSession.access_token;
                  jwtTenantId = getTenantIdFromJWT(token);
                  jwtRoleId = getRoleIdFromJWT(token);
                  if (jwtTenantId && jwtRoleId) {
                    console.log(`Found user_data after ${pollAttempts} polling attempts before API call`);
                    break;
                  }
                }
                pollAttempts++;
              }
            }
          }
          
          // Final check: don't call API if JWT still doesn't have user_data
          if (!jwtTenantId || !jwtRoleId) {
            console.error('Cannot call getRoles() - JWT missing user_data');
            if (isMounted) {
              setErrorMessage('Session credentials incomplete. Please logout and login again.');
              setAllowed(false);
            }
            return;
          }
          
          roles = await membershipService.getRoles(tenantSlug);
        } catch (error: any) {
          console.error('Error fetching roles:', error);
          
          // If 403 error and JWT doesn't have user_data, try refresh again
          if ((error?.response?.status === 403 || error?.status === 403) && (!jwtTenantId || !jwtRoleId)) {
            console.log('403 error with missing user_data, refreshing session again...');
            const { data: refreshData2, error: refreshError2 } = await supabase.auth.refreshSession();
            
            if (!refreshError2 && refreshData2?.session?.access_token) {
              token = refreshData2.session.access_token;
              jwtTenantId = getTenantIdFromJWT(token);
              jwtRoleId = getRoleIdFromJWT(token);
              
              if (jwtTenantId && jwtRoleId) {
                // Wait and retry with new token
                await new Promise(resolve => setTimeout(resolve, 500));
                try {
                  roles = await membershipService.getRoles(tenantSlug);
                  console.log('Successfully fetched roles after session refresh');
                } catch (retryError) {
                  console.error('Still failed after session refresh:', retryError);
                  if (isMounted) {
                    setErrorMessage('Unable to verify user role. Please logout and login again.');
                    setAllowed(false);
                  }
                  return;
                }
              } else {
                if (isMounted) {
                  setErrorMessage('Session does not have required credentials. Please logout and login again.');
                  setAllowed(false);
                }
                return;
              }
            } else {
              if (isMounted) {
                setErrorMessage('Unable to refresh session. Please logout and login again.');
                setAllowed(false);
              }
              return;
            }
          } else {
            if (isMounted) {
              setErrorMessage('Unable to verify user role');
              setAllowed(false);
            }
            return;
          }
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
