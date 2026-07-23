'use client';

import React, { useMemo } from 'react';
import { LeadTableComponent } from './LeadTableComponent';
import { resolvePriorityFromRow } from '@/lib/inventoryPriority';

export type ProcurementTableColumn = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'chip' | 'link' | 'action';
  transform?: (value: any, row: any) => any;
};

export type ProcurementTableConfig = {
  title?: string;
  entityType?: string;
  apiEndpoint?: string;
  columns?: ProcurementTableColumn[];
  emptyMessage?: string;
  showFallbackOnly?: boolean;
  detailMode?:
    | 'inventory_request'
    | 'lead_card'
    | 'inventory_cart'
    | 'record_form_modal'
    | 'inventory_payment_modal'
    | 'receive_shipments'
    | 'lead_assignment_modal'
    | 'none'
    | 'auto';
  [key: string]: unknown;
};

interface ProcurementTableProps {
  config?: ProcurementTableConfig;
}

/**
 * Starter columns only used when you first drop the component in Page Builder.
 * After that, columns come from saved Page Builder config (add/edit/remove there).
 */
export const DEFAULT_PROCUREMENT_TABLE_COLUMNS: ProcurementTableColumn[] = [
  { key: 'item_name_freeform', label: 'Item Name', type: 'text' },
  { key: 'requester_name', label: 'Requested By', type: 'text' },
  { key: 'estimated_cost', label: 'Estimated Cost', type: 'text' },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'request_date', label: 'Request Date', type: 'date' },
  { key: 'required_date', label: 'Requirement Date', type: 'date' },
  { key: 'urgency_level', label: 'Priority', type: 'chip' },
  { key: 'status', label: 'Status', type: 'chip' },
];

function withPriorityTransform(columns: ProcurementTableColumn[]): ProcurementTableColumn[] {
  return columns.map((col) => {
    if (col.key !== 'urgency_level') return col;
    return {
      ...col,
      type: col.type || 'chip',
      // Always derive from Request Date vs Requirement Date when both exist.
      transform: (value, row) => resolvePriorityFromRow(row, value),
    };
  });
}

/**
 * Prefer entity_type from the API endpoint query string when present,
 * so Page Builder endpoints like ?entity_type=unmannd_request are not overridden.
 */
function entityTypeFromEndpoint(apiEndpoint?: string): string | undefined {
  if (!apiEndpoint) return undefined;
  const normalized = apiEndpoint.replace(/\?&+/g, '?');
  try {
    const url = new URL(normalized, 'http://local');
    const fromQuery = url.searchParams.get('entity_type')?.trim();
    return fromQuery || undefined;
  } catch {
    const match = /[?&]entity_type=([^&]*)/.exec(normalized);
    return match?.[1] ? decodeURIComponent(match[1]).trim() : undefined;
  }
}

/**
 * Procurement table for Page Builder.
 * Columns + API endpoint are fully dynamic from Page Builder config.
 * Default detailMode opens inventory request modal (not lead Task Progress).
 */
export const ProcurementTableComponent: React.FC<ProcurementTableProps> = ({ config }) => {
  const mergedConfig = useMemo(() => {
    const columns = withPriorityTransform(config?.columns || []);
    const fromEndpoint = entityTypeFromEndpoint(config?.apiEndpoint);
    const entityType = config?.entityType || fromEndpoint;
    const isInventoryLike =
      !entityType ||
      entityType === 'inventory_request' ||
      entityType === 'unmannd_request';

    return {
      ...(config || {}),
      columns,
      ...(entityType ? { entityType } : {}),
      // Avoid lead_card (Task Progress) for request-style entities unless explicitly set.
      detailMode:
        config?.detailMode ||
        (isInventoryLike ? 'inventory_request' : undefined),
    };
  }, [config]);

  return <LeadTableComponent config={mergedConfig} />;
};
