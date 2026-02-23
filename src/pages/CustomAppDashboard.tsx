import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { getTenantIdFromJWT, getRoleIdFromJWT } from '@/lib/jwt';

const CustomAppDashboard: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const dataFetchedRef = useRef(false); // Track if we've already fetched data

  useEffect(() => {
    // Reset ref when user changes (e.g., on logout/login)
    if (!user) {
      dataFetchedRef.current = false;
      setUserRoleId(null);
      setLoading(false);
      return;
    }

    const fetchFirstPage = async () => {
      if (!user?.email) {
        console.log('No user email available');
        setLoading(false);
        return;
      }

      // Prevent redundant fetches when user object changes (e.g., on page focus)
      if (dataFetchedRef.current) {
        return;
      }

      console.log('Fetching data for user:', user.email);

      try {
        // Get session to extract JWT token

        if (!session?.access_token) {
          console.error('No session found');
          toast.error('Failed to load user data');
          setLoading(false);
          return;
        }

        // Extract tenant_id and role_id from JWT token (no API call needed)
        const token = session.access_token;
        const tenantId = getTenantIdFromJWT(token);
        const roleId = getRoleIdFromJWT(token);

        if (!tenantId || !roleId) {
          console.log('Could not extract tenant_id or role_id from JWT');
          toast.error('Failed to load user data');
          setLoading(false);
          return;
        }

        setUserRoleId(roleId);
        dataFetchedRef.current = true;

        console.log('Tenant ID:', tenantId, 'Role ID:', roleId);

        // Fetch pages for this tenant and role
        const { data: pages, error: pagesError } = await supabase
          .from('pages')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('role', roleId)
          .order('display_order', { ascending: true });

        console.log('Pages query result:', { pages, pagesError });

        if (pagesError) {
          console.error('Error fetching pages:', pagesError);
          toast.error('Failed to load pages');
          setLoading(false);
          return;
        }

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
          <h5>Welcome to {tenantSlug}</h5>
          <p>You don't have any pages yet.</p>
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