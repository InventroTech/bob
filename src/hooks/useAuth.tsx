import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
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

  // Helper function to extract tenant slug from current path
  const getTenantSlugFromPath = (): string | null => {
    const match = location.pathname.match(/^\/app\/([^\/]+)/);
    return match ? match[1] : null;
  };

  // Helper function to get appropriate login URL
  const getLoginUrl = (): string => {
    const tenantSlug = getTenantSlugFromPath();
    if (tenantSlug && tenantSlug !== 'login' && tenantSlug !== 'auth') {
      return `/app/${tenantSlug}/login`;
    }
    return '/auth';
  };

  const logout = async () => {
    try {
      console.log('Starting logout process...');

      // Clear any local storage items
      localStorage.removeItem('user_email');
      localStorage.removeItem('tenant_id');

      // Clear Supabase auth tokens from localStorage
      // Supabase stores tokens with pattern: sb-<project-ref>-auth-token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        try {
          const url = new URL(supabaseUrl);
          const projectRef = url.hostname.split('.')[0];
          const authTokenKey = `sb-${projectRef}-auth-token`;
          localStorage.removeItem(authTokenKey);
          console.log(`Cleared Supabase auth token: ${authTokenKey}`);
        } catch (urlError) {
          // Fallback: clear all Supabase-related auth token keys
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
              console.log(`Cleared Supabase auth token: ${key}`);
            }
          });
        }
      }
      console.log('Local storage cleared');

      // Clear session storage items
      sessionStorage.removeItem('ticketCarouselState');
      console.log('Session storage cleared');

      // Clear Sentry user context
      clearSentryUser();

      // Clear session and user state
      setSession(null);
      setUser(null);
      console.log('Local state cleared');

      toast.success('Logged out successfully');
      console.log('Logout process completed successfully');
    } catch (error) {
      console.error('Unexpected logout error:', error);
      toast.error('An unexpected error occurred during logout');
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const user = session?.user ?? null;
      setUser(user);
      
      // Set Sentry user context if user exists
      if (user) {
        setSentryUser({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email?.split('@')[0],
        });
      } else {
        clearSentryUser();
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth state changed:', event, session);
        
        // Handle sign out or token expiration
        if (event === 'SIGNED_OUT') {
          console.log('User signed out - redirecting to login');
          setSession(null);
          setUser(null);
          clearSentryUser();
          setLoading(false);
          
          // Redirect to appropriate login page
          const loginUrl = getLoginUrl();
          toast.error('Your session has expired. Please login again.');
          navigate(loginUrl, { replace: true });
          return;
        }

        // Handle token refresh failure
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh failed - session lost');
          setSession(null);
          setUser(null);
          clearSentryUser();
          setLoading(false);
          
          const loginUrl = getLoginUrl();
          toast.error('Your session has expired. Please login again.');
          navigate(loginUrl, { replace: true });
          return;
        }

        // Handle user update/sign in
        setSession(session);
        const user = session?.user ?? null;
        setUser(user);
        
        // Set Sentry user context when auth state changes
        if (user) {
          setSentryUser({
            id: user.id,
            email: user.email,
            username: user.user_metadata?.username || user.email?.split('@')[0],
          });
        } else {
          clearSentryUser();
        }
        
        setLoading(false); // Ensure loading is false after update
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const value = useMemo(() => ({
    session,
    user,
    loading,
    logout,
  }), [session?.access_token, user?.id, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 