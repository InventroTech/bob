import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const CustomAppAuthPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && session) {
      navigate(`/app/${tenantSlug}`, { replace: true });
    }
  }, [session, authLoading, navigate, tenantSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting to login with:', email);
      
      // First try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        
        // If user doesn't exist, try to sign up
        if (signInError.message.includes('Invalid login credentials')) {
          console.log('User not found, attempting to sign up...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/app/${tenantSlug}/auth/callback`
            }
          });

          if (signUpError) {
            console.error('Sign up error:', signUpError);
            setError(signUpError.message);
            return;
          }

          if (signUpData?.user) {
            toast.success('Account created! Please check your email to confirm your account.');
            return;
          }
        } else {
          setError(signInError.message);
          return;
        }
      }

      // Get user and save email to localStorage
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        localStorage.setItem('user_email', user.email);
        toast.success('Login successful! Redirecting…');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Attempting to send password reset email to:', email);
      
      // Use the callback URL instead of reset-password URL
      const redirectTo = `${window.location.origin}/app/${tenantSlug}/auth/callback`;
      console.log('Redirect URL:', redirectTo);

      // Send password reset email
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      console.log('Password reset response:', { data, error });

      if (error) {
        console.error('Password reset error:', error);
        if (error.message.includes('Unable to process request')) {
          setError('Unable to send password reset email. Please verify your email address and try again.');
        } else {
          setError(error.message);
        }
        return;
      }

      setIsResetSent(true);
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Failed to send password reset email. Please try again later.');
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
      <form onSubmit={handleLogin} className="space-y-4 p-6 bg-white rounded shadow w-full max-w-sm">
        <h2 className="text-xl font-semibold text-center">Login to Your App</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {isResetSent && (
          <p className="text-green-600 text-sm">
            Password reset email sent! Please check your inbox.
          </p>
        )}
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <div className="flex justify-between items-center">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={handleForgotPassword}
            disabled={loading}
            className="ml-2"
          >
            Forgot Password?
          </Button>
        </div>
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