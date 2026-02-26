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

const ACCESS_CACHE_KEY = 'pyro_access_check';

function getCachedAccess(userId: string, tenantSlug: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(ACCESS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.userId === userId && cached.tenantSlug === tenantSlug && cached.allowed === true) {
      return true;
    }
  } catch { /* ignore corrupt data */ }
  return null;
}

function setCachedAccess(userId: string, tenantSlug: string, allowed: boolean) {
  try {
    sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ userId, tenantSlug, allowed, ts: Date.now() }));
  } catch { /* ignore quota errors */ }
}

function clearCachedAccess() {
  try { sessionStorage.removeItem(ACCESS_CACHE_KEY); } catch { /* noop */ }
}

const ProtectedAppRoute: React.FC = () => {
  const { session, loading: authLoading, logout } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const accessCheckedRef = useRef<string | null>(null);
  const mountCountRef = useRef(0);

  // Diagnostic: detect remounts (the suspected root cause)
  useEffect(() => {
    mountCountRef.current += 1;
    const mountId = mountCountRef.current;
    console.log(`[ProtectedAppRoute] MOUNTED (mount #${mountId})`, {
      hasSession: !!session,
      authLoading,
      cachedAccess: sessionStorage.getItem(ACCESS_CACHE_KEY),
      refValue: accessCheckedRef.current,
    });
    return () => {
      console.log(`[ProtectedAppRoute] UNMOUNTED (mount #${mountId})`);
    };
  }, []);

  // Restore access from sessionStorage so remounts don't flash "Access Denied"
  const [allowed, setAllowed] = useState<boolean | null>(() => {
    if (!tenantSlug) return null;
    // We don't have session.user.id yet during initial state, so peek at storage loosely
    const raw = sessionStorage.getItem(ACCESS_CACHE_KEY);
    if (raw) {
      try {
        const cached = JSON.parse(raw);
        if (cached.tenantSlug === tenantSlug && cached.allowed === true) return true;
      } catch { /* ignore */ }
    }
    return null;
  });

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      if (!session?.user?.email || !tenantSlug || !session?.access_token) return;

      const checkKey = `${session.user.id}-${tenantSlug}`;

      // Skip if we already verified this user+tenant (in-memory ref survives re-renders)
      if (accessCheckedRef.current === checkKey && allowed !== null) {
        return;
      }

      // Skip if sessionStorage says we already passed (survives remounts)
      const cached = getCachedAccess(session.user.id, tenantSlug);
      if (cached === true) {
        if (isMounted) {
          console.log('[ProtectedAppRoute] Restored access from session cache (fast path)');
          setAllowed(true);
          accessCheckedRef.current = checkKey;
        }
        return;
      }

      const denyAccess = (reason: string) => {
        console.error(`[ProtectedAppRoute] ACCESS DENIED — reason: ${reason}`, {
          mountCount: mountCountRef.current,
          checkKey,
          refValue: accessCheckedRef.current,
          allowedState: allowed,
          cachedAccess: sessionStorage.getItem(ACCESS_CACHE_KEY),
          timestamp: new Date().toISOString(),
        });
        if (isMounted) {
          setErrorMessage(reason);
          setAllowed(false);
        }
      };

      try {
        console.log('[ProtectedAppRoute] Starting access check - Hybrid Approach (JWT-first with API fallback)');
        const token = session.access_token;
        let jwtTenantId = getTenantIdFromJWT(token);
        let jwtRoleId = getRoleIdFromJWT(token);

        console.log('[ProtectedAppRoute] JWT claims check', {
          jwtTenantId: jwtTenantId || 'MISSING',
          jwtRoleId: jwtRoleId || 'MISSING',
          usingJWT: !!(jwtTenantId && jwtRoleId),
        });

        if (!jwtTenantId || !jwtRoleId) {
          console.log('[ProtectedAppRoute] JWT missing user_data - Attempting fallback strategies...');

          // Strategy 1: Force session refresh
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session?.access_token) {
              const refreshedTenantId = getTenantIdFromJWT(refreshData.session.access_token);
              const refreshedRoleId = getRoleIdFromJWT(refreshData.session.access_token);
              if (refreshedTenantId && refreshedRoleId) {
                jwtTenantId = refreshedTenantId;
                jwtRoleId = refreshedRoleId;
                console.log('[ProtectedAppRoute] JWT refresh successful - user_data now available');
              }
            }
          } catch (refreshErr) {
            console.error('[ProtectedAppRoute] Error during session refresh:', refreshErr);
          }

          // Strategy 2: API fallback
          if (!jwtTenantId || !jwtRoleId) {
            console.log('[ProtectedAppRoute] Using API fallback to get membership from backend...');
            try {
              const membership = await membershipService.getMyMembership(tenantSlug);
              if (membership?.tenant_id && membership?.role_id) {
                jwtTenantId = membership.tenant_id;
                jwtRoleId = membership.role_id;
                console.log('[ProtectedAppRoute] API fallback successful', { tenant_id: jwtTenantId, role_id: jwtRoleId });
              } else {
                denyAccess('API fallback failed - No membership found');
                return;
              }
            } catch (apiError: any) {
              denyAccess(`API fallback error: ${apiError.message} (status: ${apiError.response?.status})`);
              return;
            }
          }
        }

        // Validate tenant slug matches JWT tenant_id
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();

        if (tenantError || !tenant) {
          denyAccess(`Tenant not found for slug "${tenantSlug}" (error: ${tenantError?.message})`);
          return;
        }

        if (tenant.id !== jwtTenantId) {
          denyAccess(`Tenant ID mismatch: JWT has ${jwtTenantId}, slug resolves to ${tenant.id}`);
          return;
        }

        // Link user UID (non-blocking, once per session)
        if (accessCheckedRef.current !== checkKey) {
          authService.linkUserUid(
            { uid: session.user.id, email: session.user.email },
            tenantSlug
          ).catch(err => console.error('Failed to link user UID:', err));
        }

        // Validate role exists for tenant
        let roles;
        try {
          roles = await membershipService.getRoles();
        } catch (error) {
          denyAccess(`Unable to verify user role: ${error}`);
          return;
        }

        const isValidRole = roles.some(role => role.id === jwtRoleId);

        if (isMounted) {
          setAllowed(isValidRole);
          accessCheckedRef.current = checkKey;
          if (isValidRole) {
            setCachedAccess(session.user.id, tenantSlug, true);
            console.log('[ProtectedAppRoute] ACCESS GRANTED and cached');
          } else {
            clearCachedAccess();
            denyAccess(`Role ${jwtRoleId} not found in tenant roles: [${roles.map(r => r.id).join(', ')}]`);
          }
        }
      } catch (error) {
        denyAccess(`Unexpected error during access check: ${error}`);
      }
    };

    if (!authLoading) {
      if (!session) {
        clearCachedAccess();
        navigate(`/app/${tenantSlug}/login`, { replace: true });
        return;
      }
      checkAccess();
    }

    return () => { isMounted = false; };
  }, [session, tenantSlug, authLoading, navigate]);

  const handleLogout = async () => {
    try {
      clearCachedAccess();
      await logout();
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
