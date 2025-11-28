import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
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

  const logout = async () => {
    try {
      console.log('Starting logout process...');
      
      // Clear any local storage items
      localStorage.removeItem('user_email');
      localStorage.removeItem('tenant_id');
      console.log('Local storage cleared');
      
      // Clear session storage items
      sessionStorage.removeItem('ticketCarouselState');
      console.log('Session storage cleared');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase logout error:', error);
        toast.error('Failed to logout. Please try again.');
        return;
      }
      
      console.log('Supabase logout successful');
      
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
      async (_event, session) => {
        console.log('Supabase auth state changed:', _event, session);
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
  }, []);

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