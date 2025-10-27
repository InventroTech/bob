import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/lib/apiService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const CustomAppDashboard: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFirstPage = async () => {
      if (!user?.email) {
        console.log('No user email available');
        setLoading(false);
        return;
      }

      console.log('Fetching data for user:', user.email);

      try {
        // Get tenant_id and role_id for the user
        const userResponse = await apiService.getUserByEmail(user.email);
        
        console.log('User data result:', userResponse);

        if (!userResponse.success) {
          console.error('Error fetching user data:', userResponse.error);
          toast.error('Failed to load user data');
          setLoading(false);
          return;
        }

        const userData = userResponse.data;
        if (!userData?.tenant_id) {
          console.log('No tenant_id found for user');
          setLoading(false);
          return;
        }

        const tenantId = userData.tenant_id;
        const roleId = userData.role_id;
        setUserRoleId(roleId);

        console.log('Tenant ID:', tenantId, 'Role ID:', roleId);

        // Fetch pages for this tenant and role
        const pagesResponse = await apiService.getPages(tenantId, roleId);

        console.log('Pages query result:', pagesResponse);

        if (!pagesResponse.success) {
          console.error('Error fetching pages:', pagesResponse.error);
          toast.error('Failed to load pages');
          setLoading(false);
          return;
        }

        const pages = pagesResponse.data;

        if (pages && pages.length > 0) {
          console.log('Found pages:', pages);
          const firstPage = pages[0];
          console.log('Redirecting to first page:', firstPage);
          navigate(`/app/${tenantSlug}/pages/${firstPage.id}`, { replace: true });
        } else {
          console.log('No pages found for tenant and role');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in fetchFirstPage:', error);
        setLoading(false);
      }
    };

    fetchFirstPage();
  }, [user, tenantSlug, navigate]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Timeout reached, stopping loading');
        setLoading(false);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to {tenantSlug}</h1>
          <p className="text-gray-600">You don't have any pages yet.</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-700 mb-4">
            Contact your administrator to create pages for your account.
          </p>
          <p className="text-xs text-gray-500">
            User: {user?.email}
          </p>
          {userRoleId && (
            <p className="text-xs text-gray-500">
              Role ID: <code className="font-mono bg-gray-100 px-1 rounded">{userRoleId}</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomAppDashboard; 