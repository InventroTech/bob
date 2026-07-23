'use client';

import React, { useMemo } from 'react';
import { LeadTableComponent } from './LeadTableComponent';
import { resolvePriorityFromRow } from '@/lib/inventoryPriority';
import { mergeInventoryTrackingColumns } from '@/lib/shipmentTracking';

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
  recordDetailModalType?: 'default' | 'form_edit';
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

/** Defaults applied when the component is first dropped in Page Builder. */
export const DEFAULT_PROCUREMENT_TABLE_CONFIG = {
  columns: DEFAULT_PROCUREMENT_TABLE_COLUMNS,
  entityType: 'inventory_request',
  tableType: 'itemsTable' as const,
  // Form modal hosts built-in Approve / Reject / Order (Record detail does not).
  detailMode: 'record_form_modal' as const,
};

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
 * Resolve row-click modal so Approve / Order appear on procurement All Requests.
 * Older pages use record_form_modal; this component previously defaulted to
 * inventory_request (RecordDetailModal), which has no workflow action buttons.
 */
function resolveProcurementDetailMode(
  detailMode: ProcurementTableConfig['detailMode'] | undefined,
  isInventoryLike: boolean
): ProcurementTableConfig['detailMode'] | undefined {
  if (!detailMode || detailMode === 'auto') {
    return isInventoryLike ? 'record_form_modal' : undefined;
  }
  // Map legacy default to the form modal that owns Approve / Order.
  if (detailMode === 'inventory_request') {
    return 'record_form_modal';
  }
  return detailMode;
}

/**
 * Procurement table for Page Builder.
 * Columns + API endpoint are fully dynamic from Page Builder config.
 * Opens the form-style modal so built-in Approve / Reject / Order show.
 */
export const ProcurementTableComponent: React.FC<ProcurementTableProps> = ({ config }) => {
  const mergedConfig = useMemo(() => {
    const fromEndpoint = entityTypeFromEndpoint(config?.apiEndpoint);
    const entityType = config?.entityType || fromEndpoint || 'inventory_request';
    const isInventoryLike =
      entityType === 'inventory_request' || entityType === 'unmannd_request';
    const columns = withPriorityTransform(
      (isInventoryLike
        ? mergeInventoryTrackingColumns(config?.columns || DEFAULT_PROCUREMENT_TABLE_COLUMNS)
        : config?.columns || []) as ProcurementTableColumn[]
    );
    const detailMode = resolveProcurementDetailMode(config?.detailMode, isInventoryLike);

    return {
      ...(config || {}),
      columns,
      entityType,
      tableType: config?.tableType || 'itemsTable',
      detailMode,
      // If someone still uses inventory_request/inventory_cart modes, force form_edit.
      ...(detailMode === 'inventory_request' || detailMode === 'inventory_cart'
        ? { recordDetailModalType: config?.recordDetailModalType ?? 'form_edit' }
        : {}),
    };
  }, [config]);

  return <LeadTableComponent config={mergedConfig} />;
};
