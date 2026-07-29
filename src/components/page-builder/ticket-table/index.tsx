'use client';

import React from 'react';
import type { TicketTableProps } from './types';
import { useTicketTable } from './useTicketTable';
import { TicketTableView } from './TicketTableView';

/**
 * Support ticket table for PageBuilder.
 * Search, filters, pagination, and ticket detail carousel.
 */
export const TicketTableComponent: React.FC<TicketTableProps> = (props) => {
  const model = useTicketTable(props);
  return <TicketTableView {...model} />;
};

export default TicketTableComponent;
export type { TicketTableProps, Column, PrajaTableProps } from './types';
