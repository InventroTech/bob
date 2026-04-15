import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
// 2. IMPORT PAGESERVICE ALONGSIDE MEMBERSHIPSERVICE
import { membershipService, pageService } from '@/lib/api'; 
import { getTenantSlug } from '@/lib/api/config';

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
  const [tenantSlug] = useState<string>(() => getTenantSlug());

  const fetchPagesAndRoles = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const rolesData = await membershipService.getRoles();

      const rolesLookup: Record<string, string> = {};
      (rolesData || []).forEach((role) => {
        rolesLookup[role.id] = role.name;
      });
      setRolesMap(rolesLookup);

      // 3. THE GET CALL: Changed from Supabase to pageService
      const rawPagesData = await pageService.getPages(user.id);

      // --- NEW FRONTEND SORTING LOGIC ---
      // First sort by display_order (ascending). If they match, sort by updated_at (newest first).
      const sortedPagesData = [...(rawPagesData || [])].sort((a: unknown, b: unknown) => {
        // Use 9999 as a fallback so items without an order drop to the bottom safely
        const orderA = a.display_order ?? 9999; 
        const orderB = b.display_order ?? 9999;
        
        if (orderA !== orderB) {
          return orderA - orderB; // Sorts 1, 2, 3...
        }
        
        // If display orders are exactly the same, sort by date as a tie-breaker
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        return dateB - dateA; 
      });

      // Group pages by role name using our newly sorted array
      const grouped: Record<string, PageRecord[]> = {};
      sortedPagesData.forEach((page: unknown) => {
        // Fallback to page.role if the API returns that instead of page.role_id
        const roleValue = page.role_id || page.role; 
        const roleName = rolesLookup[roleValue] || 'Unassigned';
        
        if (!grouped[roleName]) grouped[roleName] = [];
        grouped[roleName].push({
          id: page.id,
          name: page.name,
          updated_at: page.updated_at,
          role_id: roleValue
        });
      });

      setPagesByRole(grouped);
    } catch (err: unknown) {
      console.error('Error loading pages:', err);
      setError(err.message || 'Failed to load pages.');
      toast.error(`Error loading pages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagesAndRoles();
  }, [user]);

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    
    // 4. THE DELETE CALL: Changed from Supabase to pageService with a try/catch
    try {
      await pageService.deletePage(pageId);
      toast.success('Page deleted.');
      fetchPagesAndRoles(); // Refresh the page list
    } catch (err: unknown) {
      console.error('Error deleting page:', err);
      toast.error('Failed to delete page.');
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