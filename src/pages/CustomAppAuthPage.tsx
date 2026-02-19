import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT, getTenantIdFromJWT, getUserDataFromJWT, decodeJWT } from '@/lib/jwt';

const CustomAppAuthPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && session) {
      navigate(`/app/${tenantSlug}`, { replace: true });
    }
  }, [session, authLoading, navigate, tenantSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // [STEP 1] User logs in on Custom App
    console.log('[CustomAppAuthPage] STEP 1: User attempting login', { email, tenantSlug });
    
    // [STEP 2] Supabase signInWithPassword succeeds and returns a session (with a JWT)
    console.log('[CustomAppAuthPage] STEP 2: Calling supabase.auth.signInWithPassword...');
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
  
    if (error) {
      console.error('[CustomAppAuthPage] STEP 2: Login failed', { error: error.message });
      setError(error.message);
      return;
    }
    
    console.log('[CustomAppAuthPage] STEP 2: Login successful, getting session...');
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    console.log('[CustomAppAuthPage] STEP 2: Initial session obtained', {
      hasSession: !!initialSession,
      hasAccessToken: !!initialSession?.access_token,
      userId: initialSession?.user?.id,
      userEmail: initialSession?.user?.email,
    });
    
    if (initialSession?.access_token) {
      const initialRoleId = getRoleIdFromJWT(initialSession.access_token);
      const initialTenantId = getTenantIdFromJWT(initialSession.access_token);
      console.log('[CustomAppAuthPage] STEP 2: JWT claims check', {
        hasRoleId: !!initialRoleId,
        hasTenantId: !!initialTenantId,
        roleId: initialRoleId || 'MISSING',
        tenantId: initialTenantId || 'MISSING',
      });
    }
  
    // Get user and save email to localStorage
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && user?.id) {
      localStorage.setItem('user_email', user.email);
      console.log('[CustomAppAuthPage] User email saved to localStorage', { email: user.email });

      try {
        // [STEP 3] Only link for new users (check JWT for role_id - if missing, user needs linking)
        const { data: { session } } = await supabase.auth.getSession();
        const isAlreadyLinked = session?.access_token && getRoleIdFromJWT(session.access_token);
        
        console.log('[CustomAppAuthPage] STEP 3: Checking if user needs linking', {
          isAlreadyLinked,
          hasAccessToken: !!session?.access_token,
        });

        if (!isAlreadyLinked) {
          // [STEP 3] Frontend calls /accounts/link-user-uid/ to link the Supabase UID to TenantMembership
          console.log('[CustomAppAuthPage] STEP 3: User needs linking, calling /accounts/link-user-uid/', {
            uid: user.id,
            email: user.email,
            tenantSlug: tenantSlug || 'bibhab-thepyro-ai',
          });
          
          const result = await authService.linkUserUid(
            { uid: user.id, email: user.email },
            tenantSlug || 'bibhab-thepyro-ai'
          );

          console.log('[CustomAppAuthPage] STEP 3: link-user-uid response', {
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
            
            console.log('[CustomAppAuthPage] STEP 3: Linking result', {
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
            console.log('[CustomAppAuthPage] STEP 3: Linking successful, refreshing session...');
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn('[CustomAppAuthPage] STEP 3: Session refresh failed after linking:', refreshError);
                console.warn('[CustomAppAuthPage] STEP 3: ProtectedAppRoute will use API fallback if needed (Hybrid Approach)');
                // Don't block login - ProtectedAppRoute will handle fallback
              } else {
                console.log('[CustomAppAuthPage] STEP 3: Session refreshed successfully after linking user UID');
                
                // Check if user_data is now in JWT (for logging/debugging)
                const { data: { session: refreshedSession } } = await supabase.auth.getSession();
                if (refreshedSession?.access_token) {
                  const refreshedRoleId = getRoleIdFromJWT(refreshedSession.access_token);
                  const refreshedTenantId = getTenantIdFromJWT(refreshedSession.access_token);
                  const refreshedUserData = getUserDataFromJWT(refreshedSession.access_token);
                  const refreshedJWTClaims = decodeJWT(refreshedSession.access_token);
                  
                  if (refreshedRoleId && refreshedTenantId) {
                    console.log('[CustomAppAuthPage] STEP 3: ✅ user_data found in JWT after refresh (fast path)', {
                      user_data: refreshedUserData,
                      role_id: refreshedRoleId,
                      tenant_id: refreshedTenantId,
                    });
                  } else {
                    console.log('[CustomAppAuthPage] STEP 3: ⚠️ user_data not yet in JWT after refresh', {
                      hasRoleId: !!refreshedRoleId,
                      hasTenantId: !!refreshedTenantId,
                      user_data: refreshedUserData,
                      jwt_has_user_data_key: refreshedJWTClaims ? 'user_data' in refreshedJWTClaims : false,
                    });
                    console.log('[CustomAppAuthPage] STEP 3: ProtectedAppRoute will use API fallback (Hybrid Approach)');
                  }
                }
              }
            } catch (refreshErr) {
              console.error('[CustomAppAuthPage] STEP 3: Error refreshing session after linking:', refreshErr);
              console.log('[CustomAppAuthPage] STEP 3: ProtectedAppRoute will use API fallback if needed');
              // Don't block login - ProtectedAppRoute will handle fallback
            }
          }
        } else {
          console.log('[CustomAppAuthPage] STEP 3: User already linked, skipping link-user-uid call');
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
        console.error('[CustomAppAuthPage] STEP 3: Error during user linking:', error);
        // Don't block login for this error, just log it
        toast.error('Warning: User linking failed, but login will continue');
      }
    }
  
    // [STEP 4] The app then redirects to /app/:tenantSlug (dashboard)
    console.log('[CustomAppAuthPage] STEP 4: Login flow complete, redirecting to dashboard', {
      tenantSlug,
      redirectPath: `/app/${tenantSlug}`,
    });
    toast.success('Login successful! Redirecting…');
  };
  

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app/${tenantSlug}/auth/callback`
      }
    });
  
    if (error) {
      setError(error.message);
      return;
    }
  
    // Email will be fetched and stored in callback page
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <form onSubmit={handleLogin} className="space-y-4 p-6 bg-white rounded shadow w-full max-w-sm">
        <h5>Login to Your App</h5>
        {error && <p>{error}</p>}
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">
          Login
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
        >
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          Continue with Google
        </Button>
      </form>
    </div>
  );
};

export default CustomAppAuthPage; 