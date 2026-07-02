import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { setSentryUser, clearSentryUser } from '../lib/sentry';
import { clearAccessToken, setAccessToken } from '@/lib/auth/accessTokenProvider';
import { refreshAccessToken, signOutAndClearSession } from '@/lib/auth/authSessionService';
import {
  clearLocalAuthCaches,
  forceSignOutRevokedUser,
  getTenantSlugFromPath,
  SESSION_CHECK_MS,
  SESSION_WATCHDOG_INITIAL_DELAY_MS,
  shouldRunSessionWatchdog,
  validateServerSession,
} from '@/lib/auth/deletedUserSession';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);

  // Keep ref in sync so the auth listener always has the current path
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const getLoginUrl = useCallback((): string => {
    const match = locationRef.current.match(/^\/app\/([^/]+)/);
    const tenantSlug = match ? match[1] : null;
    if (tenantSlug && tenantSlug !== 'login' && tenantSlug !== 'auth') {
      return `/app/${tenantSlug}/login`;
    }
    return '/auth';
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Starting logout process...');
      clearLocalAuthCaches();
      clearAccessToken();
      clearSentryUser();
      setSession(null);
      setUser(null);
      await signOutAndClearSession();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Unexpected logout error:', error);
      toast.error('An unexpected error occurred during logout');
    }
  }, []);

  // Auth listener: set up ONCE (not on every pathname change)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAccessToken(session?.access_token ?? null);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setSentryUser({ id: u.id, email: u.email, username: u.user_metadata?.username || u.email?.split('@')[0] });
      } else {
        clearSentryUser();
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth state changed:', event);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          clearAccessToken();
          setUser(null);
          clearSentryUser();
          clearLocalAuthCaches();
          setLoading(false);
          const loginUrl = getLoginUrl();
          toast.error('Your session has expired. Please login again.');
          navigate(loginUrl, { replace: true });
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          clearAccessToken();
          setUser(null);
          clearSentryUser();
          clearLocalAuthCaches();
          setLoading(false);
          const loginUrl = getLoginUrl();
          toast.error('Your session has expired. Please login again.');
          navigate(loginUrl, { replace: true });
          return;
        }

        setSession(session);
        setAccessToken(session?.access_token ?? null);
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          setSentryUser({ id: u.id, email: u.email, username: u.user_metadata?.username || u.email?.split('@')[0] });
        } else {
          clearSentryUser();
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
   
  }, [navigate, getLoginUrl]);

  // Proactive token refresh: keep JWT fresh every 10 minutes while user is active
  useEffect(() => {
    if (!session?.access_token) return;

    const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
    const intervalId = setInterval(async () => {
      try {
        const token = await refreshAccessToken();
        if (!token) {
          console.warn('[useAuth] Proactive token refresh failed');
        } else {
          console.log('[useAuth] Proactive token refresh succeeded');
        }
      } catch (err) {
        console.warn('[useAuth] Proactive token refresh error:', err);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [session?.user?.id]);

  // Detect admin delete / revoked sessions without waiting for JWT expiry
  useEffect(() => {
    if (!session?.access_token) return;

    let cancelled = false;
    let consecutivePending = 0;

    const check = async () => {
      if (!shouldRunSessionWatchdog()) return;

      const status = await validateServerSession(getTenantSlugFromPath());
      if (cancelled) return;

      if (status === 'valid') {
        consecutivePending = 0;
        return;
      }

      if (status === 'pending') {
        consecutivePending += 1;
        // First-time login: link-user-uid may still be in progress
        if (consecutivePending < 4) return;
        await forceSignOutRevokedUser(
          'Your access to this organization was removed. Please log in again.'
        );
        return;
      }

      consecutivePending = 0;
      const message =
        status === 'auth_invalid'
          ? 'Your session has ended. Please log in again.'
          : 'Your access to this organization was removed. Please log in again.';

      await forceSignOutRevokedUser(message);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };

    const initialDelayId = window.setTimeout(() => void check(), SESSION_WATCHDOG_INITIAL_DELAY_MS);
    const intervalId = window.setInterval(() => void check(), SESSION_CHECK_MS);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(initialDelayId);
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session?.user?.id, session?.access_token]);

  const value = useMemo(() => ({
    session,
    user,
    loading,
    logout,
  }), [session?.access_token, user?.id, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 