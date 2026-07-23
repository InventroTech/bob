'use client';

import React from 'react';
import { LeadTableComponent } from './LeadTableComponent';
import { mergeInventoryTrackingColumns } from '@/lib/shipmentTracking';

interface RecordsTableProps {
  /**
   * Fully generic config forwarded to LeadTableComponent.
   * Set apiEndpoint, columns, filters, entityType, etc. from PageBuilder.
   */
  config?: any;
}

/**
 * Generic records table component for PageBuilder.
 * Backed by LeadTableComponent but not tied to any specific entity.
 *
 * For inventory_request tables, shipment tracking columns (Shipment / Track / ETA / Courier)
 * are merged in when missing so All Requests pages show live tracking without reconfig.
 */
export const InventoryTableComponent: React.FC<RecordsTableProps> = ({ config }) => {
  const entityType = String(config?.entityType || '').trim();
  const isInventoryRequest = entityType === 'inventory_request';
  const columns = isInventoryRequest
    ? mergeInventoryTrackingColumns(config?.columns)
    : config?.columns;

  const mergedConfig = {
    title: config?.title || '',
    ...(config || {}),
    ...(columns ? { columns } : {}),
  };

  return <LeadTableComponent config={mergedConfig} />;
};
