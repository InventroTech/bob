'use client';

import React, { createContext, useContext } from 'react';

const InventoryTablePageContext = createContext<string>('');

export function InventoryTablePageProvider({
  pageName,
  children,
}: {
  pageName: string;
  children: React.ReactNode;
}) {
  return (
    <InventoryTablePageContext.Provider value={pageName}>
      {children}
    </InventoryTablePageContext.Provider>
  );
}

/** Sidebar page name for the active /app/.../pages/:pageId route. */
export function useInventoryTablePageName(): string {
  return String(useContext(InventoryTablePageContext) || '').trim();
}
