'use client';

import React, { useMemo } from 'react';
import { LeadTableComponent } from './LeadTableComponent';
import { resolvePriorityFromRow } from '@/lib/inventoryPriority';
import { mergeInventoryTrackingColumns } from '@/lib/shipmentTracking';

export type MyRequestTableColumn = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'chip' | 'link' | 'action';
  transform?: (value: any, row: any) => any;
};

export type MyRequestTableConfig = {
  title?: string;
  entityType?: string;
  apiEndpoint?: string;
  columns?: MyRequestTableColumn[];
  emptyMessage?: string;
  showFallbackOnly?: boolean;
  detailMode?:
    | 'inventory_request'
    | 'lead_card'
    | 'record_form_modal'
    | 'inventory_payment_modal'
    | 'receive_shipments'
    | 'lead_assignment_modal'
    | 'none'
    | 'auto';
  [key: string]: unknown;
};

interface MyRequestTableProps {
  config?: MyRequestTableConfig;
}

/**
 * If Page Builder includes an urgency_level column, derive priority from dates.
 * No columns are predefined — all come from config.
 */
function withPriorityTransform(columns: MyRequestTableColumn[]): MyRequestTableColumn[] {
  return columns.map((col) => {
    if (col.key !== 'urgency_level') return col;
    return {
      ...col,
      type: col.type || 'chip',
      transform: (value, row) => resolvePriorityFromRow(row, value),
    };
  });
}

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
 * My Request table for Page Builder.
 * Columns come from config; for inventory/unmannd requests, shipment tracking
 * columns are merged in the same way as All Requests / Procurement Table.
 */
export const MyRequestTableComponent: React.FC<MyRequestTableProps> = ({ config }) => {
  const mergedConfig = useMemo(() => {
    const fromEndpoint = entityTypeFromEndpoint(config?.apiEndpoint);
    const entityType = config?.entityType || fromEndpoint;
    const isInventoryLike =
      entityType === 'inventory_request' || entityType === 'unmannd_request';
    const columns = withPriorityTransform(
      (isInventoryLike
        ? mergeInventoryTrackingColumns(config?.columns || [])
        : config?.columns || []) as MyRequestTableColumn[]
    );

    return {
      ...(config || {}),
      columns,
      ...(entityType ? { entityType } : {}),
      detailMode:
        config?.detailMode ||
        (isInventoryLike ? 'inventory_request' : undefined),
    };
  }, [config]);

  return <LeadTableComponent config={mergedConfig} />;
};
