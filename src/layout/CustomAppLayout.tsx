import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import ShortProfileCard from '@/components/ui/ShortProfileCard';
import { useAuth } from '@/hooks/useAuth';
import { getCachedSupabaseQuery, setCachedSupabaseQuery, SUPABASE_CACHE_KEYS } from '@/lib/supabaseCache';
import { getCachedTenant as getCachedTenantFromSession } from '@/lib/sessionCache';

const CustomAppLayout: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  // Debug user data
  useEffect(() => {
    if (user) {
      console.log('User data:', user);
      console.log('User metadata:', user.user_metadata);
      console.log('Avatar URL:', user.user_metadata?.picture);
    }
  }, [user]);

  // Step 1: Get current user and their role
  useEffect(() => {
    const fetchUserRole = async () => {
      console.log("fetching user role")
      
      if (!user?.email) {
        console.warn('Email missing.');
        return;
      }
      
      // Try to get tenant from session cache first
      const cachedTenant = getCachedTenantFromSession();
      if (cachedTenant) {
        console.log('[CustomAppLayout] Using cached tenant');
        setTenantId(cachedTenant.id || null);
        localStorage.setItem('tenant_id', cachedTenant.id || null);
        
        // Try to get role_id from cache
        const cacheKey = SUPABASE_CACHE_KEYS.TENANT(user.id);
        const cached = getCachedSupabaseQuery<{ role_id: string }>(cacheKey);
        if (cached?.role_id) {
          setUserRoleId(cached.role_id);
          return;
        }
      }
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
      if (sessionError || !sessionData.session) {
        console.error('No session found:', sessionError);
        return;
      }
    
      // Check cache for tenant_id
      const tenantCacheKey = SUPABASE_CACHE_KEYS.TENANT(user.id);
      const cachedTenantId = getCachedSupabaseQuery<{ tenant_id: string }>(tenantCacheKey);
      
      if (cachedTenantId?.tenant_id) {
        console.log('[CustomAppLayout] Using cached tenant_id');
        setTenantId(cachedTenantId.tenant_id);
        localStorage.setItem('tenant_id', cachedTenantId.tenant_id);
      } else {
        const { data: tenantData, error: tenantError } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('email', user.email)
          .single();
        
        console.log("tenantData", tenantData)
        if (tenantData?.tenant_id) {
          setTenantId(tenantData.tenant_id);
          localStorage.setItem('tenant_id', tenantData.tenant_id);
          setCachedSupabaseQuery(tenantCacheKey, { tenant_id: tenantData.tenant_id });
        }
      }
    
      // Check cache for role_id
      const roleCacheKey = SUPABASE_CACHE_KEYS.TENANT(user.id);
      const cachedRole = getCachedSupabaseQuery<{ role_id: string }>(roleCacheKey);
      
      if (cachedRole?.role_id) {
        console.log('[CustomAppLayout] Using cached role_id');
        setUserRoleId(cachedRole.role_id);
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('role_id')
          .eq('email', user.email)
          .single();
        
        console.log("data", data)
        if (error) {
          console.error('Failed to fetch user role:', error);
          toast.error('Could not load user role');
          return;
        }
        
        if (data?.role_id) {
          setUserRoleId(data.role_id);
          setCachedSupabaseQuery(roleCacheKey, { role_id: data.role_id });
        }
      }
    };
    
    fetchUserRole();
  }, [user]);

  // Step 2: Fetch pages that match the user's role
  useEffect(() => {
    const fetchPages = async () => {
      if (!tenantId || !userRoleId || !user?.id) return;

      // Check cache first
      const cacheKey = SUPABASE_CACHE_KEYS.PAGES(user.id, tenantId, userRoleId);
      const cachedPages = getCachedSupabaseQuery<{ id: string; name: string }[]>(cacheKey);
      
      if (cachedPages && cachedPages.length > 0) {
        console.log('[CustomAppLayout] Using cached pages');
        setPages(cachedPages);
        return;
      }

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
        const pages = pagesData || [];
        setPages(pages);
        // Cache the pages
        setCachedSupabaseQuery(cacheKey, pages);
      }
    };

    fetchPages();
  }, [tenantId, userRoleId, user?.id]);

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
      {/* Header */}
      <div className="fixed top-0 left-0 w-full bg-white p-2 border-b z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center ">
            <button className="text-black ">
              <img src="/fire-logo.png" alt="Pyro" className="w-8 h-8 " />
            </button>
            <h2 className="text-xl font-bold">Pyro</h2>
          </div>

          

          {/* User Section */}
          <div className="flex items-center gap-4 relative">
            <Bell size={24} className="text-black cursor-pointer" />
            <div className="relative flex flex-row gap-2">
              <button onClick={() => setLogoutOpen(!logoutOpen)}>
                <ShortProfileCard 
                  image={user?.user_metadata?.picture || user?.user_metadata?.avatar_url || ''} 
                  name={user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'} 
                  address={user?.email || ''} 
                />
              </button>
              {logoutOpen && (
                <div className="">
                  <button 
                    className='text-white bg-red-500 rounded-md px-4 py-2 hover:bg-red-600 transition-colors'
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="fixed left-0 top-16 h-full bg-white">
        <aside className="w-64 bg-white p-4 flex flex-col top-16">
          <nav className="flex-1 space-y-2">
            {pages.map((page) => (
              <NavLink
                key={page.id}
                to={`/app/${tenantSlug}/pages/${page.id}`}
                className={({ isActive }) =>
                  `block px-2 py-1 rounded hover:bg-gray-200 ${isActive ? 'bg-gray-100 border-l border-l-2 border-[#1D2939]' : ''}`
                }
              >
                {page.name}
              </NavLink>
            ))}
          </nav>
        </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#EAECF0] ml-64 mt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default CustomAppLayout;