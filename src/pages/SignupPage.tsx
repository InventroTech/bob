import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_TENANT_SLUG, PostLoginTenantSetup, slugify } from '@/pages/authShared';

const SignupPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(DEFAULT_TENANT_SLUG);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { session, loading: authLoading } = useAuth();

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
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
    } catch (err: unknown) {
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
      <div className="w-full max-w-sm space-y-4">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <UserPlus className="mx-auto h-10 w-10 text-foreground mb-2" />
            <CardTitle className="text-2xl">Sign Up</CardTitle>
            <CardDescription className="text-gray-700">
              Create an account. Use a short name for your organization (e.g. my-company).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="signup-email">Email Address</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signup-tenant-slug">Organization slug</Label>
                <Input
                  id="signup-tenant-slug"
                  type="text"
                  placeholder={DEFAULT_TENANT_SLUG}
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing Up...' : 'Sign Up'}
              </Button>
            </form>
          </CardContent>
          {(message || error) && (
            <CardFooter className="flex-col text-center text-sm pt-0">
              {message && <p className="text-green-600">{message}</p>}
              {error && <p className="text-red-600">{error}</p>}
            </CardFooter>
          )}
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth" className="text-foreground font-medium underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
