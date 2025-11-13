import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Bell, PanelLeft, Sparkles, Users } from 'lucide-react';
import ShortProfileCard from '@/components/ui/ShortProfileCard';
import { useAuth } from '@/hooks/useAuth';
import { getTenantIdFromJWT, getRoleIdFromJWT } from '@/lib/jwt';

const CustomAppLayout: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidths = {
    expanded: 288,
    collapsed: 96,
  };

  const profileImage = user?.user_metadata?.picture || user?.user_metadata?.avatar_url || '';
  const profileName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';
  const navigationIconMap: Record<string, JSX.Element> = {
    "Pending Leads": <Sparkles className="h-4 w-4" />,
    "All Leads": <Users className="h-4 w-4" />,
  };
  const dataExtractedRef = useRef(false); // Track if we've already extracted data from JWT
  
  // Debug user data
  useEffect(() => {
    if (user) {
      console.log('User data:', user);
      console.log('User metadata:', user.user_metadata);
      console.log('Avatar URL:', user.user_metadata?.picture);
    }
  }, [user]);

  // Step 1: Get current user and their role from JWT (no API calls needed)
  useEffect(() => {
    // Reset ref when user changes (e.g., on logout/login)
    if (!user) {
      dataExtractedRef.current = false;
      setTenantId(null);
      setUserRoleId(null);
      return;
    }

    const extractUserDataFromJWT = async () => {
      // Prevent redundant extraction when user object changes (e.g., on page focus)
      if (dataExtractedRef.current && tenantId && userRoleId) {
        return;
      }
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
      if (sessionError || !sessionData.session?.access_token) {
        console.error('No session found:', sessionError);
        return;
      }
    
      // Extract tenant_id and role_id from JWT token
      const token = sessionData.session.access_token;
      const extractedTenantId = getTenantIdFromJWT(token);
      const extractedRoleId = getRoleIdFromJWT(token);
      
      if (extractedTenantId && extractedRoleId) {
        console.log('Extracted from JWT - tenantId:', extractedTenantId, 'roleId:', extractedRoleId);
        setTenantId(extractedTenantId);
        setUserRoleId(extractedRoleId);
        localStorage.setItem('tenant_id', extractedTenantId);
        dataExtractedRef.current = true;
      } else {
        console.warn('Could not extract tenant_id or role_id from JWT');
        // Fallback: try to get from localStorage if available
        const cachedTenantId = localStorage.getItem('tenant_id');
        if (cachedTenantId) {
          setTenantId(cachedTenantId);
        }
      }
    };
    
    extractUserDataFromJWT();
  }, [user]);

  // Step 2: Fetch pages that match the user's role
  useEffect(() => {
    const fetchPages = async () => {
      if (!tenantId || !userRoleId) return;

      const { data : pagesData, error } = await supabase 
        .from('pages')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('role', userRoleId)
        .order('updated_at', { ascending: false });
      console.log("tenantId", tenantId)
      console.log("userRoleId", userRoleId)
      console.log("pages data", pagesData)

      if (error) {
        toast.error('Failed to load pages');
        console.error('Pages fetch error:', error);
      } else {
        setPages(pagesData || []);
      }
    };

    fetchPages();
  }, [tenantId, userRoleId]);

  const handleLogout = async () => {
    try {
      // Use the centralized logout function
      await logout();
      
      // Close the logout dropdown
      setLogoutOpen(false);
      
      // Navigate to login page
      navigate(`/app/${tenantSlug}/login`);
      
    } catch (error) {
      console.error('Logout navigation error:', error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 h-full bg-white transition-all duration-200"
        style={{ width: sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidths.expanded }}
      >
        <aside className="relative flex h-full flex-col border-r bg-white">
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="absolute -right-4 top-8 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow transition hover:bg-gray-100 hover:text-black"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>

            <div className="flex items-center gap-3 px-4 pt-6 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <img src="/fire-logo.png" alt="Pyro" className="h-8 w-8" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-base font-semibold text-gray-900">Pyro</p>
                <p className="text-xs text-gray-500">Lead Workspace</p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-2 px-3 py-2">
            {pages.map((page) => (
              <NavLink
                key={page.id}
                to={`/app/${tenantSlug}/pages/${page.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl border ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'} text-sm font-medium transition ${
                    isActive
                      ? 'border-[#1D2939] bg-[#EFF4FF] text-[#1D2939] shadow-sm'
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isActive ? 'bg-[#EFF4FF] text-[#1D2939]' : 'bg-gray-100 text-gray-500'}`}>
                      {navigationIconMap[page.name] || <Sparkles className="h-4 w-4" />}
                    </div>
                    {!sidebarCollapsed && <span>{page.name}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto px-3 py-4 space-y-3">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <Bell className="h-4 w-4" />
              </div>
              {!sidebarCollapsed && <span>Notifications</span>}
            </button>

            <div className="border-t pt-4">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2">
              {sidebarCollapsed ? (
                <img
                  src={profileImage || '/default-avatar.png'}
                  alt={profileName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={profileImage || '/default-avatar.png'}
                    alt={profileName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{profileName}</p>
                    <p className="text-xs text-gray-500">View profile</p>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <main
        className="flex-1 overflow-auto bg-white transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidths.expanded }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default CustomAppLayout;