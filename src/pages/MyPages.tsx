import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { membershipService } from '@/lib/api';

interface PageRecord {
  id: string;
  name: string;
  updated_at: string;
  role_id: string;
}

interface Role {
  id: string;
  name: string;
}

const MyPages = () => {
  const { user } = useAuth();
  const [pagesByRole, setPagesByRole] = useState<Record<string, PageRecord[]>>({});
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  const fetchPagesAndRoles = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch all roles using API
      const rolesData = await membershipService.getRoles();

      const rolesLookup: Record<string, string> = {};
      (rolesData || []).forEach((role) => {
        rolesLookup[role.id] = role.name;
      });
      console.log("rolesLookup", rolesLookup);
      setRolesMap(rolesLookup);

      // Fetch pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('id, name, updated_at, role')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (pagesError) throw pagesError;

      // Group pages by role name
      const grouped: Record<string, PageRecord[]> = {};
      (pagesData || []).forEach((page) => {
        const roleName = rolesLookup[page.role] || 'Unassigned';
        if (!grouped[roleName]) grouped[roleName] = [];
        grouped[roleName].push({
          id: page.id,
          name: page.name,
          updated_at: page.updated_at,
          role_id: page.role
        });
      });

      setPagesByRole(grouped);
    } catch (err: any) {
      console.error('Error loading pages:', err);
      setError(err.message || 'Failed to load pages.');
      toast.error(`Error loading pages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenant slug
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: tu } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      if (!tu) return;
      const { data: t } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', tu.tenant_id)
        .single();
      if (t?.slug) setTenantSlug(t.slug);
    })();
  }, [user]);

  useEffect(() => {
    fetchPagesAndRoles();
  }, [user]);

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    const { error } = await supabase.from('pages').delete().eq('id', pageId);
    if (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page.');
    } else {
      toast.success('Page deleted.');
      fetchPagesAndRoles();
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4">Loading your pages...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Custom-app URL */}
        {tenantSlug && (
          <div className="mb-4 p-4 bg-muted rounded">
            <p className="text-sm text-muted-foreground">Your custom-app URL:</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-primary">{`${window.location.origin}/app/${tenantSlug}`}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/app/${tenantSlug}`);
                  toast.success('Copied!');
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h5>My Pages</h5>
          <Button asChild>
            <Link to="/builder/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Page
            </Link>
          </Button>
        </div>

        {error && (
          <p className="text-red-600">Error loading pages: {error}</p>
        )}

        {Object.keys(pagesByRole).length === 0 && !error ? (
          <p className="text-muted-foreground">You haven't created any pages yet.</p>
        ) : (
          Object.entries(pagesByRole).map(([roleName, pages]) => (
            <div key={roleName}>
              <h5>
                {roleName === 'public' || roleName === 'Unassigned' 
                  ? '🌐 Open Access (No Login Required)' 
                  : `${roleName} Pages :-`}
              </h5>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((page) => {
                  const isPublic = roleName === 'public' || roleName === 'Unassigned';
                  const publicUrl = isPublic && tenantSlug 
                    ? `${window.location.origin}/app/${tenantSlug}/public/${page.id}`
                    : null;
                  
                  return (
                    <Card key={page.id}>
                      <CardHeader>
                        <h5 className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {page.name}
                          {isPublic && (
                            <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Open Access
                            </span>
                          )}
                        </h5>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground space-y-2">
                        <div>
                          Last updated: {new Date(page.updated_at).toLocaleDateString()}
                        </div>
                        {publicUrl && (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="text-xs font-semibold mb-1">Public URL:</p>
                            <div className="flex items-center gap-1">
                              <code className="text-xs break-all">{publicUrl}</code>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-6 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(publicUrl);
                                toast.success('Public URL copied!');
                              }}
                            >
                              📋 Copy URL
                            </Button>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/builder/${page.id}`}>Edit Page</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePage(page.id)}
                        >
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyPages;
