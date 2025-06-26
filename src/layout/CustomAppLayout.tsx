import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import ShortProfileCard from '@/components/ui/ShortProfileCard';
import { useAuth } from '@/hooks/useAuth';

const CustomAppLayout: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
      if (sessionError || !sessionData.session) {
        console.error('No session found:', sessionError);
        return;
      }
    
      const { data: tenantData, error: tenantError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('email', user.email)
        .single();
      
      console.log("tenantData", tenantData)
      setTenantId(tenantData?.tenant_id || null);
      localStorage.setItem('tenant_id', tenantData?.tenant_id || null);
    
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
    
      setUserRoleId(data?.role_id || null);
    };
    
    fetchUserRole();
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
    await supabase.auth.signOut();
    navigate(`/app/${tenantSlug}/login`);
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