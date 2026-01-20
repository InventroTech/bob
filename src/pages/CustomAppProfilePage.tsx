import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/lib/supabase';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CustomAppProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { role } = useTenant();

  const handleLogout = async () => {
    try {
      // Use the centralized logout function
      await logout();
      
      // Navigate to login page
      window.location.href = `/app/${tenantSlug}/login`;
      
    } catch (error) {
      console.error('Logout navigation error:', error);
    }
  };

  return (
    <div className="p-6">
      <h5>Profile</h5>
      <p><strong>Email:</strong> {user?.email}</p>
      <p><strong>User ID:</strong> {user?.id}</p>
      <p><strong>Role:</strong> {role}</p>
      <div className="mt-4">
        <Button variant="destructive" onClick={handleLogout}>Sign Out</Button>
      </div>
    </div>
  );
};

export default CustomAppProfilePage; 