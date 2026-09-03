'use client';

import React, { createContext, useContext, useMemo } from 'react';

/** Page name + Header Title for any Custom App page (CRM + Unmannd). */
type InventoryTablePageContextValue = {
  pageName: string;
  headerTitle: string;
};

const InventoryTablePageContext = createContext<InventoryTablePageContextValue>({
  pageName: '',
  headerTitle: '',
});

export function InventoryTablePageProvider({
  pageName,
  headerTitle,
  children,
}: {
  pageName: string;
  headerTitle?: string | null;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      pageName: String(pageName || '').trim(),
      headerTitle: String(headerTitle || '').trim(),
    }),
    [pageName, headerTitle],
  );

  return (
    <InventoryTablePageContext.Provider value={value}>
      {children}
    </InventoryTablePageContext.Provider>
  );
}

/** Sidebar page name for the active /app/.../pages/:pageId route. */
export function useInventoryTablePageName(): string {
  return useContext(InventoryTablePageContext).pageName;
}

/**
 * Visible page heading: Page Builder Header Title, then sidebar Page Name.
 * Used by CRM lead/ticket tables, inventory tables, Settings, and request forms.
 */
export function usePageDisplayTitle(): string {
  const { headerTitle, pageName } = useContext(InventoryTablePageContext);
  return headerTitle || pageName;
}
