import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Bell, Sparkles, Users, LogOut, Menu, Ticket, Settings, Layers, ChevronLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { getTenantIdFromJWT, getRoleIdFromJWT } from '@/lib/auth/jwt';
import {
  SPOOF_CHANGED_EVENT,
  SPOOF_JWT_KEY,
  SPOOF_LABEL_KEY,
  clearSpoofLocalStorage,
  dispatchSpoofChanged,
  fetchPagesForRole,
  getEffectiveToken,
  getSpoofUserLabel,
  isSpoofing,
} from '@/lib/auth/spoof';
import { icons } from 'lucide-react';
import { CustomIcons } from '@/components/page-builder/NewCustomIcons';
import { FollowUpIcon, WIPTicketIcon, RoutingSettingsIcon, LeadScoreIcon, AnalyticsIcon } from '@/components/icons/CustomIcons';
import { SparkySidebarButton } from '@/components/chatbot/ChatWidget';

type CustomIconRow = { name: string; svg_content: string };

const navigationIconMap: Record<string, JSX.Element> = {
    "lead groups": <Users className="h-4 w-4" />,
    "lead assignment": <Users className="h-4 w-4" />,
    "user hierarchy": <Users className="h-4 w-4" />,
    "analytics": <AnalyticsIcon />,
    "pending tickets": <Ticket className="h-4 w-4" />,
    "wip tickets": <WIPTicketIcon className="h-4 w-4" />,
    "all support tickets": <Layers className="h-4 w-4" />,
    "settings": <Settings className="h-4 w-4" />,
    "notifications": <Bell className="h-4 w-4" />,
    "pending leads": <Sparkles className="h-4 w-4" />,
    "all leads": <Users className="h-4 w-4" />,
    "follow up leads": <FollowUpIcon />,
    "routing settings": <RoutingSettingsIcon />,
    "lead score": <LeadScoreIcon />,
  };

const DynamicSidebarIcon = ({
  iconName,
  customIcons = [],
}: {
  iconName: string;
  customIcons?: CustomIconRow[];
}) => {
  const uploadedIcon = customIcons.find(icon => icon.name.toLowerCase() === iconName.toLowerCase());
  
  if (uploadedIcon) {
    return (
      <div 
        className="h-4 w-4 flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4 [&>svg]:fill-current [&>svg_path]:fill-current [&>svg_circle]:fill-current" 
        dangerouslySetInnerHTML={{ __html: uploadedIcon.svg_content }} 
      />
    );
  }

  const FigmaIcon = CustomIcons[iconName];
  if (FigmaIcon) return <FigmaIcon className="h-4 w-4" />;

  const CustomMapIcon = navigationIconMap[iconName.toLowerCase()];
  if (CustomMapIcon) return <div className="h-4 w-4 flex items-center justify-center">{CustomMapIcon}</div>;

  const LucideIcon = (icons as any)[iconName];
  if (LucideIcon) return <LucideIcon className="h-4 w-4" />;

  return <Sparkles className="h-4 w-4" />;
};

function NavIcon({
  isMobile,
  isActive,
  iconName,
  customIcons,
}: {
  isMobile: boolean;
  isActive: boolean;
  iconName: string;
  customIcons: CustomIconRow[];
}) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        isMobile
          ? isActive
            ? 'text-white'
            : 'text-gray-600'
          : isActive
            ? 'text-white'
            : 'text-gray-600'
      }`}
    >
      <DynamicSidebarIcon iconName={iconName} customIcons={customIcons} />
    </div>
  );
}

const CustomAppLayout: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { user, logout, session } = useAuth();
  const [pages, setPages] = useState<{ id: string; name: string; icon_name: string }[]>([]);
  const [customIcons, setCustomIcons] = useState<CustomIconRow[]>([]);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [spoofBannerVisible, setSpoofBannerVisible] = useState(() => isSpoofing());
  const [spoofVersion, setSpoofVersion] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  const sidebarWidths = {
    expanded: 288,
    collapsed: 96,
  };

  useEffect(() => {
    const widthPx = isMobile
      ? 0
      : sidebarCollapsed
        ? sidebarWidths.collapsed
        : sidebarWidths.expanded;
    document.documentElement.style.setProperty('--app-sidebar-width', `${widthPx}px`);
    return () => {
      document.documentElement.style.removeProperty('--app-sidebar-width');
    };
  }, [isMobile, sidebarCollapsed]);

  const profileImage = user?.user_metadata?.picture || user?.user_metadata?.avatar_url || '';
  const spoofLabel = getSpoofUserLabel();
  const profileName = isSpoofing() && spoofLabel
    ? spoofLabel
    : user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'User';

  const dataExtractedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      dataExtractedRef.current = false;
      setTenantId(null);
      setUserRoleId(null);
      return;
    }

    const extractUserDataFromJWT = async () => {
      if (dataExtractedRef.current && tenantId && userRoleId) {
        return;
      }

      const token = await getEffectiveToken(session?.access_token ?? null);
      if (!token) return;

      const extractedTenantId = getTenantIdFromJWT(token);
      const extractedRoleId = getRoleIdFromJWT(token);

      if (extractedTenantId && extractedRoleId) {
        setTenantId(extractedTenantId);
        setUserRoleId(extractedRoleId);
        localStorage.setItem('tenant_id', extractedTenantId);
        dataExtractedRef.current = true;
      } else {
        const cachedTenantId = localStorage.getItem('tenant_id');
        if (cachedTenantId) {
          setTenantId(cachedTenantId);
        }
      }
    };

    extractUserDataFromJWT();
  }, [user, session?.access_token, spoofVersion]);

  useEffect(() => {
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === SPOOF_JWT_KEY || e.key === SPOOF_LABEL_KEY) {
        setSpoofBannerVisible(isSpoofing());
        dataExtractedRef.current = false;
        setSpoofVersion((v) => v + 1);
      }
    };
    const onSpoofChanged = () => {
      setSpoofBannerVisible(isSpoofing());
      dataExtractedRef.current = false;
      setSpoofVersion((v) => v + 1);
    };
    window.addEventListener('storage', onStorageChange);
    window.addEventListener(SPOOF_CHANGED_EVENT, onSpoofChanged);
    return () => {
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener(SPOOF_CHANGED_EVENT, onSpoofChanged);
    };
  }, []);

  useEffect(() => {
    const fetchPagesAndIcons = async () => {
      if (!tenantId || !userRoleId) return;

      try {
        const iconResponse = await apiClient.get('/pages/custom-icons/');
        setCustomIcons(iconResponse.data || []);
      } catch (err) {
        console.error('Failed to fetch custom icons:', err);
      }

      const token = await getEffectiveToken(session?.access_token ?? null);
      const spoofToken =
        typeof window !== 'undefined' ? window.localStorage.getItem(SPOOF_JWT_KEY) : null;
      
      if (spoofToken && token) {
        try {
          const pagesData = await fetchPagesForRole(tenantId, userRoleId, token);
          setPages(pagesData || []);
        } catch (err) {
          toast.error('Failed to load pages');
          setPages([]);
        }
        return;
      }

      const { data: pagesData, error } = await supabase
        .from('pages')
        .select('id, name, display_order, icon_name')
        .eq('tenant_id', tenantId)
        .eq('role', userRoleId)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) {
        toast.error('Failed to load pages');
      } else {
        setPages(pagesData || []);
      }
    };

    fetchPagesAndIcons();
  }, [tenantId, userRoleId, session?.access_token, spoofVersion]);

  const handleStopSpoofing = () => {
    try {
      clearSpoofLocalStorage();
      dispatchSpoofChanged();
      dataExtractedRef.current = false;
      setTenantId(null);
      setUserRoleId(null);
      navigate('/');
    } catch (err) {
      console.error('Failed to stop spoofing:', err);
    }
  };

  const isUnmanndApp = (() => {
    const slug = String(tenantSlug || '').toLowerCase();
    if (/unman+d/.test(slug)) return true;
    const names = pages.map((p) => String(p.name || '').toLowerCase());
    const requestPages = names.filter((n) =>
      /request|procurement|pending approval|vendor identified/.test(n)
    );
    return requestPages.length >= 2;
  })();
  const activeNavClass = isUnmanndApp ? 'bg-[#1A3673] text-white' : 'bg-black text-white';
  const activeNavClassMobile = isUnmanndApp ? 'bg-[#1A3673] text-white shadow-sm' : 'bg-black text-white shadow-sm';
  const brandLogoSrc = isUnmanndApp ? '/pyro-ai-logo.png' : '/fire-logo.png';
  const brandLogoAlt = isUnmanndApp ? 'Pyro.ai' : 'Pyro';
  const navItemPad = isUnmanndApp
    ? { collapsed: 'justify-center px-0 py-1', expanded: 'gap-2 px-2 py-1' }
    : { collapsed: 'justify-center px-0 py-1', expanded: 'gap-2 px-2 py-1' };

  const renderNavLinks = (opts: { collapsed: boolean; onNavigate?: () => void }) => (
    <>
      {pages.map((page) => (
        <NavLink
          key={page.id}
          to={`/app/${tenantSlug}/pages/${page.id}`}
          onClick={opts.onNavigate}
          className={({ isActive }) =>
            `flex items-center rounded-lg text-xs font-medium transition ${
              opts.collapsed ? navItemPad.collapsed : navItemPad.expanded
            } ${
              isMobile
                ? isActive
                  ? activeNavClassMobile
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : isActive
                  ? activeNavClass
                  : 'text-gray-700 hover:bg-gray-50'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <NavIcon
                isMobile={isMobile}
                isActive={isActive}
                iconName={page.icon_name}
                customIcons={customIcons}
              />
              {!opts.collapsed && <span>{page.name}</span>}
            </>
          )}
        </NavLink>
      ))}
    </>
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      navigate(`/app/${tenantSlug}/login`);
    } catch (error) {
      console.error('Logout navigation error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const mainMarginLeft = isMobile
    ? 0
    : sidebarCollapsed
      ? sidebarWidths.collapsed
      : sidebarWidths.expanded;

  return (
    <div
      className="flex h-svh w-full overflow-hidden"
      style={{
        ['--sidebar-width' as string]: `${sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidths.expanded}px`
      }}
    >
      {/* Mobile Header */}
      <header className="md:hidden fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between bg-black px-3 text-white">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src={brandLogoSrc} alt={brandLogoAlt} className="h-6 object-contain" />
        <div className="w-8" />
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-[min(100vw-2rem,280px)] flex-col bg-white p-0 h-full max-h-screen overflow-hidden">
          <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md border"
              aria-label="Close menu"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <img src={brandLogoSrc} alt={brandLogoAlt} className="h-5 object-contain" />
          </div>
          
          {/* 1st Panel: Scrollable container for dynamic pages */}
          <nav
            className={`flex-1 overflow-y-auto min-h-0 p-2 space-y-1`}
          >
            {renderNavLinks({ collapsed: false, onNavigate: () => setMobileNavOpen(false) })}
          </nav>

          {/* 2nd Panel: Ultra-compact fixed footer container */}
          <div className={`border-t px-2 py-1 shrink-0 bg-white space-y-1`}>
            <SparkySidebarButton
              placePanelAway
              onToggle={() => setMobileNavOpen(false)}
            />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
            >
              <Bell className="h-3 w-3" />
              Notifications
            </button>
            <div className="flex items-center justify-between px-1 py-0.5">
              <div className="flex items-center gap-2 truncate">
                <img
                  src={profileImage || '/default-avatar.png'}
                  alt={profileName}
                  className="h-6 w-6 rounded-full object-cover shrink-0"
                />
                <p className="truncate text-xs font-semibold text-gray-900">{profileName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  void handleLogout();
                }}
                disabled={isLoggingOut}
                className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-gray-600 shrink-0 hover:bg-gray-50"
              >
                <LogOut className="h-3 w-3" />
                <span>{isLoggingOut ? '...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div
        className={`hidden md:block fixed left-0 top-0 h-full bg-white transition-all duration-200`}
        style={{ width: sidebarCollapsed ? sidebarWidths.collapsed : sidebarWidths.expanded }}
      >
        <aside className="relative flex h-full flex-col border-r bg-white">
            <div
              className={`flex items-center flex-shrink-0 w-full ${
                sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
              } pt-2.5 pb-1.5`}
            >
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="flex h-7 w-7 items-center justify-center transition hover:bg-gray-100 cursor-pointer rounded-md"
                aria-label="Expand sidebar"
              >
                <img src="/menu_close.svg" alt="Menu" className="h-4 w-4" />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-start flex-1">
                  <img
                    src={brandLogoSrc}
                    alt={brandLogoAlt}
                    className="h-7 w-auto object-contain"
                  />
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="flex h-7 w-7 items-center justify-center transition hover:bg-gray-100 cursor-pointer rounded-md"
                  aria-label="Collapse sidebar"
                >
                  <img src="/menu_open.svg" alt="Close Menu" className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <nav
            className={`flex-1 overflow-y-auto min-h-0 space-y-1 py-1 ${
              sidebarCollapsed ? 'px-1' : 'px-2'
            }`}
          >
            {pages.map((page) => (
              <NavLink
                key={page.id}
                to={`/app/${tenantSlug}/pages/${page.id}`}
                className={({ isActive }) =>
                  `flex items-center rounded-lg ${
                    sidebarCollapsed ? navItemPad.collapsed : navItemPad.expanded
                  } text-xs font-medium transition ${
                    isActive
                      ? activeNavClass
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isActive ? 'bg-transparent text-white' : 'bg-transparent text-gray-600'}`}>
                      <DynamicSidebarIcon iconName={page.icon_name} customIcons={customIcons} />
                    </div>
                    {!sidebarCollapsed && <span>{page.name}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div
            className={`flex-shrink-0 bg-white border-t py-1.5 space-y-1 ${
              sidebarCollapsed ? 'px-1' : 'px-2'
            }`}
          >
            <SparkySidebarButton collapsed={sidebarCollapsed} />
            <button className={`flex w-full items-center rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <Bell className="h-3 w-3" />
              </div>
              {!sidebarCollapsed && <span>Notifications</span>}
            </button>

            <div className="border-t pt-1 space-y-1">
              <div className={`flex items-center rounded-lg px-1.5 py-0.5 ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
              {sidebarCollapsed ? (
                <img
                  src={profileImage || '/default-avatar.png'}
                  alt={profileName}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex items-center gap-2 truncate flex-1">
                  <img
                    src={profileImage || '/default-avatar.png'}
                    alt={profileName}
                    className="h-6 w-6 rounded-full object-cover shrink-0"
                  />
                  <p className="text-xs font-semibold text-gray-900 truncate">{profileName}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-xs font-medium transition ${
                sidebarCollapsed 
                  ? 'justify-center' 
                  : ''
              } ${
                isLoggingOut
                  ? 'opacity-50 cursor-not-allowed border-transparent text-gray-500'
                  : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 shrink-0">
                <LogOut className="h-3 w-3" />
              </div>
              {!sidebarCollapsed && (
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              )}
            </button>
            </div>
          </div>
        </aside>
      </div>

      <main
        className="min-w-0 h-full overflow-x-auto overflow-y-auto bg-white transition-all duration-200"
        style={{
          marginLeft: mainMarginLeft,
          width: `calc(100% - ${mainMarginLeft}px)`,
          maxWidth: `calc(100% - ${mainMarginLeft}px)`,
          paddingTop: isMobile ? 48 : 0,
        }}
      >
        {spoofBannerVisible && spoofLabel && (
          <div className="w-full bg-yellow-300 text-black text-xs px-4 py-1 flex items-center justify-between shrink-0">
            <span className="truncate">
              Spoofing as <span className="font-semibold">{spoofLabel}</span>
            </span>
            <button
              type="button"
              onClick={handleStopSpoofing}
              className="ml-4 rounded border border-black/40 px-2 py-0.5 text-xs font-medium hover:bg-black hover:text-amber-300"
            >
              Stop spoofing
            </button>
          </div>
        )}
        <div
          className="h-full w-full"
          style={
            isUnmanndApp
              ? { fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif" }
              : undefined
          }
        >
          <Outlet context={{ tenantId, userRoleId, pages, isUnmanndApp }} />
        </div>
      </main>
    </div>
  );
};

export default CustomAppLayout;