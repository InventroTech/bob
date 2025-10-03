import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { authService } from '../lib/authService';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
      
      const response = await authService.signOut();
      if (!response.success) {
        console.error('Logout error:', response.error);
        toast.error('Failed to logout. Please try again.');
        return;
      }
      
      console.log('Logout successful');
      
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
    authService.getSession().then((response) => {
      if (response.success) {
        setSession(response.data as any); // Type conversion for compatibility
        setUser(response.data?.user as any ?? null);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state changed:', _event, session);
        setSession(session as any); // Type conversion for compatibility
        setUser(session?.user as any ?? null);
        setLoading(false); // Ensure loading is false after update
      }
    );

    // Cleanup listener on component unmount
    return () => {
      unsubscribe();
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