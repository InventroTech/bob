'use client';

import React from 'react';
import { LeadTableComponent } from './LeadTableComponent';

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
 * Examples:
 * - My inventory requests: apiEndpoint=/crm-records/records/?entity_type=inventory_request&requester_id={{current_user}}
 * - PM queue: apiEndpoint=/crm-records/records/?entity_type=inventory_request&status=PENDING_PM,IN_SHIPPING
 * - Inventory catalog: apiEndpoint=/crm-records/records/?entity_type=inventory_item
 */
export const InventoryTableComponent: React.FC<RecordsTableProps> = ({ config }) => {
  const mergedConfig = {
    title: config?.title || 'Records Table',
    ...(config || {}),
  };

  return <LeadTableComponent config={mergedConfig} />;
};

