import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { componentMap } from '@/pages/PageBuilder';
import { getCachedOrFetch } from '@/lib/supabaseCache';

const CustomAppPage: React.FC = () => {
  const { tenantSlug, pageId } = useParams<{ tenantSlug: string; pageId: string }>();
  const { tenantId } = useTenant();
  const [page, setPage] = useState<{ name: string; config: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use tenantId from useTenant hook, fallback to localStorage
    const effectiveTenantId = tenantId || localStorage.getItem('tenant_id');
    if (!effectiveTenantId || !pageId) {
      setLoading(false);
      return;
    }
    
    const pageCacheKey = `supabase_cache:page:${pageId}:${effectiveTenantId}`;
    
    // Use getCachedOrFetch which handles caching and deduplication
    getCachedOrFetch(
      pageCacheKey,
      async () => {
        const { data, error: fetchError } = await supabase
          .from('pages')
          .select('name, config')
          .eq('id', pageId)
          .eq('tenant_id', effectiveTenantId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          throw new Error('Page not found');
        }

        return { name: data.name, config: data.config };
      }
    )
      .then((pageData) => {
        setPage(pageData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        toast.error('Failed to load page');
        setLoading(false);
      });
  }, [pageId, tenantId]); // Include tenantId in dependencies

  if (loading) return <div className="p-4">Loading page...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!page) return <div className="p-4">Page not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        {Array.isArray(page.config)
          ? (page.config as any[]).map((component) => {
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

export default CustomAppPage;
