import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiService } from '@/lib/apiService';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

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
      // Fetch all roles
      const rolesResponse = await apiService.getRoles('');
      if (!rolesResponse.success) throw new Error(rolesResponse.error || 'Failed to fetch roles');
      
      const rolesData = rolesResponse.data;

      const rolesLookup: Record<string, string> = {};
      (rolesData || []).forEach((role) => {
        rolesLookup[role.id] = role.name;
      });
      console.log("rolesLookup", rolesLookup);
      setRolesMap(rolesLookup);

      // Fetch pages
      const pagesResponse = await apiService.getPagesByUser(user.id);
      if (!pagesResponse.success) throw new Error(pagesResponse.error || 'Failed to fetch pages');
      
      const pagesData = pagesResponse.data;

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
      const tuResponse = await apiService.getTenantUser(user.id);
      if (!tuResponse.success || !tuResponse.data) return;
      
      const tResponse = await apiService.getTenant(tuResponse.data.tenant_id);
      if (tResponse.success && tResponse.data?.slug) {
        setTenantSlug(tResponse.data.slug);
      }
    })();
  }, [user]);

  useEffect(() => {
    fetchPagesAndRoles();
  }, [user]);

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    const response = await apiService.deletePage(pageId);
    if (!response.success) {
      console.error('Error deleting page:', response.error);
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
          <h1 className="text-2xl font-semibold">My Pages</h1>
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
              <h2 className="text-xl font-bold mt-6 mb-2">{roleName} Pages :-</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((page) => (
                  <Card key={page.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {page.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Last updated: {new Date(page.updated_at).toLocaleDateString()}
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
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyPages;
