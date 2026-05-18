import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authService } from '@/lib/api/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound } from 'lucide-react';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loginHref = tenantSlug ? `/app/${tenantSlug}/login` : '/auth';

  useEffect(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery) {
      setEmail(decodeURIComponent(fromQuery));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Enter the email address you used for the reset request.');
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
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
      const result = await authService.confirmPasswordResetWithOtp(
        email,
        otp,
        password,
        confirm
      );
      if (!result.ok) {
        setError(result.error || 'Could not reset password.');
        return;
      }
      setMessage('Your password has been updated. You can sign in with the new password.');
      setTimeout(() => {
        navigate(loginHref, { replace: true });
      }, 1500);
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
            <CardTitle className="text-2xl">Reset password</CardTitle>
            <CardDescription className="text-gray-700">
              Enter the code from your email, then choose a new password. The code expires in 5 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reset-otp">6-digit code</Label>
                <Input
                  id="reset-otp"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  autoComplete="one-time-code"
                />
              </div>
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
                <Label htmlFor="reset-confirm">Confirm new password</Label>
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
