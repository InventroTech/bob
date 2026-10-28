import React, { useEffect, useState } from 'react';
import { NavLink, matchPath, useLocation } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SidebarPage, SidebarSection } from '@/lib/sidebar/sidebarGroups';

interface SidebarGroupFlyoutProps<P extends SidebarPage> {
  name: string;
  sections: SidebarSection<P>[];
  tenantSlug: string | undefined;
  collapsed: boolean;
  /** Expand under the heading; otherwise (icon-only sidebar) open a side panel. */
  inline?: boolean;
  activeClass: string;
  triggerPadClass: string;
  renderIcon: (iconName: string, isActive: boolean) => React.ReactNode;
  onNavigate?: () => void;
  /** Pages that must not be opened right now (e.g. an active lead call); clicks call onBlockedNavigate instead. */
  isPageBlocked?: (pageId: string) => boolean;
  onBlockedNavigate?: () => void;
}

export function SidebarGroupFlyout<P extends SidebarPage>({
  name,
  sections,
  tenantSlug,
  collapsed,
  inline = false,
  activeClass,
  triggerPadClass,
  renderIcon,
  onNavigate,
  isPageBlocked,
  onBlockedNavigate,
}: SidebarGroupFlyoutProps<P>) {
  const pagePath = (id: string) => `/app/${tenantSlug}/pages/${id}`;
  const { pathname } = useLocation();
  const holdsCurrentPage = sections.some((section) =>
    section.pages.some((page) => matchPath({ path: pagePath(page.id), end: false }, pathname))
  );

  // Inline groups open on their own page (refresh, direct link); the collapsed popover never auto-opens.
  const [open, setOpen] = useState(inline && holdsCurrentPage);
  useEffect(() => {
    if (!inline) setOpen(false);
    else if (holdsCurrentPage) setOpen(true);
  }, [inline, holdsCurrentPage]);

  const highlighted = open || holdsCurrentPage;
  const firstIcon = sections[0]?.pages[0]?.icon_name ?? '';

  const handleNavigate = () => {
    if (!inline) setOpen(false);
    onNavigate?.();
  };

  const trigger = (
    <button
      type="button"
      title={collapsed ? name : undefined}
      aria-label={collapsed ? name : undefined}
      aria-expanded={open}
      onClick={inline ? () => setOpen((v) => !v) : undefined}
      className={`flex w-full items-center rounded-lg text-[15px] font-extrabold uppercase tracking-wide transition ${triggerPadClass} ${
        highlighted ? activeClass : 'bg-white text-[#1A44A1] hover:bg-gray-50'
      }`}
    >
      {collapsed ? (
        <span className="flex h-8 w-8 items-center justify-center">{renderIcon(firstIcon, highlighted)}</span>
      ) : (
        <span className="flex-1 truncate text-left">{name}</span>
      )}
    </button>
  );

  const sectionList = (
    <div className="space-y-1">
      {sections.map((section, idx) => (
        <div key={section.name || `section-${idx}`} className={idx > 0 ? 'border-t pt-1' : ''}>
          {section.name && (
            <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {section.name}
            </p>
          )}
          {section.pages.map((page) => {
            const blocked = Boolean(isPageBlocked?.(page.id));
            return (
              <NavLink
                key={page.id}
                to={pagePath(page.id)}
                onClick={(e) => {
                  if (blocked) {
                    e.preventDefault();
                    onBlockedNavigate?.();
                    return;
                  }
                  handleNavigate();
                }}
                aria-disabled={blocked}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                    blocked ? 'opacity-40 cursor-not-allowed' : ''
                  } ${isActive ? activeClass : 'text-gray-700 hover:bg-gray-50'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {renderIcon(page.icon_name, isActive)}
                    </span>
                    <span className="truncate">{page.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (inline) {
    return (
      <div>
        {trigger}
        {open && <div className="mt-1 pl-2">{sectionList}</div>}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={12} className="w-60 p-2">
        {sectionList}
      </PopoverContent>
    </Popover>
  );
}
