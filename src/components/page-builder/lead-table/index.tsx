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
  return <LeadTableView {...table} />;
};

export default LeadTableComponent;
export type { LeadTableProps } from './types';
