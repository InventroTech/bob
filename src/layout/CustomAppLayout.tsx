import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import ShortProfileCard from '@/components/ui/ShortProfileCard';

const details = {
  id: "I001",
  name: "Manisharan",
  address: "Bangalore",
  phone: "+91 9876543210",
  email: "manisharan@gmail.com",
  image: "https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg"
};

const CustomAppLayout: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  // const { tenantId } = useTenant();

  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  // Step 1: Get current user and their role
  useEffect(() => {
    const fetchUserRole = async () => {
      console.log("fetching user role")
      
      const email = localStorage.getItem('user_email');
      if (!email) {
        console.warn('Email or tenant ID missing.');
        return;
      }
      
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
      if (sessionError || !sessionData.session) {
        console.error('No session found:', sessionError);
        return;
      }
    
      if (!email) return;
      const { data: tenantData, error: tenantError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('email', email)
        .single();
      
        console.log("tenantData", tenantData)
        setTenantId(tenantData?.tenant_id || null);
        localStorage.setItem('tenant_id', tenantData?.tenant_id || null);
    
      const { data, error } = await supabase
        .from('users')
        .select('role_id')
        .eq('email', email)
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
  });

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
          <div className="flex items-center gap-2">
            <button className="text-black p-2">
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 8H20M2 2H20M2 14H20" stroke="#1E1E1E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className="text-xl font-bold">Pyro Dashboard</h2>
          </div>

          {/* Search */}
          <div className="flex-1 flex justify-center items-center">
            <div className="relative w-1/2">
              <input
                type="text"
                className="p-2 pl-10 pr-4 border border-[#D0D5DD] rounded-lg w-full"
                placeholder="Search..."
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M18 10a8 8 0 10-8 8 8 8 0 008-8z"
                />
              </svg>
            </div>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            <Bell size={24} className="text-black cursor-pointer" />
            <ShortProfileCard image={details.image} name={details.name} address={details.address} />
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