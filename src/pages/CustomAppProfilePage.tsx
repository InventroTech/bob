import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/lib/supabase';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CustomAppProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { role } = useTenant();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error logging out');
    } else {
      window.location.href = `/app/${tenantSlug}/login`;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
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