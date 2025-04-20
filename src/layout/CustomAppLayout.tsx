import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CustomAppLayout: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from('pages')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load pages');
        } else if (data) {
          setPages(data);
        }
      });
  }, [tenantId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/app/${tenantSlug}/login`);
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-100 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Your Pages</h2>
        <nav className="flex-1 space-y-2">
          <NavLink to={`/app/${tenantSlug}`} end className="block px-2 py-1 rounded hover:bg-gray-200" activeClassName="bg-gray-200">
            Dashboard
          </NavLink>
          {pages.map((page) => (
            <NavLink
              key={page.id}
              to={`/app/${tenantSlug}/pages/${page.id}`}
              className="block px-2 py-1 rounded hover:bg-gray-200"
              activeClassName="bg-gray-200"
            >
              {page.name}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" onClick={handleLogout} className="mt-4">
          Logout
        </Button>
      </aside>
      <main className="flex-1 overflow-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
};

export default CustomAppLayout; 