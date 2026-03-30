import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PostLoginTenantSetup } from '@/pages/authShared';

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { session, loading: authLoading } = useAuth();

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
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
      <div className="w-full max-w-sm">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <KeyRound className="mx-auto h-10 w-10 text-foreground mb-2" />
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription className="text-gray-700">Enter your email and password to access your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
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
          {(message || error) && (
            <CardFooter className="flex-col text-center text-sm pt-0">
              {message && <p className="text-green-600">{message}</p>}
              {error && <p className="text-red-600">{error}</p>}
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
