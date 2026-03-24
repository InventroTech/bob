import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT } from '@/lib/jwt';

const CustomAppAuthPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && session) {
      navigate(`/app/${tenantSlug}`, { replace: true });
    }
  }, [session, authLoading, navigate, tenantSlug]);

  const linkUserIfNeeded = async (uid: string, userEmail: string) => {
    localStorage.setItem('user_email', userEmail);

    try {
      const isAlreadyLinked = session?.access_token && getRoleIdFromJWT(session.access_token);

      if (isAlreadyLinked) return;

      const result = await authService.linkUserUid({ uid, email: userEmail });

      if (result.success === false || result.error) {
        const errorCode = (result as any).code;
        const errorMessage = result.error || '';
        const isExpectedError =
          errorCode === 'NO_TENANT_MEMBERSHIP' ||
          errorMessage.includes('No TenantMembership found') ||
          errorMessage.includes('already has a linked UID') ||
          errorMessage.includes('already linked');

        if (!isExpectedError) {
          console.error('[CustomAppAuthPage] Error linking user UID:', result.error);
          toast.error('Warning: User linking failed, but login will continue');
        }
        return;
      }

      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('[CustomAppAuthPage] Session refresh failed after linking:', refreshError);
      }
    } catch (linkError) {
      console.error('[CustomAppAuthPage] Error during user linking:', linkError);
      toast.error('Warning: User linking failed, but login will continue');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && user?.email) {
        await linkUserIfNeeded(user.id, user.email);
      }

      toast.success('Login successful! Redirecting…');
      navigate(`/app/${tenantSlug}`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!tenantSlug) {
      setError('Invalid tenant URL. Please use your organization login link.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { tenant_slug: tenantSlug },
          emailRedirectTo: `${window.location.origin}/app/${tenantSlug}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // If email confirmation is enabled, Supabase may not create a session immediately.
      if (!data.session) {
        setMessage('Signup successful. Please verify your email, then login.');
        return;
      }

      if (data.user?.id && data.user?.email) {
        await linkUserIfNeeded(data.user.id, data.user.email);
      }

      toast.success('Signup successful! Redirecting…');
      navigate(`/app/${tenantSlug}`, { replace: true });
    } finally {
      setLoading(false);
    }
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
      <div className="w-full max-w-sm p-6 bg-white rounded shadow space-y-4">
        <h5>Login to Your App</h5>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-600">{message}</p> : null}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="pt-3">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="relative my-3">
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
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Continue with Google
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="pt-3">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  placeholder="Minimum 6 characters"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label>Confirm password</Label>
                <Input
                  placeholder="Re-enter password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing up...' : 'Create account'}
              </Button>
              <p className="text-xs text-muted-foreground">
                This signup is tenant-scoped to <strong>{tenantSlug}</strong> and does not create a new tenant.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomAppAuthPage; 