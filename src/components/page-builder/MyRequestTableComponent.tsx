'use client';

import React, { useMemo } from 'react';
import { LeadTableComponent } from './lead-table';
import { resolvePriorityFromRow } from '@/lib/inventory/priority';
import { mergeInventoryTrackingColumns, excludeInventoryTrackColumn } from '@/lib/inventory/shipmentTracking';
import { resolveInventoryTableDisplayTitle } from './lead-table/utils';

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
 * Columns come from config; for inventory/unmannd requests, shipment status is merged in
 * but the Track link column is omitted (requestors use Shipment status only).
 */
export const MyRequestTableComponent: React.FC<MyRequestTableProps> = ({ config }) => {
  const mergedConfig = useMemo(() => {
    const fromEndpoint = entityTypeFromEndpoint(config?.apiEndpoint);
    const entityType = config?.entityType || fromEndpoint;
    const isInventoryLike =
      entityType === 'inventory_request' || entityType === 'unmannd_request';
    const columns = withPriorityTransform(
      (isInventoryLike
        ? excludeInventoryTrackColumn(
            mergeInventoryTrackingColumns(config?.columns || [], { includeTrack: false })
          )
        : config?.columns || []) as MyRequestTableColumn[]
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
      inventoryTableKind: 'my_request',
      title:
        resolveInventoryTableDisplayTitle({
          configuredTitle: config?.title,
          inventoryTableKind: 'my_request',
          pageDisplayName: config?.pageDisplayName,
        }) || 'My Requests',
      columns,
      ...(entityType ? { entityType } : {}),
      // Form modal so requestors get Verify (and other workflow actions) in the footer.
      detailMode,
      recordDetailModalType: ((): 'default' | 'form_edit' | undefined => {
        const configured = (config as { recordDetailModalType?: 'default' | 'form_edit' } | undefined)
          ?.recordDetailModalType;
        if (configured === 'default') return 'default';
        if (isInventoryLike) return 'form_edit';
        return configured;
      })(),
      showFormModalSaveButton:
        (config as { showFormModalSaveButton?: boolean } | undefined)?.showFormModalSaveButton ??
        (isInventoryLike ? true : undefined),
    };
  }, [config]);

  return <LeadTableComponent config={mergedConfig} />;
};
