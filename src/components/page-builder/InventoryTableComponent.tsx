'use client';

import React, { useMemo } from 'react';
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
 * For inventory_request tables:
 * - shipment tracking columns are merged when missing
 * - row click opens the form modal so built-in Approve / Reject / Order show
 *   (same as Procurement Table / Manager All Requests)
 */
export const InventoryTableComponent: React.FC<RecordsTableProps> = ({ config }) => {
  const entityType = String(config?.entityType || '').trim();
  const isInventoryRequest = entityType === 'inventory_request';
  const columns = isInventoryRequest
    ? mergeInventoryTrackingColumns(config?.columns)
    : config?.columns;

  const detailMode = config?.detailMode;
  const keepSpecial =
    detailMode === 'inventory_payment_modal' ||
    detailMode === 'receive_shipments' ||
    detailMode === 'lead_assignment_modal' ||
    detailMode === 'none';

  const mergedConfig = {
    title: config?.title || '',
    ...(config || {}),
    ...(columns ? { columns } : {}),
    ...(isInventoryRequest && !keepSpecial ? { detailMode: 'record_form_modal' } : {}),
  };

  return <LeadTableComponent config={mergedConfig} />;
};
