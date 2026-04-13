'use client';

import React from 'react';
import { LeadTableComponent } from './LeadTableComponent';

interface UniversalRecordsTableProps {
  /**
   * Fully generic config forwarded to LeadTableComponent.
   * Set apiEndpoint, columns, filters, entityType, detailMode, etc. from PageBuilder.
   */
  config?: any;
}

/**
 * Universal CRM records table for Page Builder (any `entity_type`, custom columns, filters).
 * Backed by {@link LeadTableComponent}.
 *
 * Page Builder registry key remains `inventoryTable` for backward compatibility with saved pages.
 */
export const UniversalRecordsTable: React.FC<UniversalRecordsTableProps> = ({ config }) => {
  const mergedConfig = {
    title: config?.title || '',
    ...(config || {}),
  };

  return <LeadTableComponent config={mergedConfig} />;
};

/** @deprecated Use {@link UniversalRecordsTable}. Kept for existing imports and Page Builder keys. */
export const InventoryTableComponent = UniversalRecordsTable;
