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
  
  const [page, setPage] = useState<{ name: string; config: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<string | null>(null); // Track which pageId is currently being fetched

  useEffect(() => {
    const tenantId = localStorage.getItem('tenant_id');
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
    
    const fetchPromise = supabase
      .from('pages')
      .select('name, config')
      .eq('id', pageId)
      .eq('tenant_id', tenantId)
      .single();
    
    fetchPromise.then(({ data, error }) => {
      fetchingRef.current = null;
      
      // Only update state if component is still mounted
      if (!isMounted) return;
      
      if (error) {
        setError(error.message);
        toast.error('Failed to load page');
      } else if (data) {
        const pageData = { name: data.name, config: data.config };
        setPage(pageData);
        // Cache the result
        pageCache.set(cacheKey, { data: pageData, timestamp: now });
      }
      setLoading(false);
    }).catch((err) => {
      fetchingRef.current = null;
      
      // Only update state if component is still mounted and it's not an abort error
      if (!isMounted) return;
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      
      setError(err.message);
      setLoading(false);
    });
    
    // Cleanup function
    return () => {
      isMounted = false;
      // Abort the Supabase query if possible
      if (fetchingRef.current === pageId) {
        fetchingRef.current = null;
      }
    };
  }, [pageId]);

  if (loading) return <div className="p-4">Loading page...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!page) return <div className="p-4">Page not found.</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {Array.isArray(page.config)
          ? (page.config as any[]).map((component) => {
              const Renderer = componentMap[component.type];
              if (!Renderer) return null;
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
  );
};

export default CustomAppPage; 