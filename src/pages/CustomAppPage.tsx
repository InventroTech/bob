import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { componentMap } from '@/pages/PageBuilder';

// Module-level cache to prevent duplicate page fetches across component remounts
const pageCache = new Map<string, { data: any; timestamp: number }>();
const PAGE_CACHE_TTL = 5000; // 5 seconds

const CustomAppPage: React.FC = () => {
  const { tenantSlug, pageId } = useParams<{ tenantSlug: string; pageId: string }>();
  
  const [page, setPage] = useState<{ name: string; config: any; header_title?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<string | null>(null); // Track which pageId is currently being fetched

  useEffect(() => {
    const tenantId = localStorage.getItem('tenant_id');
    if (!tenantId || !pageId) return;
    
    // Check cache first
    const cacheKey = `${tenantId}-${pageId}`;
    const cached = pageCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < PAGE_CACHE_TTL) {
      console.log('Using cached page data for:', pageId);
      setPage(cached.data);
      setLoading(false);
      return;
    }
    
    // Prevent duplicate fetches for the same pageId
    if (fetchingRef.current === pageId) {
      return;
    }
    
    fetchingRef.current = pageId;
    setLoading(true);
    
    // Try to fetch with header_title, fallback to without it if column doesn't exist
    supabase
      .from('pages')
      .select('name, config, header_title')
      .eq('id', pageId)
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data, error }) => {
        fetchingRef.current = null;
        
        if (error) {
          // If error is about missing column, try fetching without header_title
          if (error.message?.includes('header_title') || error.message?.includes('column')) {
            supabase
              .from('pages')
              .select('name, config')
              .eq('id', pageId)
              .eq('tenant_id', tenantId)
              .single()
              .then(({ data: fallbackData, error: fallbackError }) => {
                if (fallbackError) {
                  setError(fallbackError.message);
                  toast.error('Failed to load page');
                } else if (fallbackData) {
                  const pageData = { 
                    name: fallbackData.name, 
                    config: fallbackData.config, 
                    header_title: undefined 
                  };
                  setPage(pageData);
                  pageCache.set(cacheKey, { data: pageData, timestamp: now });
                }
                setLoading(false);
              });
          } else {
            setError(error.message);
            toast.error('Failed to load page');
            setLoading(false);
          }
        } else if (data) {
          const headerTitle = (data as any).header_title;
          console.log('Fetched header_title:', headerTitle);
          const pageData = { 
            name: data.name, 
            config: data.config, 
            header_title: headerTitle || undefined
          };
          console.log('Page data with header_title:', pageData);
          setPage(pageData);
          // Cache the result
          pageCache.set(cacheKey, { data: pageData, timestamp: now });
          setLoading(false);
        }
      }, (err) => {
        fetchingRef.current = null;
        setError(err.message);
        setLoading(false);
      });
  }, [pageId]);

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
      const headerComponent = page.config.find((comp: any) => comp.type === 'header');
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
            ? (page.config as any[]).map((component) => {
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