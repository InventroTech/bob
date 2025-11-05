import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { preloadSessionData, invalidateSessionCache } from '@/lib/sessionCache';
import { clearApiCache } from '@/lib/apiCache';
import { clearSupabaseCache } from '@/lib/supabaseCache';

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
      
      // Clear session cache
      try {
        invalidateSessionCache();
      } catch (error) {
        console.error('Failed to clear session cache:', error);
      }
      
      // Clear Supabase cache
      try {
        clearSupabaseCache();
      } catch (error) {
        console.error('Failed to clear Supabase cache:', error);
      }
      
      // Clear API cache
      try {
        clearApiCache();
      } catch (error) {
        console.error('Failed to clear API cache:', error);
      }
      
      console.log('Session storage cleared');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase logout error:', error);
        toast.error('Failed to logout. Please try again.');
        return;
      }
      
      console.log('Supabase logout successful');
      
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Set loading to false immediately - don't wait for preloading
      setLoading(false);
      
      // Pre-fetch session data in the background (non-blocking)
      if (session?.access_token && session.user) {
        // Don't await - let it run in the background
        import('@/lib/sessionCache').then(({ preloadSessionData }) => 
          preloadSessionData(
            session.access_token,
            session.user.id,
            'bibhab-thepyro-ai'
          ).catch(err => 
            console.error('Failed to pre-load session data:', err)
          )
        ).catch(err => {
          console.error('Error in background preloading:', err);
        });
      }
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Supabase auth state changed:', _event, session);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Set loading to false immediately
        setLoading(false);
        
        // Pre-fetch session data when session is available (non-blocking)
        if (session?.access_token && _event === 'SIGNED_IN' && session.user) {
          // Don't await - let it run in the background
          import('@/lib/sessionCache').then(({ preloadSessionData }) => 
            preloadSessionData(
              session.access_token,
              session.user.id,
              'bibhab-thepyro-ai'
            ).catch(err => 
              console.error('Failed to pre-load session data:', err)
            )
          ).catch(err => {
            console.error('Error in background preloading:', err);
          });
        }
        
        // Clear caches on logout
        if (_event === 'SIGNED_OUT') {
          try {
            // Clear session cache on logout
            invalidateSessionCache();
            
            // Clear Supabase cache on logout
            clearSupabaseCache();
            
            // Clear API cache on logout
            clearApiCache();
          } catch (error) {
            console.error('Failed to clear caches:', error);
          }
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 