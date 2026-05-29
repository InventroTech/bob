'use client';

import React from 'react';
import { DispatchRecordsPanel } from './dispatch/DispatchRecordsPanel';
import type { FilterConfig } from '@/component-config/DynamicFilterConfig';

export type DispatchCardListConfig = {
  title?: string;
  subtitle?: string;
  entityType?: string;
  apiEndpoint?: string;
  searchFields?: string;
  pageSize?: number;
  yearLabel?: string;
  periodLabel?: string;
  hidePageHeader?: boolean;
  listTitleField?: string;
  listPoField?: string;
  listSalesOrderField?: string;
  listDcNumberField?: string;
  listIndexField?: string;
  listDcDateField?: string;
  filters?: FilterConfig[];
  showFilters?: boolean;
};

interface DispatchCardListProps {
  config?: DispatchCardListConfig;
}

export const DispatchCardListComponent: React.FC<DispatchCardListProps> = ({ config }) => {
  return <DispatchRecordsPanel config={config} />;
};
