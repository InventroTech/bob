import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyRound, UserPlus } from 'lucide-react'; // Import appropriate icons
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Add password state
  const [message, setMessage] = useState('');
  const [error, setError] = useState(''); // State for error messages
  const { session, loading: authLoading } = useAuth();

  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>, action: 'signIn') => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      let response;
      if (action === 'signIn') {
        response = await supabase.auth.signInWithPassword({ email, password });
        console.log("Sign In Response:", response);
        if (response.error) throw response.error;
        // No message needed on successful sign in, redirection handles it
      } else { // signUp
        response = await supabase.auth.signUp({ email, password });
        console.log("Sign Up Response:", response);
        if (response.error) throw response.error;
        // If user is auto-logged-in (session present), go straight to setup
        if (response.data.session) {
          window.location.replace('/');
          return;
        }
        // Prompt user to verify email
        setMessage('Signup successful! Please check your email for the confirmation link.');
      }
    } catch (error: any) {
      console.error(`Error during ${action}:`, error);
      setError(error.error_description || error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading authentication state...</div>;
  }

  if (session) {
    return <PostLoginTenantSetup />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Tabs defaultValue="signin" className="w-full max-w-sm">
        
        <TabsContent value="signin">
          <Card className="shadow-lg animate-fade-in">
            <CardHeader className="text-center">
              <KeyRound className="mx-auto h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Enter your email and password to access your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => handleAuthAction(e, 'signIn')} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="signin-email">Email Address</Label>
                  <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
         {(message || error) && (
           <CardFooter className="text-center text-sm pt-4">
             {message && <p className="text-green-600">{message}</p>}
             {error && <p className="text-red-600">{error}</p>}
           </CardFooter>
         )}
      </Tabs>
    </div>
  );
};

const PostLoginTenantSetup = () => {
  const { session } = useAuth();
  const [status, setStatus] = useState('Checking tenant status...');
  const setupAttempted = useRef(false); // Track if we've already attempted setup

  // Simple slugify util
  function slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  useEffect(() => {
    const setupTenant = async () => {
      if (setupAttempted.current) {
        console.log('PostLoginTenantSetup: Setup already attempted, skipping.');
        return;
      }
      setupAttempted.current = true;
      if (!session?.user) {
        setStatus('Waiting for user session...');
        return;
      }
      const userId = session.user.id;
      const tenantName = session.user.email || `Tenant for ${userId}`;
      const tenantSlug = slugify(tenantName);
      console.log('PostLoginTenantSetup: Starting setup for user:', userId, tenantName, tenantSlug);
      setStatus('Checking for existing tenant...');
      try {
        const { data, error } = await supabase.rpc('setup_user_tenant', {
          user_id: userId,
          tenant_name: tenantName,
          tenant_slug: tenantSlug,
        });
        if (error) {
          console.error('Error in setup_user_tenant RPC:', error);
          setStatus(`Error: ${error.message}`);
          return;
        }
        console.log('Tenant setup complete:', data);
        setStatus('Setup complete, redirecting...');
        setTimeout(() => {
          window.location.replace('/');
        }, 100);
      } catch (error: any) {
        console.error('PostLoginTenantSetup: Unexpected error:', error);
        setStatus(`Error: ${error.message}`);
      }
    };
    setupTenant();
  }, [session]);
  return <div>{status}</div>;
};

export default AuthPage; 