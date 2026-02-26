import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { setSentryUser, clearSentryUser } from '../lib/sentry';

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
    const match = locationRef.current.match(/^\/app\/([^\/]+)/);
    const tenantSlug = match ? match[1] : null;
    if (tenantSlug && tenantSlug !== 'login' && tenantSlug !== 'auth') {
      return `/app/${tenantSlug}/login`;
    }
    return '/auth';
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Starting logout process...');

      localStorage.removeItem('user_email');
      localStorage.removeItem('tenant_id');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        try {
          const url = new URL(supabaseUrl);
          const projectRef = url.hostname.split('.')[0];
          localStorage.removeItem(`sb-${projectRef}-auth-token`);
        } catch {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        }
      }

      sessionStorage.removeItem('ticketCarouselState');
      sessionStorage.removeItem('pyro_access_check');
      clearSentryUser();
      setSession(null);
      setUser(null);

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
          setUser(null);
          clearSentryUser();
          setLoading(false);
          const loginUrl = getLoginUrl();
          toast.error('Your session has expired. Please login again.');
          navigate(loginUrl, { replace: true });
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          setUser(null);
          clearSentryUser();
          setLoading(false);
          const loginUrl = getLoginUrl();
          toast.error('Your session has expired. Please login again.');
          navigate(loginUrl, { replace: true });
          return;
        }

        setSession(session);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, getLoginUrl]);

  // Proactive token refresh: keep JWT fresh every 10 minutes while user is active
  useEffect(() => {
    if (!session?.access_token) return;

    const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
    const intervalId = setInterval(async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('[useAuth] Proactive token refresh failed:', error.message);
        } else {
          console.log('[useAuth] Proactive token refresh succeeded');
        }
      } catch (err) {
        console.warn('[useAuth] Proactive token refresh error:', err);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [session?.user?.id]);

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