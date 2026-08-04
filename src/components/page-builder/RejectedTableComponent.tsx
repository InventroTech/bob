'use client';

import React, { useMemo } from 'react';
import { LeadTableComponent } from './lead-table';
import { resolvePriorityFromRow } from '@/lib/inventory/priority';

export type RejectedTableColumn = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'chip' | 'link' | 'action';
  transform?: (value: any, row: any) => any;
};

export type RejectedTableConfig = {
  title?: string;
  entityType?: string;
  apiEndpoint?: string;
  columns?: RejectedTableColumn[];
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
  recordDetailModalType?: 'default' | 'form_edit';
  [key: string]: unknown;
};

interface RejectedTableProps {
  config?: RejectedTableConfig;
}

/**
 * Default columns for Rejected Table (same as Pending Approval — no tracking columns).
 */
export const DEFAULT_REJECTED_TABLE_COLUMNS: RejectedTableColumn[] = [
  { key: 'item_name_freeform', label: 'Item Name', type: 'text' },
  { key: 'requester_name', label: 'Requested By', type: 'text' },
  { key: 'estimated_cost', label: 'Estimated Cost', type: 'text' },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'urgency_level', label: 'Urgency Level', type: 'chip' },
  { key: 'request_date', label: 'Request Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'chip' },
];

/** Status always shown on Rejected Table (hardcoded). */
export const REJECTED_TABLE_STATUSES = ['REJECTED'] as const;

/** Defaults applied when the component is first dropped in Page Builder. */
export const DEFAULT_REJECTED_TABLE_CONFIG = {
  title: '',
  columns: DEFAULT_REJECTED_TABLE_COLUMNS,
  entityType: 'unmannd_request',
  tableType: 'itemsTable' as const,
  detailMode: 'record_form_modal' as const,
  emptyMessage: 'No rejected requests found',
  forceQueryParams: {
    status: REJECTED_TABLE_STATUSES.join(','),
  },
  formModalFields: [
    { key: 'status', label: 'Status', enabled: false },
    { key: 'item_name_freeform', label: 'Item', enabled: false },
    { key: 'quantity_required', label: 'Quantity', enabled: true },
    { key: 'estimated_cost', label: 'Estimated Cost', enabled: false },
    { key: 'line_total', label: 'Price', enabled: false },
    { key: 'request_date', label: 'Request Date', enabled: false },
    { key: 'vendor', label: 'Vendor', enabled: true },
    { key: 'urgency_level', label: 'Urgency Level', enabled: false },
    { key: 'department', label: 'Department', enabled: false },
    { key: 'project_purpose', label: 'Project', enabled: false },
    { key: 'category', label: 'Category', enabled: false },
    { key: 'specifications', label: 'Specifications', enabled: true },
    { key: 'product_link', label: 'Item link', enabled: true, link: true },
    { key: 'comments', label: 'Comments', enabled: true },
  ],
};

function withPriorityTransform(columns: RejectedTableColumn[]): RejectedTableColumn[] {
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
 * Rejected table for Page Builder — always filters to status=REJECTED.
 */
export const RejectedTableComponent: React.FC<RejectedTableProps> = ({ config }) => {
  const mergedConfig = useMemo(() => {
    const fromEndpoint = entityTypeFromEndpoint(config?.apiEndpoint);
    const entityType = config?.entityType || fromEndpoint || 'unmannd_request';
    const isInventoryLike =
      entityType === 'inventory_request' || entityType === 'unmannd_request';
    const columns = withPriorityTransform(
      (config?.columns?.length
        ? config.columns
        : DEFAULT_REJECTED_TABLE_COLUMNS) as RejectedTableColumn[]
    );

    const configuredDetailMode = config?.detailMode;
    const detailMode =
      configuredDetailMode === 'inventory_payment_modal' ||
      configuredDetailMode === 'receive_shipments' ||
      configuredDetailMode === 'lead_assignment_modal' ||
      configuredDetailMode === 'none' ||
      configuredDetailMode === 'lead_card'
        ? configuredDetailMode
        : isInventoryLike
          ? 'record_form_modal'
          : configuredDetailMode;

    return {
      ...(config || {}),
      title: '',
      columns,
      entityType,
      tableType: config?.tableType === 'default' ? 'default' : 'itemsTable',
      detailMode,
      emptyMessage: config?.emptyMessage ?? 'No rejected requests found',
      // Always restrict to REJECTED — not overridable from Page Builder config.
      forceQueryParams: {
        status: REJECTED_TABLE_STATUSES.join(','),
      },
      formModalFields:
        Array.isArray(config?.formModalFields) && (config.formModalFields as unknown[]).length > 0
          ? config.formModalFields
          : DEFAULT_REJECTED_TABLE_CONFIG.formModalFields,
      recordDetailModalType: ((): 'default' | 'form_edit' | undefined => {
        const configured = config?.recordDetailModalType;
        if (configured === 'default') return 'default';
        if (isInventoryLike) return 'form_edit';
        return configured;
      })(),
      showFormModalSaveButton:
        (config as { showFormModalSaveButton?: boolean } | undefined)?.showFormModalSaveButton ??
        (isInventoryLike ? true : undefined),
    };
  }, [config]);

  return <LeadTableComponent config={mergedConfig as any} />;
};
