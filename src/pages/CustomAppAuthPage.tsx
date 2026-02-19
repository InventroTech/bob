import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT, getTenantIdFromJWT } from '@/lib/jwt';

const CustomAppAuthPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // If already authenticated, redirect to dashboard (but not if we're in the process of linking)
  useEffect(() => {
    if (!authLoading && session && !isLinking) {
      // Only auto-redirect if session already has user_data (user was already linked)
      const token = session?.access_token;
      if (token && getRoleIdFromJWT(token) && getTenantIdFromJWT(token)) {
        navigate(`/app/${tenantSlug}`, { replace: true });
      }
    }
  }, [session, authLoading, navigate, tenantSlug, isLinking]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
  
    if (error) {
      setError(error.message);
      return;
    }
  
    // Get user and save email to localStorage
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && user?.id) {
      localStorage.setItem('user_email', user.email);

      try {
        // NEW: Use centralized auth service to link user UID with email
        console.log('Linking user UID via auth service');
        console.log('Payload:', { uid: user.id, email: user.email });

        const result = await authService.linkUserUid(
          { uid: user.id, email: user.email },
          tenantSlug || 'bibhab-thepyro-ai'
        );

        if (result.success === false || result.error) {
          console.error('Error linking user UID:', result.error);
          // Don't block login for this error, just log it
          toast.error('Warning: User linking failed, but login will continue');
        } else {
          console.log('User UID linked successfully:', result);
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

        if (!isAlreadyLinked) {
          setIsLinking(true);
          const result = await authService.linkUserUid(
            { uid: user.id, email: user.email },
            tenantSlug || 'bibhab-thepyro-ai'
          );
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

          if (result.success === false && result.error) {
            const errorCode = (result as any).code;
            const errorMessage = result.error || '';
            
            // Expected errors don't block login and don't show toast
            const isExpectedError = 
              errorCode === 'NO_TENANT_MEMBERSHIP' || 
              errorMessage.includes('No TenantMembership found') ||
              errorMessage.includes('already has a linked UID') ||
              errorMessage.includes('already linked');
            
            if (!isExpectedError) {
              // Only show toast for unexpected errors
              toast.error('Warning: User linking failed, but login will continue');
            }
          } else if (result.success === true) {
            // User was successfully linked (or already linked) - refresh session to get new JWT with user_data
            // This ensures the JWT contains tenant_id and role_id before redirecting to protected route
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn('Session refresh failed after linking:', refreshError);
                // Don't block login - the existing session might still work
              } else {
                console.log('Session refreshed successfully after linking user UID');
                
                // Wait for session to have user_data before redirecting
                // Poll for up to 3 seconds to ensure session has user_data
                let attempts = 0;
                const maxAttempts = 15; // 15 attempts * 200ms = 3 seconds max
                let sessionHasUserData = false;
                
                while (attempts < maxAttempts && !sessionHasUserData) {
                  const { data: { session: currentSession } } = await supabase.auth.getSession();
                  if (currentSession?.access_token) {
                    const hasRoleId = getRoleIdFromJWT(currentSession.access_token);
                    const hasTenantId = getTenantIdFromJWT(currentSession.access_token);
                    if (hasRoleId && hasTenantId) {
                      sessionHasUserData = true;
                      console.log('Session now has user_data, ready to redirect');
                      break;
                    }
                  }
                  attempts++;
                  await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between checks
                }
                
                if (!sessionHasUserData) {
                  console.warn('Session refresh completed but user_data not found in JWT after waiting');
                } else {
                  // Session has user_data, manually navigate to dashboard
                  toast.success('Login successful! Redirecting…');
                  navigate(`/app/${tenantSlug}`, { replace: true });
                  setIsLinking(false);
                  return; // Exit early since we're navigating
                }
              }
            } catch (refreshErr) {
              console.error('Error refreshing session after linking:', refreshErr);
              // Don't block login - continue with existing session
            }
          }
        }
        
        setIsLinking(false);

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
        console.error('Error during user linking:', error);
        // Don't block login for this error, just log it
        toast.error('Warning: User linking failed, but login will continue');
        setIsLinking(false);
        // Don't show success toast if linking failed
        return;
      }
    }
  
    // If user was already linked, show success toast and let useEffect handle redirect
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