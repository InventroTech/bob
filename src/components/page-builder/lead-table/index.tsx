'use client';

import React from 'react';
import type { LeadTableProps } from './types';
import { useLeadTable } from './useLeadTable';
import { LeadTableView } from './LeadTableView';

/**
 * Configurable records / leads table for PageBuilder and inventory surfaces.
 */
export const LeadTableComponent: React.FC<LeadTableProps> = (props) => {
  const table = useLeadTable(props);
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <LeadTableView {...table} />
    </div>
  );
};

export default LeadTableComponent;
export type { LeadTableProps } from './types';
