import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { componentMap } from '@/pages/PageBuilder';
import { fetchPageConfig } from '@/lib/spoof';

// Module-level cache to prevent duplicate page fetches across component remounts
const pageCache = new Map<string, { data: unknown; timestamp: number }>();
const PAGE_CACHE_TTL = 5000; // 5 seconds

interface CustomAppOutletContext {
  tenantId: string | null;
  userRoleId: string | null;
}

const CustomAppPage: React.FC = () => {
  const { tenantSlug, pageId } = useParams<{ tenantSlug: string; pageId: string }>();
  const { tenantId: contextTenantId } = useOutletContext<CustomAppOutletContext>();
  const tenantId = contextTenantId ?? (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null);
  
  const [page, setPage] = useState<{ name: string; config: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<string | null>(null); // Track which pageId is currently being fetched

  useEffect(() => {
    if (!tenantId || !pageId) return;
    
    // Track if component is still mounted
    let isMounted = true;
    
    // Check cache first
    const cacheKey = `${tenantId}-${pageId}`;
    const cached = pageCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < PAGE_CACHE_TTL) {
      console.log('Using cached page data for:', pageId);
      if (isMounted) {
        setPage(cached.data);
        setLoading(false);
      }
      return;
    }
    
    // Prevent duplicate fetches for the same pageId
    if (fetchingRef.current === pageId) {
      return;
    }
    
    fetchingRef.current = pageId;
    if (isMounted) {
      setLoading(true);
      setError(null);
    }

    const spoofToken = typeof window !== 'undefined' ? window.localStorage.getItem('pyro_spoof_jwt') : null;

    const fetchPage = async () => {
      try {
        if (spoofToken && tenantId) {
          const pageData = await fetchPageConfig(pageId, tenantId, spoofToken);
          if (!isMounted) return;
          fetchingRef.current = null;
          if (pageData) {
            setPage(pageData);
            pageCache.set(cacheKey, { data: pageData, timestamp: now });
          } else {
            setError('Page not found');
            toast.error('Failed to load page');
          }
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('pages')
          .select('name, config')
          .eq('id', pageId)
          .eq('tenant_id', tenantId)
          .single();

        if (!isMounted) return;
        fetchingRef.current = null;

        if (error) {
          setError(error.message);
          toast.error('Failed to load page');
        } else if (data) {
          const pageData = { name: data.name, config: data.config };
          setPage(pageData);
          pageCache.set(cacheKey, { data: pageData, timestamp: now });
        }
        setLoading(false);
      } catch (err: unknown) {
        fetchingRef.current = null;
        if (!isMounted) return;
        if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPage();
    
    // Cleanup function
    return () => {
      isMounted = false;
      // Abort the Supabase query if possible
      if (fetchingRef.current === pageId) {
        fetchingRef.current = null;
      }
    };
  }, [pageId, tenantId]);

  if (loading) return <div className="p-4">Loading page...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!page) return <div className="p-4">Page not found.</div>;

  // Extract header title from page-level header_title or from header component in config
  const getHeaderTitle = () => {
    // First check page-level header_title
    if (page.header_title) {
      return page.header_title;
    }
    
    // Then check if there's a header component in the config
    if (Array.isArray(page.config)) {
      const headerComponent = page.config.find((comp: unknown) => comp.type === 'header');
      if (headerComponent?.config?.title) {
        return headerComponent.config.title;
      }
    }
    
    // Fallback to page name if no header title found
    return page.name || null;
  };

  const headerTitle = getHeaderTitle();
  console.log('Rendering page with header_title:', headerTitle);

  return (
    <div className="w-full">
      {/* Fixed Header */}
      {headerTitle && (
        <div className="sticky top-0 z-50 w-full bg-white border-b border-gray-300 shadow-sm">
          <div className="px-6 py-4">
            <h2 className="text-3xl font-bold text-gray-900">
              {headerTitle}
            </h2>
          </div>
        </div>
      )}
      
      {/* Page Content */}
      <div className="w-full">
        <div>
          {Array.isArray(page.config)
            ? (page.config as unknown[]).map((component) => {
                const Renderer = componentMap[component.type];
                if (!Renderer) return null;
                // Skip header components if they exist in the config (we show it as fixed header above)
                if (component.type === 'header') return null;
                return (
                  <Renderer
                    key={component.id}
                    {...component.props}
                    config={component.config}
                  />
                );
              })
            : null}
        </div>
      </div>
    </div>
  );
};

export default CustomAppPage; 