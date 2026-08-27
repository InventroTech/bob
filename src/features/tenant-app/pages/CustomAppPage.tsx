import React, { useState, useEffect, useRef, useCallback, type ComponentType } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { componentMap as staticComponentMap } from '@/features/page-builder/componentMap';
import {
  fetchPageConfig,
  fetchPagesForRole,
  getEffectiveToken,
} from '@/lib/auth/spoof';
import { useAuth } from '@/hooks/useAuth';

// Module-level cache to prevent duplicate page fetches across component remounts
const pageCache = new Map<string, { data: any; timestamp: number }>();
const PAGE_CACHE_TTL = 5000; // 5 seconds

type ComponentMap = Record<string, ComponentType<any>>;

interface CustomAppOutletContext {
  tenantId: string | null;
  userRoleId: string | null;
  pages?: { id: string; name: string; display_order?: number; icon_name?: string }[];
  isUnmanndApp?: boolean;
}

const CustomAppPage: React.FC = () => {
  const { tenantSlug, pageId } = useParams<{ tenantSlug: string; pageId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const {
    tenantId: contextTenantId,
    userRoleId,
    pages: sidebarPages = [],
    isUnmanndApp = false,
  } = useOutletContext<CustomAppOutletContext>();
  const tenantId = contextTenantId ?? (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null);
  
  const [page, setPage] = useState<{ name: string; config: any; header_title?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const componentMap = staticComponentMap as ComponentMap;
  const fetchingRef = useRef<string | null>(null);
  const redirectingRef = useRef(false);
  const sidebarPagesRef = useRef(sidebarPages);
  sidebarPagesRef.current = sidebarPages;

  const redirectToFirstSidebarPage = useCallback(async () => {
    if (redirectingRef.current || !tenantSlug) return;
    redirectingRef.current = true;

    const fromSidebar = sidebarPagesRef.current.find((p) => p.id && p.id !== pageId);
    if (fromSidebar?.id) {
      navigate(`/app/${tenantSlug}/pages/${fromSidebar.id}`, { replace: true });
      return;
    }

    try {
      if (!tenantId || !userRoleId) {
        navigate(`/app/${tenantSlug}`, { replace: true });
        return;
      }
      const token = await getEffectiveToken(session?.access_token ?? null);
      let firstId: string | null = null;
      if (token) {
        const navPages = await fetchPagesForRole(tenantId, userRoleId, token);
        firstId = navPages.find((p) => p.id && p.id !== pageId)?.id ?? null;
      }
      if (!firstId) {
        const { data } = await supabase
          .from('pages')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('role', userRoleId)
          .eq('is_deleted', false)
          .order('display_order', { ascending: true })
          .limit(1);
        firstId = data?.[0]?.id ?? null;
      }
      if (firstId) {
        navigate(`/app/${tenantSlug}/pages/${firstId}`, { replace: true });
      } else {
        navigate(`/app/${tenantSlug}`, { replace: true });
      }
    } catch {
      navigate(`/app/${tenantSlug}`, { replace: true });
    }
  }, [tenantSlug, pageId, tenantId, userRoleId, session?.access_token, navigate]);

  useEffect(() => {
    if (!tenantId || !pageId) return;

    let isMounted = true;
    redirectingRef.current = false;

    const cacheKey = `${tenantId}-${pageId}`;
    const cached = pageCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < PAGE_CACHE_TTL) {
      if (isMounted) {
        setPage(cached.data);
        setLoading(false);
        setError(null);
      }
      return;
    }

    if (fetchingRef.current === pageId) {
      return;
    }

    fetchingRef.current = pageId;
    if (isMounted) {
      setLoading(true);
      setError(null);
      setPage(null);
    }

    const spoofToken =
      typeof window !== 'undefined' ? window.localStorage.getItem('pyro_spoof_jwt') : null;

    const fetchPage = async () => {
      try {
        if (spoofToken && tenantId) {
          const pageData = await fetchPageConfig(pageId, tenantId, spoofToken);
          if (!isMounted) return;
          fetchingRef.current = null;
          if (pageData) {
            setPage(pageData);
            pageCache.set(cacheKey, { data: pageData, timestamp: now });
            setLoading(false);
          } else {
            pageCache.delete(cacheKey);
            await redirectToFirstSidebarPage();
          }
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('pages')
          .select('name, config, header_title')
          .eq('id', pageId)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .maybeSingle();

        if (!isMounted) return;
        fetchingRef.current = null;

        if (fetchError) {
          setError(fetchError.message);
          toast.error('Failed to load page');
          setLoading(false);
        } else if (data) {
          const pageData = {
            name: data.name,
            config: data.config,
            header_title: data.header_title,
          };
          setPage(pageData);
          pageCache.set(cacheKey, { data: pageData, timestamp: now });
          setLoading(false);
        } else {
          pageCache.delete(cacheKey);
          await redirectToFirstSidebarPage();
        }
      } catch (err: any) {
        fetchingRef.current = null;
        if (!isMounted) return;
        if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
        setError(err.message);
        setLoading(false);
      }
    };

    void fetchPage();

    return () => {
      isMounted = false;
      if (fetchingRef.current === pageId) {
        fetchingRef.current = null;
      }
    };
  }, [pageId, tenantId, redirectToFirstSidebarPage]);

  if (loading) return <div className="p-4">Loading page...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!page) return <div className="p-4">Loading page...</div>;

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
  const requestTableTypes = new Set([
    'procurementTable',
    'myRequestTable',
    'inventoryTable',
    'leadTable',
    'vendorIdentifiedTable',
    'pendingApprovalTable',
    'rejectedTable',
  ]);
  const pageHasRequestTable =
    Array.isArray(page.config) &&
    page.config.some((comp: { type?: string }) => requestTableTypes.has(String(comp.type || '')));
  // Request tables render their own "ALL REQUEST" + search/filters row — hide the sticky duplicate.
  const hidePageHeader =
    pageHasRequestTable ||
    (Array.isArray(page.config) &&
      page.config.some(
        (comp: { type?: string; config?: { hidePageHeader?: boolean } }) =>
          (comp.type === 'dispatchCardList' || comp.type === 'dispatchDashboard') &&
          comp.config?.hidePageHeader !== false
      ));

  return (
    <div className={`w-full max-w-full min-w-0 ${isUnmanndApp ? 'h-full min-h-0 flex flex-col' : ''}`}>
      {/* Fixed Header — compact so request tables start closer to the title */}
      {headerTitle && !hidePageHeader && (
        <div className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white max-md:hidden shrink-0">
          <div className={isUnmanndApp ? 'px-4 py-3' : 'px-4 py-1.5'}>
            <h2
              className={
                isUnmanndApp
                  ? '!m-0 !text-[20px] !font-bold !leading-[1.15] !tracking-tight !uppercase text-[#0B1F4D]'
                  : '!m-0 !text-lg !font-semibold !leading-snug text-gray-900'
              }
              style={
                isUnmanndApp
                  ? { fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif" }
                  : undefined
              }
            >
              {headerTitle}
            </h2>
          </div>
        </div>
      )}
      
      {/* Page Content */}
      <div
        className={`w-full max-w-full min-w-0 ${
          isUnmanndApp ? 'flex flex-1 min-h-0 flex-col' : ''
        }`}
      >
        <div
          className={`max-w-full min-w-0 ${
            isUnmanndApp
              ? `px-2 pt-1 pb-2 flex flex-1 min-h-0 flex-col ${pageHasRequestTable ? 'h-full' : ''}`
              : 'pt-1'
          }`}
        >
          {Array.isArray(page.config)
            ? (page.config as any[]).map((component) => {
                const Renderer = componentMap[component.type];
                if (!Renderer) return null;
                // Skip header components if they exist in the config (we show it as fixed header above)
                if (component.type === 'header') return null;
                const fillHeight =
                  isUnmanndApp && requestTableTypes.has(String(component.type || ''));
                return (
                  <div
                    key={component.id}
                    className={fillHeight ? 'flex min-h-0 flex-1 flex-col' : undefined}
                  >
                    <Renderer {...component.props} config={component.config} />
                  </div>
                );
              })
            : null}
        </div>
      </div>
    </div>
  );
};

export default CustomAppPage; 