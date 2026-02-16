import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { membershipService } from '@/lib/api';
import { componentMap } from '@/pages/PageBuilder';

interface PageData {
  name: string;
  config: any[];
  role?: string | null;
}

const PublicTenantPage: React.FC = () => {
  const { tenantSlug, pageId } = useParams<{ tenantSlug: string; pageId: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pageId || !tenantSlug) return;

    const cacheKey = `public-${tenantSlug}-${pageId}`;
    
    // Prevent duplicate fetches
    if (fetchingRef.current === cacheKey) return;
    fetchingRef.current = cacheKey;

    setLoading(true);
    
    const fetchPublicPage = async () => {
      try {
        // First, get the tenant_id from the slug
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();

        if (tenantError || !tenant) {
          setError('Tenant not found');
          toast.error('Tenant not found');
          return;
        }

        // Get the public role via membership API (Django authz at /membership/roles)
        const publicRole = await membershipService.getPublicRole(tenantSlug || undefined);

        // Fetch public page for this tenant (public role or unassigned)
        const query = supabase
          .from('pages')
          .select('name, config, role')
          .eq('id', pageId)
          .eq('tenant_id', tenant.id);

        // Allow pages with no role OR pages with public role (if it exists)
        if (publicRole) {
          query.or(`role.is.null,role.eq.${publicRole.id}`);
        } else {
          query.is('role', null);
        }

        const { data, error: pageError } = await query.single();
        
        if (pageError) {
          setError(pageError.message);
          toast.error('Failed to load public page');
        } else if (data) {
          setPage({ name: data.name, config: data.config, role: data.role });
        } else {
          setError('Page not found or not accessible');
          toast.error('Page not found or not accessible');
        }
      } catch (err: any) {
        setError(err.message);
        toast.error('An error occurred');
      } finally {
        fetchingRef.current = null;
        setLoading(false);
      }
    };

    fetchPublicPage();
  }, [pageId, tenantSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading public page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h5>Page Not Found</h5>
          <p>{error || 'This page does not exist or is not accessible.'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h5>{page.name}</h5>
            <p>
              {page.role === 'public' ? 'Public Page' : 'Open Access Page'} • {tenantSlug}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Open Access
            </span>
          </div>
        </div>
      </div>

      {/* Render Components */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {Array.isArray(page.config)
          ? page.config.map((component: any) => {
              const Renderer = componentMap[component.type];
              return Renderer ? (
                <Renderer key={component.id} {...component.props} config={component.config} />
              ) : null;
            })
          : null}
      </div>
    </div>
  );
};

export default PublicTenantPage;

