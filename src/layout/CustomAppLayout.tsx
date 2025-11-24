import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Bell, PanelLeft, Sparkles, Users, LogOut, Menu } from 'lucide-react';
import ShortProfileCard from '@/components/ui/ShortProfileCard';
import { useAuth } from '@/hooks/useAuth';
import { getTenantIdFromJWT, getRoleIdFromJWT } from '@/lib/jwt';

const FollowUpIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_follow_up)">
      <path
        d="M9.5 14C11.71 14 13.5 12.21 13.5 10C13.5 7.79 11.71 6 9.5 6C7.29 6 5.5 7.79 5.5 10C5.5 12.21 7.29 14 9.5 14ZM9.5 8C10.6 8 11.5 8.9 11.5 10C11.5 11.1 10.6 12 9.5 12C8.4 12 7.5 11.1 7.5 10C7.5 8.9 8.4 8 9.5 8Z"
        fill="#0B0C10"
        fillOpacity="0.8"
      />
      <path
        d="M15.89 16.56C14.21 15.7 12.03 15 9.5 15C6.97 15 4.79 15.7 3.11 16.56C2.11 17.07 1.5 18.1 1.5 19.22V22H17.5V19.22C17.5 18.1 16.89 17.07 15.89 16.56ZM15.5 20H3.5V19.22C3.5 18.84 3.7 18.5 4.02 18.34C5.21 17.73 7.13 17 9.5 17C11.87 17 13.79 17.73 14.98 18.34C15.3 18.5 15.5 18.84 15.5 19.22V20Z"
        fill="#0B0C10"
        fillOpacity="0.8"
      />
      <path
        d="M19.8272 8.18918C19.8272 6.37248 19.1369 3.95357 17.2728 2.28429C14.6746 -0.0421777 10.9629 -0.315451 8.09548 1.33521L9.02384 2.95177C11.2065 1.69474 14.0385 1.90501 16.022 3.68113C17.6164 5.10882 18 6.99995 17.9421 8.29316L15.1083 8.50464L19.1369 12.0075L22.6398 7.97887L19.8272 8.18918Z"
        fill="#0B0C10"
        fillOpacity="0.8"
      />
    </g>
    <defs>
      <clipPath id="clip0_follow_up">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const CustomAppLayout: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    "pending leads": <Sparkles className="h-4 w-4" />,
    "all leads": <Users className="h-4 w-4" />,
    "follow up leads": <FollowUpIcon />,
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
    setIsLoggingOut(true);
    try {
      // Use the centralized logout function
      await logout();
      
      // Close the logout dropdown
      setLogoutOpen(false);
      
      // Navigate to login page
      navigate(`/app/${tenantSlug}/login`);
      
    } catch (error) {
      console.error('Logout navigation error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 h-full bg-white transition-all duration-200"
        style={{ width: sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidths.expanded }}
      >
        <aside className="relative flex h-full flex-col border-r bg-white">
          {/* Toggle button - only show when expanded */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="absolute -right-4 top-8 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow transition hover:bg-gray-100 hover:text-black"
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}

            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-0' : 'px-4'} pt-6 pb-4`}>
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 cursor-pointer"
                aria-label="Expand sidebar"
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </button>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <img src="/fire-logo.png" alt="Pyro" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">Pyro</p>
                  <p className="text-xs text-gray-500">Lead Workspace</p>
                </div>
              </>
            )}
          </div>

          <nav className={`flex-1 space-y-2 py-2 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
            {pages.map((page) => (
              <NavLink
                key={page.id}
                to={`/app/${tenantSlug}/pages/${page.id}`}
                className={({ isActive }) =>
                  `flex items-center rounded-xl border ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'} text-sm font-medium transition ${
                    isActive
                      ? 'border-[#1D2939] bg-[#EFF4FF] text-[#1D2939] shadow-sm'
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isActive ? 'bg-[#EFF4FF] text-[#1D2939]' : 'bg-gray-100 text-gray-500'}`}>
                      {
                        navigationIconMap[
                          page.name?.toLowerCase().replace(/[\s_-]+/g, " ").trim()
                        ] || <Sparkles className="h-4 w-4" />
                      }
                    </div>
                    {!sidebarCollapsed && <span>{page.name}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={`mt-auto py-4 space-y-3 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
            <button className={`flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <Bell className="h-4 w-4" />
              </div>
              {!sidebarCollapsed && <span>Notifications</span>}
            </button>

            <div className="border-t pt-4 space-y-2">
              <div className={`flex items-center rounded-xl px-3 py-2 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
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
                  <p className="text-sm font-semibold text-gray-900">{profileName}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                sidebarCollapsed 
                  ? 'justify-center' 
                  : ''
              } ${
                isLoggingOut
                  ? 'opacity-50 cursor-not-allowed border-transparent text-gray-500'
                  : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isLoggingOut 
                  ? 'bg-gray-100 text-gray-500' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <LogOut className="h-4 w-4" />
              </div>
              {!sidebarCollapsed && (
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              )}
            </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <main
        className="flex-1 h-full bg-white transition-all duration-200 overflow-hidden"
        style={{ marginLeft: sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidths.expanded }}
      >
        <div className="h-full w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CustomAppLayout;