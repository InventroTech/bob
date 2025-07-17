import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the centralized logout function
      await logout();
      
      // Navigate to auth page
      navigate('/auth');
      
    } catch (error: any) {
      console.error('Error logging out:', error);
      setError(error.message || 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
            <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
            {/* Add more profile fields here */}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
             <Button 
               variant="destructive" 
               onClick={handleLogout} 
               disabled={loading}
             >
               <LogOut className="mr-2 h-4 w-4" />
               {loading ? 'Signing Out...' : 'Sign Out'}
             </Button>
             {error && <p className="text-red-600 text-sm">Error: {error}</p>}
           </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage; 