import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/api/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyRound, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_TENANT_SLUG = 'my-organization';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(DEFAULT_TENANT_SLUG);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { session, loading: authLoading } = useAuth();

  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>, action: 'signIn' | 'signUp') => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      if (action === 'signIn') {
        const response = await supabase.auth.signInWithPassword({ email, password });
        if (response.error) throw response.error;
      } else {
        const slug = slugify(tenantSlug.trim()) || DEFAULT_TENANT_SLUG;
        const response = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { tenant_slug: slug },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (response.error) throw response.error;
        if (response.data.session) {
          sessionStorage.setItem('pending_tenant_slug', slug);
          window.location.replace('/auth');
          return;
        }
        setMessage('Check your email for the confirmation link.');
      }
    } catch (err: any) {
      setError(err?.error_description || err?.message || 'An unexpected error occurred.');
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
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="signin" className="data-[state=active]:bg-foreground data-[state=active]:text-background">Sign In</TabsTrigger>
          <TabsTrigger value="signup" className="data-[state=active]:bg-foreground data-[state=active]:text-background">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <Card className="shadow-lg animate-fade-in">
            <CardHeader className="text-center">
              <KeyRound className="mx-auto h-10 w-10 text-foreground mb-2" />
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription className="text-gray-700">Enter your email and password to access your account.</CardDescription>
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

        <TabsContent value="signup">
          <Card className="shadow-lg animate-fade-in">
            <CardHeader className="text-center">
              <UserPlus className="mx-auto h-10 w-10 text-foreground mb-2" />
              <CardTitle className="text-2xl">Sign Up</CardTitle>
              <CardDescription className="text-gray-700">Create an account. Use a short name for your organization (e.g. my-company).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => handleAuthAction(e, 'signUp')} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="signup-email">Email Address</Label>
                  <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-tenant-slug">Organization slug</Label>
                  <Input id="signup-tenant-slug" type="text" placeholder={DEFAULT_TENANT_SLUG} value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} disabled={loading} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing Up...' : 'Sign Up'}
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
  const [status, setStatus] = useState('Setting up...');
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !session?.user) return;
    done.current = true;
    const user = session.user;
    const tenantName = user.email || `Tenant for ${user.id}`;
    const metadataSlug = (user.user_metadata as { tenant_slug?: string })?.tenant_slug?.trim();
    const pendingSlug = sessionStorage.getItem('pending_tenant_slug');
    const rawSlug = pendingSlug?.trim() || metadataSlug;
    const tenantSlug = rawSlug ? (slugify(rawSlug) || DEFAULT_TENANT_SLUG) : (slugify(tenantName) || DEFAULT_TENANT_SLUG);
    if (pendingSlug) sessionStorage.removeItem('pending_tenant_slug');

    (async () => {
      try {
        const result = await authService.setupNewTenant({ tenant_slug: tenantSlug, tenant_name: tenantName });
        if (result.error || !result.success) {
          setStatus(`Error: ${result.error || 'Setup failed'}`);
          return;
        }
        if (result.tenant_slug) {
          localStorage.setItem('tenant_slug', result.tenant_slug);
        }
        setStatus('Redirecting...');
        window.location.replace('/');
      } catch (e: any) {
        setStatus(`Error: ${e?.response?.data?.error || e?.message || 'Setup failed'}`);
      }
    })();
  }, [session]);
  return <div>{status}</div>;
};

export default AuthPage; 