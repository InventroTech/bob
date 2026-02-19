// /pages/AuthCallbackPage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT, getTenantIdFromJWT, getUserDataFromJWT, decodeJWT } from '@/lib/jwt';

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
      // [STEP 1-2] OAuth callback - user authenticated via OAuth, getting user and session
      console.log('[AuthCallBackPage] STEP 1-2: OAuth callback received, getting user and session', { tenantSlug });
      
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user?.email || !user?.id) {
        console.error('[AuthCallBackPage] STEP 1-2: Failed to get user after OAuth', { error: error?.message });
        toast.error("Failed to complete login");
        navigate(`/app/${tenantSlug}/login`);
        return;
      }

      console.log('[AuthCallBackPage] STEP 1-2: User obtained from OAuth', {
        userId: user.id,
        userEmail: user.email,
      });

      try {
        // [STEP 3] Only link for new users (check JWT for role_id - if missing, user needs linking)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthCallBackPage] STEP 2: Session obtained after OAuth', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
        });
        
        if (session?.access_token) {
          const initialRoleId = getRoleIdFromJWT(session.access_token);
          const initialTenantId = getTenantIdFromJWT(session.access_token);
          console.log('[AuthCallBackPage] STEP 2: JWT claims check', {
            hasRoleId: !!initialRoleId,
            hasTenantId: !!initialTenantId,
            roleId: initialRoleId || 'MISSING',
            tenantId: initialTenantId || 'MISSING',
          });
        }
        
        const isAlreadyLinked = session?.access_token && getRoleIdFromJWT(session.access_token);
        console.log('[AuthCallBackPage] STEP 3: Checking if user needs linking', {
          isAlreadyLinked,
          hasAccessToken: !!session?.access_token,
        });

        if (!isAlreadyLinked) {
          // [STEP 3] Frontend calls /accounts/link-user-uid/ to link the Supabase UID to TenantMembership
          console.log('[AuthCallBackPage] STEP 3: User needs linking, calling /accounts/link-user-uid/', {
            uid: user.id,
            email: user.email,
            tenantSlug: tenantSlug || 'bibhab-thepyro-ai',
          });
          
          const result = await authService.linkUserUid(
            { uid: user.id, email: user.email },
            tenantSlug || 'bibhab-thepyro-ai'
          );

          console.log('[AuthCallBackPage] STEP 3: link-user-uid response', {
            success: result.success,
            error: result.error,
            code: (result as any).code,
            alreadyLinked: (result as any).already_linked,
          });

          if (result.success === false && result.error) {
            const errorCode = (result as any).code;
            const errorMessage = result.error || '';
            
            // Expected errors don't block login and don't show toast
            const isExpectedError = 
              errorCode === 'NO_TENANT_MEMBERSHIP' || 
              errorMessage.includes('No TenantMembership found') ||
              errorMessage.includes('already has a linked UID') ||
              errorMessage.includes('already linked');
            
            console.log('[AuthCallBackPage] STEP 3: Linking result', {
              isExpectedError,
              errorCode,
              errorMessage,
            });
            
            if (!isExpectedError) {
              // Only show toast for unexpected errors
              toast.error('Warning: User linking failed, but login will continue');
            }
          } else if (result.success === true) {
            // User was successfully linked - refresh session to get new JWT with user_data
            // Note: ProtectedAppRoute will use API fallback if JWT still lacks user_data (Hybrid Approach)
            console.log('[AuthCallBackPage] STEP 3: Linking successful, refreshing session...');
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn('[AuthCallBackPage] STEP 3: Session refresh failed after linking:', refreshError);
                console.warn('[AuthCallBackPage] STEP 3: ProtectedAppRoute will use API fallback if needed (Hybrid Approach)');
                // Don't block login - ProtectedAppRoute will handle fallback
              } else {
                console.log('[AuthCallBackPage] STEP 3: Session refreshed successfully after linking user UID');
                
                // Check if user_data is now in JWT (for logging/debugging)
                const { data: { session: refreshedSession } } = await supabase.auth.getSession();
                if (refreshedSession?.access_token) {
                  const refreshedRoleId = getRoleIdFromJWT(refreshedSession.access_token);
                  const refreshedTenantId = getTenantIdFromJWT(refreshedSession.access_token);
                  const refreshedUserData = getUserDataFromJWT(refreshedSession.access_token);
                  const refreshedJWTClaims = decodeJWT(refreshedSession.access_token);
                  
                  if (refreshedRoleId && refreshedTenantId) {
                    console.log('[AuthCallBackPage] STEP 3: ✅ user_data found in JWT after refresh (fast path)', {
                      user_data: refreshedUserData,
                      role_id: refreshedRoleId,
                      tenant_id: refreshedTenantId,
                    });
                  } else {
                    console.log('[AuthCallBackPage] STEP 3: ⚠️ user_data not yet in JWT after refresh', {
                      hasRoleId: !!refreshedRoleId,
                      hasTenantId: !!refreshedTenantId,
                      user_data: refreshedUserData,
                      jwt_has_user_data_key: refreshedJWTClaims ? 'user_data' in refreshedJWTClaims : false,
                    });
                    console.log('[AuthCallBackPage] STEP 3: ProtectedAppRoute will use API fallback (Hybrid Approach)');
                  }
                }
              }
            } catch (refreshErr) {
              console.error('[AuthCallBackPage] STEP 3: Error refreshing session after linking:', refreshErr);
              console.log('[AuthCallBackPage] STEP 3: ProtectedAppRoute will use API fallback if needed');
              // Don't block login - ProtectedAppRoute will handle fallback
            }
          }
        } else {
          console.log('[AuthCallBackPage] STEP 3: User already linked, skipping link-user-uid call');
        }

        /* BACKWARD COMPATIBILITY: Legacy fetch-based implementation
         * Uncomment below and comment above if you need to revert to old implementation
         * 
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

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
            toast.error('Warning: User linking failed, but login will continue');
          } else {
            const responseData = await response.json();
            console.log('User UID linked successfully:', responseData);
          }
        }
        */
      } catch (error) {
        console.error('[AuthCallBackPage] STEP 3: Error during user linking:', error);
        // Don't block login for this error, just log it
        toast.error('Warning: User linking failed, but login will continue');
      }

      // [STEP 4] The app then redirects to /app/:tenantSlug (dashboard)
      console.log('[AuthCallBackPage] STEP 4: OAuth login flow complete, redirecting to dashboard', {
        tenantSlug,
        redirectPath: `/app/${tenantSlug}`,
      });
      localStorage.setItem('user_email', user.email);
      toast.success('Google login successful!', { duration: 2000});
      navigate(`/app/${tenantSlug}`);
    };

    fetchAndRedirect();
  }, [navigate, tenantSlug]);

  return <p className="p-6 text-center">Completing login…</p>;
};

export default AuthCallbackPage;
