import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound } from 'lucide-react';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loginHref = tenantSlug ? `/app/${tenantSlug}/login` : '/auth';
  const afterResetPath = tenantSlug ? `/app/${tenantSlug}` : '/';

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
        setError('');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    const timeoutId = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setError((prev) =>
            prev ||
            'This reset link is invalid or expired. Request a new reset from the sign-in page.'
          );
        }
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setMessage('Your password has been updated.');
      setTimeout(() => {
        navigate(afterResetPath, { replace: true });
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <KeyRound className="mx-auto h-10 w-10 text-foreground mb-2" />
            <CardTitle className="text-2xl">Set a new password</CardTitle>
            <CardDescription className="text-gray-700">
              Choose a new password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sessionReady ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Checking your reset link… If this does not continue, open the link from your email again or request a new
                reset.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reset-confirm">Confirm password</Label>
                  <Input
                    id="reset-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Saving…' : 'Update password'}
                </Button>
              </form>
            )}
          </CardContent>
          {(message || error) && (
            <CardFooter className="flex-col text-center text-sm pt-0">
              {message && <p className="text-green-600">{message}</p>}
              {error && <p className="text-red-600">{error}</p>}
            </CardFooter>
          )}
          <CardFooter className="justify-center pt-0 pb-6">
            <Link to={loginHref} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
