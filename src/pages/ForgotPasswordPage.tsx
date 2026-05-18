import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authService } from '@/lib/api/services/auth';
import { PASSWORD_RESET_OTP_TTL_MINUTES } from '@/lib/emails/passwordResetOtp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

const ForgotPasswordPage = () => {
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loginHref = tenantSlug ? `/app/${tenantSlug}/login` : '/auth';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const result = await authService.requestPasswordReset(email, { tenantSlug });
      if (!result.ok) {
        setError(result.error || 'Something went wrong.');
        return;
      }
      setMessage(
        `If an account exists for that email, you will receive a message with a reset link and a 6-digit code. The code expires in ${PASSWORD_RESET_OTP_TTL_MINUTES} minutes`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <Mail className="mx-auto h-10 w-10 text-foreground mb-2" />
            <CardTitle className="text-2xl">Forgot password</CardTitle>
            <CardDescription className="text-gray-700">
              We will email you a link to the reset page and a 6-digit code; the code expires in 5 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          </CardContent>
          {(message || error) && (
            <CardFooter className="flex-col items-stretch gap-2 text-center text-sm pt-0">
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

export default ForgotPasswordPage;
