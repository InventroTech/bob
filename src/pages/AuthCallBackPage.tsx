// /pages/AuthCallbackPage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT } from '@/lib/jwt';
import { formatOAuthLoginError, readOAuthCallbackError } from '@/pages/customAppAuthShared';

function redirectToLogin(
  navigate: ReturnType<typeof useNavigate>,
  tenantSlug: string | undefined,
  authError?: string
) {
  navigate(`/app/${tenantSlug}/login`, {
    replace: true,
    state: authError ? { authError } : null,
  });
}

async function resolveOAuthSession(): Promise<{ session: Session | null; user: User | null; errorMessage?: string }> {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.id && session.user.email) {
    return { session, user: session.user };
  }

  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      ({
        data: { session },
      } = await supabase.auth.getSession());
      if (session?.user?.id && session.user.email) {
        return { session, user: session.user };
      }
      return { session: null, user: null, errorMessage: error.message };
    }
    if (data.session?.user?.id && data.session.user.email) {
      return { session: data.session, user: data.session.user };
    }
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    ({
      data: { session },
    } = await supabase.auth.getSession());
    if (session?.user?.id && session.user.email) {
      return { session, user: session.user };
    }
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (user?.id && user.email) {
    return { session, user };
  }

  return {
    session: null,
    user: null,
    errorMessage: userError?.message || 'No Supabase session was created after OAuth redirect.',
  };
}

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const fetchAndRedirect = async () => {
      const oauthError = readOAuthCallbackError();
      if (oauthError) {
        console.error('[AuthCallBackPage] OAuth provider error:', oauthError, {
          search: window.location.search,
          hash: window.location.hash,
        });
        redirectToLogin(navigate, tenantSlug, formatOAuthLoginError(oauthError));
        return;
      }

      const { session, user, errorMessage } = await resolveOAuthSession();
      if (!user?.email || !user.id) {
        console.error('[AuthCallBackPage] Failed to establish session after OAuth callback', {
          errorMessage,
          search: window.location.search,
          hash: window.location.hash,
          href: window.location.href,
        });
        redirectToLogin(
          navigate,
          tenantSlug,
          formatOAuthLoginError(errorMessage || 'Failed to complete login')
        );
        return;
      }

      try {
        const isAlreadyLinked = session?.access_token && getRoleIdFromJWT(session.access_token);

        if (!isAlreadyLinked) {
          console.log('[AuthCallBackPage] User needs linking, calling link-user-uid...');
          const result = await authService.linkUserUid({ uid: user.id, email: user.email });

          if (result.success === false || result.error) {
            const errorCode = (result as { code?: string }).code;
            const errorMessageText = result.error || '';

            const isExpectedError =
              errorCode === 'NO_TENANT_MEMBERSHIP' ||
              errorMessageText.includes('No TenantMembership found') ||
              errorMessageText.includes('already has a linked UID') ||
              errorMessageText.includes('already linked');

            if (!isExpectedError) {
              console.error('[AuthCallBackPage] Error linking user UID:', result.error);
              toast.error('Warning: User linking failed, but login will continue');
            }
          } else if (result.success === true) {
            console.log('[AuthCallBackPage] User UID linked successfully, refreshing session...');

            try {
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn('[AuthCallBackPage] Session refresh failed after linking:', refreshError);
              } else {
                const { data: { session: refreshedSession } } = await supabase.auth.getSession();
                if (refreshedSession?.access_token) {
                  const hasRoleId = getRoleIdFromJWT(refreshedSession.access_token);
                  console.log(
                    hasRoleId
                      ? '[AuthCallBackPage] JWT now contains user_data'
                      : '[AuthCallBackPage] JWT still missing user_data'
                  );
                }
              }
            } catch (refreshErr) {
              console.error('[AuthCallBackPage] Error refreshing session:', refreshErr);
            }
          }
        } else {
          console.log('[AuthCallBackPage] User already linked, skipping link-user-uid');
        }
      } catch (error) {
        console.error('[AuthCallBackPage] Error during user linking:', error);
        toast.error('Warning: User linking failed, but login will continue');
      }

      localStorage.setItem('user_email', user.email);
      toast.success('Login successful!', { duration: 2000 });
      navigate(`/app/${tenantSlug}`, { replace: true });
    };

    fetchAndRedirect();
  }, [navigate, tenantSlug]);

  return <p className="p-6 text-center">Completing login…</p>;
};

export default AuthCallbackPage;
