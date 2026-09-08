import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export type CustomTableColumn = {
  header: string;
  accessor: string;
  type?: 'text' | 'number' | 'date' | 'chip' | 'link' | 'action';
  linkField?: string;
  editableInTable?: boolean;
  openCard?: boolean;
  actionApiEndpoint?: string;
  actionApiMethod?: string;
  actionApiHeaders?: string;
  actionApiPayload?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  minWidth?: string;
  maxWidth?: string;
};

export interface CustomTableProps {
  columns: CustomTableColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  renderCell?: (row: any, column: CustomTableColumn, columnIndex: number) => React.ReactNode;
  headerBgColor?: string;
  headerTextColor?: string;
  hoverable?: boolean;
  className?: string;
  tableClassName?: string;
  /** Tighter header/cell padding. */
  dense?: boolean;
  /** Tall spacious rows for All Requests prototype (~60–80px). */
  comfortable?: boolean;
  /** Stretch to fill parent height; body scrolls inside (All Requests page). */
  fillHeight?: boolean;
  /**
   * Fit table to parent width (table-layout: fixed). Use on All Requests so the
   * page does not scroll horizontally; status/shipment pills keep their size.
   */
  fitViewport?: boolean;
  /**
   * @deprecated Stacked card layout is removed. Prop kept for call-site compatibility.
   * Tables always render as a normal table with horizontal scroll on small screens.
   */
  stackBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | false;
  /** When set, prepends a checkbox column for multi-row selection. */
  rowSelection?: {
    selectedRowIds: ReadonlySet<string>;
    onToggleRow: (row: any, selected: boolean) => void;
    onToggleAll: () => void;
    getRowId?: (row: any) => string | number | null | undefined;
    /** When false, the row checkbox is disabled (e.g. different status than first selected). */
    canSelectRow?: (row: any) => boolean;
  };
}

/**
 * Multi-word headers stack vertically to fit narrow columns (e.g. "Request Date").
 * Item name stays one line when fitViewport is enabled.
 */
function isItemNameAccessor(accessor: string): boolean {
  const key = String(accessor || '').trim().toLowerCase();
  return key === 'item_name' || key === 'item_name_freeform';
}

function renderStackedHeader(
  header: string,
  align: 'left' | 'center' | 'right' = 'center',
  singleLine = false
) {
  const text = String(header || '').trim();
  if (singleLine || !text.includes(' ')) {
    return (
      <span
        className={cn(
          'block whitespace-nowrap',
          align === 'left' && 'text-left',
          align === 'right' && 'text-right',
          align === 'center' && 'text-center'
        )}
      >
        {text}
      </span>
    );
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return text;
  return (
    <span className="inline-flex flex-col items-center justify-center gap-0.5 leading-tight">
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>{word}</span>
      ))}
    </span>
  );
}

/**
 * CustomTable — always a normal HTML table.
 * Small screens scroll horizontally (no stacked field cards).
 */
export const CustomTable: React.FC<CustomTableProps> = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  onRowClick,
  renderCell,
  headerBgColor = 'bg-black',
  headerTextColor = 'text-white',
  hoverable = true,
  className,
  tableClassName,
  dense = false,
  comfortable = false,
  fillHeight = false,
  fitViewport = false,
  rowSelection,
}) => {
  const getRowId = rowSelection?.getRowId ?? ((row: any) => row?.id);
  const normalizeSelectionRowId = (id: unknown): string | null => {
    if (id == null || id === '') return null;
    return String(id);
  };
  const selectableRows = rowSelection
    ? data.filter((row) => (rowSelection.canSelectRow ? rowSelection.canSelectRow(row) : true))
    : [];
  const visibleSelectableIds = selectableRows
    .map((row) => normalizeSelectionRowId(getRowId(row)))
    .filter((id): id is string => id != null);
  const allVisibleSelected =
    rowSelection != null &&
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => rowSelection.selectedRowIds.has(id));
  const someVisibleSelected =
    rowSelection != null &&
    visibleSelectableIds.some((id) => rowSelection.selectedRowIds.has(id)) &&
    !allVisibleSelected;

  const cellY = comfortable ? (fitViewport ? 'py-3' : 'py-4') : dense ? 'py-1' : 'py-2';
  const cellX = comfortable ? (fitViewport ? 'px-2.5' : 'px-3') : dense ? 'px-2.5' : 'px-4';
  const leftCellX = comfortable
    ? fitViewport
      ? 'pl-2.5 pr-2.5'
      : 'pl-3 pr-3'
    : dense
      ? 'pl-2 pr-2.5'
      : 'pl-2 pr-4';
  const headerUppercase = dense || comfortable;

  const defaultRenderCell = (row: any, column: CustomTableColumn, _columnIndex: number) => {
    const value = row[column.accessor];

    if (column.type === 'link' && column.linkField && row[column.linkField]) {
      return (
        <a
          href={row[column.linkField]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value || 'N/A'}
        </a>
      );
    }

    if (column.type === 'chip' && value) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {value}
        </span>
      );
    }

    return <span>{value || 'N/A'}</span>;
  };

  const cellRenderer = renderCell || defaultRenderCell;

  return (
    <div
      className={cn(
        'w-full max-w-full min-w-0',
        fillHeight && 'flex h-full min-h-0 flex-col',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-full min-w-0',
          fitViewport ? 'overflow-x-hidden' : 'overflow-x-auto',
          fillHeight ? 'min-h-0 flex-1 overflow-y-auto' : 'overflow-y-hidden'
        )}
      >
        <table
          className={cn(
            fitViewport ? 'table-fixed w-full' : 'min-w-max w-full',
            'bg-white',
            tableClassName
          )}
        >
          {fitViewport ? (
            <colgroup>
              {rowSelection ? (
                <col style={{ width: '2.5rem', minWidth: '2.5rem', maxWidth: '2.5rem' }} />
              ) : null}
              {columns.map((col, idx) => (
                <col
                  key={idx}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                  }}
                />
              ))}
            </colgroup>
          ) : null}
          <thead className={fillHeight ? 'sticky top-0 z-10' : undefined}>
            <tr className={cn('border-b border-gray-200', headerBgColor, headerTextColor)}>
              {rowSelection ? (
                <th
                  className={cn(
                    'w-10 min-w-[2.5rem] max-w-[2.5rem] text-sm font-medium',
                    comfortable ? 'py-3' : cellY,
                    `${cellX} text-center`
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={() => rowSelection.onToggleAll()}
                    aria-label="Select all rows on this page"
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0E3777]"
                  />
                </th>
              ) : null}
              {columns.map((col, idx) => {
                const itemNameCol = isItemNameAccessor(col.accessor);
                const headerSingleLine = fitViewport && itemNameCol;
                const headerPadLeft =
                  fitViewport && itemNameCol && col.align === 'left' ? 'pl-5 pr-2.5' : leftCellX;
                return (
                <th
                  key={idx}
                  className={cn(
                    'text-sm font-medium',
                    fitViewport && 'overflow-hidden',
                    headerSingleLine && 'whitespace-nowrap',
                    headerUppercase && 'uppercase tracking-wide font-semibold',
                    comfortable ? 'py-3' : cellY,
                    col.align === 'left'
                      ? `${headerPadLeft} text-left`
                      : col.align === 'right'
                        ? `${cellX} text-right`
                        : `${cellX} text-center`,
                    col.width && `w-[${col.width}]`
                  )}
                  style={
                    col.width || col.minWidth || col.maxWidth
                      ? { width: col.width, minWidth: col.minWidth, maxWidth: col.maxWidth }
                      : undefined
                  }
                >
                  {renderStackedHeader(
                    col.header,
                    col.align === 'left' || col.align === 'right' ? col.align : 'center',
                    headerSingleLine
                  )}
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (rowSelection ? 1 : 0)} className="text-center py-8 text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowSelection ? 1 : 0)} className="text-center py-8 text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row: any, rowIdx: number) => {
                const rowId = normalizeSelectionRowId(getRowId(row));
                const isRowSelected = rowId != null && rowSelection?.selectedRowIds.has(rowId);
                const canSelectRow =
                  !rowSelection ||
                  isRowSelected ||
                  (rowSelection.canSelectRow ? rowSelection.canSelectRow(row) : true);
                return (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-gray-200 bg-white',
                    comfortable && 'h-[4.5rem]',
                    isRowSelected && 'bg-blue-50/60',
                    hoverable && onRowClick && 'hover:bg-gray-50 cursor-pointer',
                    !hoverable && 'hover:bg-transparent',
                    isRowSelected && hoverable && onRowClick && 'hover:bg-blue-50/80'
                  )}
                >
                  {rowSelection ? (
                    <td
                      className={cn('w-10 min-w-[2.5rem] max-w-[2.5rem] text-center align-middle', cellY, cellX)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isRowSelected}
                        disabled={!canSelectRow}
                        onCheckedChange={(checked) => {
                          if (rowId == null || !canSelectRow) return;
                          rowSelection.onToggleRow(row, checked === true);
                        }}
                        aria-label={
                          canSelectRow
                            ? 'Select row'
                            : 'Cannot select — status differs from the first selected request'
                        }
                        title={
                          canSelectRow
                            ? undefined
                            : 'Select only requests with the same status as the first selected row'
                        }
                      />
                    </td>
                  ) : null}
                  {columns.map((col, colIdx) => {
                    const itemNameCol = isItemNameAccessor(col.accessor);
                    const cellPadLeft =
                      fitViewport && itemNameCol && col.align === 'left' ? 'pl-5 pr-2.5' : leftCellX;
                    return (
                    <td
                      key={colIdx}
                      className={cn(
                        'text-sm align-middle',
                        comfortable ? 'whitespace-normal' : 'whitespace-nowrap',
                        fitViewport && 'max-w-0',
                        cellY,
                        col.align === 'left' ? `${cellPadLeft} text-left` : `${cellX} text-center`,
                        col.align === 'right' && `${cellX} text-right`
                      )}
                    >
                      {cellRenderer(row, col, colIdx)}
                    </td>
                    );
                  })}
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomTable;
