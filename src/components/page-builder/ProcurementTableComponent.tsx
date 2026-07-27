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
  showFinalPriceSection: false,
  formModalFields: [
    { key: 'status', label: 'Status', enabled: false },
    { key: 'item_name_freeform', label: 'Item', enabled: false },
    { key: 'quantity_required', label: 'Quantity', enabled: true },
    { key: 'estimated_cost', label: 'Estimated Cost', enabled: false },
    { key: 'line_total', label: 'Price', enabled: false },
    { key: 'request_date', label: 'Requested Date', enabled: false },
    { key: 'vendor', label: 'Vendor', enabled: true },
    { key: 'urgency_level', label: 'Priority', enabled: false },
    { key: 'department', label: 'Department', enabled: false },
    { key: 'project_purpose', label: 'Project', enabled: false },
    { key: 'category', label: 'Category', enabled: false },
    { key: 'specifications', label: 'Specifications', enabled: true },
    { key: 'product_link', label: 'Item link', enabled: true, link: true },
    { key: 'comments', label: 'Comments', enabled: true },
  ],
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

/** Ensure Price (qty × estimated cost) and Requested Date always appear in the procurement modal. */
function withProcurementModalFields(
  fields: Array<{ key: string; label: string; enabled: boolean; link?: boolean }>
): Array<{ key: string; label: string; enabled: boolean; link?: boolean }> {
  const keys = new Set(fields.map((f) => f.key));
  const next = [...fields];

  const insertAfter = (afterKey: string, field: { key: string; label: string; enabled: boolean; link?: boolean }) => {
    if (keys.has(field.key)) return;
    const idx = next.findIndex((f) => f.key === afterKey);
    if (idx >= 0) next.splice(idx + 1, 0, field);
    else next.push(field);
    keys.add(field.key);
  };

  insertAfter('quantity_required', { key: 'estimated_cost', label: 'Estimated Cost', enabled: false });
  if (!keys.has('estimated_cost')) {
    insertAfter('quantity', { key: 'estimated_cost', label: 'Estimated Cost', enabled: false });
  }
  insertAfter('estimated_cost', { key: 'line_total', label: 'Price', enabled: false });
  if (!keys.has('line_total')) {
    insertAfter('quantity_required', { key: 'line_total', label: 'Price', enabled: false });
  }
  if (!keys.has('line_total')) {
    insertAfter('quantity', { key: 'line_total', label: 'Price', enabled: false });
  }
  insertAfter('line_total', { key: 'request_date', label: 'Requested Date', enabled: false });
  if (!keys.has('request_date')) {
    next.push({ key: 'request_date', label: 'Requested Date', enabled: false });
  }
  insertAfter('department', { key: 'project_purpose', label: 'Project', enabled: false });
  if (!keys.has('project_purpose')) {
    next.push({ key: 'project_purpose', label: 'Project', enabled: false });
  }
  insertAfter('project_purpose', { key: 'category', label: 'Category', enabled: false });
  if (!keys.has('category')) {
    next.push({ key: 'category', label: 'Category', enabled: false });
  }

  // When vendor can be changed, product link must be editable too.
  const vendorEnabled = next.some((f) => f.key === 'vendor' && f.enabled);
  insertAfter('vendor', { key: 'product_link', label: 'Item link', enabled: true, link: true });
  if (!keys.has('product_link')) {
    next.push({ key: 'product_link', label: 'Item link', enabled: true, link: true });
  }

  return next.map((f) => {
    if (f.key === 'urgency_level' || f.key === 'priority') {
      return { ...f, label: 'Priority', enabled: false };
    }
    if (f.key === 'product_link' && vendorEnabled) {
      return { ...f, enabled: true, link: true, label: f.label || 'Item link' };
    }
    return f;
  });
}

/**
 * Resolve row-click modal so Approve / Reject / Order appear on Manager & TL All Requests.
 * Always use the form modal for inventory-like tables unless an explicit special mode is set.
 */
function resolveProcurementDetailMode(
  detailMode: ProcurementTableConfig['detailMode'] | undefined,
  isInventoryLike: boolean
): ProcurementTableConfig['detailMode'] | undefined {
  if (!isInventoryLike) return detailMode;

  // Keep intentional special modes.
  if (
    detailMode === 'inventory_payment_modal' ||
    detailMode === 'receive_shipments' ||
    detailMode === 'lead_assignment_modal' ||
    detailMode === 'none'
  ) {
    return detailMode;
  }

  // auto / inventory_request / lead_card / unset → form modal with Approve / Reject / Order.
  return 'record_form_modal';
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

    const { detailMode: _ignoredDetailMode, ...restConfig } = config || {};
    const tableType: 'default' | 'itemsTable' =
      restConfig.tableType === 'default' ? 'default' : 'itemsTable';

    return {
      ...restConfig,
      columns,
      entityType,
      tableType,
      detailMode,
      // Ensure Manager All Requests always has form fields for the Approve/Reject modal.
      formModalFields: withProcurementModalFields(
        Array.isArray(config?.formModalFields) && config.formModalFields.length > 0
          ? config.formModalFields
          : DEFAULT_PROCUREMENT_TABLE_CONFIG.formModalFields
      ),
      showFinalPriceSection: config?.showFinalPriceSection ?? false,
      // If someone still uses inventory_request mode, force form_edit.
      ...(detailMode === 'inventory_request'
        ? { recordDetailModalType: config?.recordDetailModalType ?? 'form_edit' }
        : {}),
    } as Record<string, unknown>;
  }, [config]);

  return <LeadTableComponent config={mergedConfig as any} />;
};
