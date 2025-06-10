'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface TemporaryLogoutProps {
  config?: {
    title?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  };
}

export const TemporaryLogoutComponent: React.FC<TemporaryLogoutProps> = ({ config }) => {
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!user) {
      toast.error('No user session found');
      return;
    }

    setIsLoggingOut(true);
    try {
      // Sign out the user
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      toast.success('Logged out successfully');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);

    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button 
      onClick={handleLogout}
      disabled={isLoggingOut}
      variant={config?.variant || 'destructive'}
      size={config?.size || 'default'}
      className="flex items-center gap-2"
    >
      {isLoggingOut ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          Logging Out...
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          {config?.title || 'Logout'}
        </>
      )}
    </Button>
  );
}; 