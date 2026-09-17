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
  /** Extra classes per row (e.g. highlight from notification). */
  getRowClassName?: (row: any, rowIndex: number) => string | undefined;
  /** Inline styles per row (preferred for highlight bg so Tailwind can't override). */
  getRowStyle?: (row: any, rowIndex: number) => React.CSSProperties | undefined;
  /** Stable row id for DOM targeting / scroll-into-view. */
  getRowId?: (row: any, rowIndex: number) => string | undefined;
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
    /**
     * When set (e.g. item_name), place the checkbox beside that column
     * instead of a separate leading column.
     */
    placeBesideAccessor?: string;
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

/** Shipment + Link sit side-by-side — keep horizontal padding minimal. */
function isTightPairAccessor(accessor: string): boolean {
  const key = String(accessor || '').trim().toLowerCase();
  return (
    key === 'shipment_status' ||
    key === 'product_link' ||
    key === 'additional_link' ||
    key === 'link'
  );
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
    <span
      className={cn(
        'inline-flex flex-col justify-center gap-0.5 leading-tight',
        align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
      )}
    >
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
  getRowClassName,
  getRowStyle,
  getRowId,
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
  const getSelectionRowId = rowSelection?.getRowId ?? ((row: any) => row?.id);
  const normalizeSelectionRowId = (id: unknown): string | null => {
    if (id == null || id === '') return null;
    return String(id);
  };
  const selectionBesideKey = String(rowSelection?.placeBesideAccessor || '')
    .trim()
    .toLowerCase();
  const embedSelectionBesideColumn = Boolean(rowSelection && selectionBesideKey);
  const showLeadingSelectionColumn = Boolean(rowSelection) && !embedSelectionBesideColumn;
  const isSelectionBesideAccessor = (accessor: string) => {
    if (!embedSelectionBesideColumn) return false;
    const key = String(accessor || '').trim().toLowerCase();
    if (key === selectionBesideKey) return true;
    // Item name column can be item_name or item_name_freeform depending on page config.
    const besideIsItemName =
      selectionBesideKey === 'item_name' || selectionBesideKey === 'item_name_freeform';
    return besideIsItemName && (key === 'item_name' || key === 'item_name_freeform');
  };

  const selectableRows = rowSelection
    ? data.filter((row) => (rowSelection.canSelectRow ? rowSelection.canSelectRow(row) : true))
    : [];
  const visibleSelectableIds = selectableRows
    .map((row) => normalizeSelectionRowId(getSelectionRowId(row)))
    .filter((id): id is string => id != null);
  const allVisibleSelected =
    rowSelection != null &&
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => rowSelection.selectedRowIds.has(id));
  const someVisibleSelected =
    rowSelection != null &&
    visibleSelectableIds.some((id) => rowSelection.selectedRowIds.has(id)) &&
    !allVisibleSelected;

  const selectionColSpan = showLeadingSelectionColumn ? 1 : 0;

  const cellY = comfortable
    ? fitViewport
      ? 'py-1.5'
      : 'py-4'
    : dense
      ? 'py-1'
      : 'py-2';
  const cellX = comfortable ? (fitViewport ? 'px-1.5' : 'px-3') : dense ? 'px-2.5' : 'px-4';
  const leftCellX = comfortable
    ? fitViewport
      ? 'pl-1.5 pr-1'
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
  const colSpan = columns.length + (rowSelection ? 1 : 0);

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
          // Allow horizontal scroll when columns exceed the viewport; keep vertical scroll for tall tables.
          'overflow-x-auto',
          fillHeight ? 'min-h-0 flex-1 overflow-y-auto' : 'overflow-y-visible'
        )}
      >
        <table
          className={cn(
            fitViewport ? 'w-full min-w-[72rem] table-fixed' : 'min-w-max w-full',
            'bg-white',
            tableClassName
          )}
        >
          {fitViewport ? (
            <colgroup>
              {showLeadingSelectionColumn ? (
                <col style={{ width: '2.5rem', minWidth: '2.5rem', maxWidth: '2.5rem' }} />
              ) : null}
              {columns.map((col, idx) => {
                const beside = isSelectionBesideAccessor(col.accessor);
                const minW = beside
                  ? col.minWidth || '11rem'
                  : col.minWidth;
                const width = beside ? col.width || '12rem' : col.width;
                return (
                  <col
                    key={idx}
                    style={{
                      width,
                      minWidth: minW,
                      maxWidth: col.maxWidth,
                    }}
                  />
                );
              })}
            </colgroup>
          ) : null}
          <thead className={fillHeight ? 'sticky top-0 z-10' : undefined}>
            <tr className={cn('border-b border-gray-200', headerBgColor, headerTextColor)}>
              {showLeadingSelectionColumn ? (
                <th
                  className={cn(
                    'w-8 min-w-[2rem] max-w-[2rem] text-sm font-medium',
                    comfortable ? (fitViewport ? 'py-2' : 'py-3') : cellY,
                    fitViewport ? 'px-1 text-center' : `${cellX} text-center`
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={() => rowSelection!.onToggleAll()}
                    aria-label="Select all rows on this page"
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0E3777]"
                  />
                </th>
              ) : null}
              {columns.map((col, idx) => {
                const itemNameCol = isItemNameAccessor(col.accessor);
                const selectionBeside = isSelectionBesideAccessor(col.accessor);
                const tightPairCol = isTightPairAccessor(col.accessor);
                const isFixedCol = Boolean(col.width || col.maxWidth);
                // Keep "ITEM NAME" on one line so the header isn't clipped to "ITEM".
                const headerSingleLine = fitViewport && itemNameCol;
                const tightPad = fitViewport && tightPairCol ? 'px-0.5' : null;
                const headerPadLeft =
                  fitViewport && itemNameCol
                    ? 'pl-2 pr-2'
                    : tightPad ?? leftCellX;
                const headerPadCenter = tightPad ?? cellX;
                return (
                <th
                  key={idx}
                  className={cn(
                    'text-sm font-medium',
                    fitViewport && !itemNameCol && !isFixedCol && 'overflow-hidden',
                    itemNameCol && fitViewport && 'min-w-[9rem] overflow-visible',
                    isFixedCol && fitViewport && 'overflow-visible',
                    headerSingleLine && 'whitespace-nowrap',
                    headerUppercase && 'uppercase tracking-wide font-semibold',
                    comfortable ? (fitViewport ? 'py-2' : 'py-3') : cellY,
                    col.align === 'left'
                      ? `${headerPadLeft} text-left`
                      : col.align === 'right'
                        ? `${headerPadCenter} text-right`
                        : `${headerPadCenter} text-center`,
                    col.width && `w-[${col.width}]`
                  )}
                  style={
                    col.width || col.minWidth || col.maxWidth || selectionBeside
                      ? {
                          width: selectionBeside ? col.width || '12rem' : col.width,
                          minWidth: selectionBeside ? col.minWidth || '11rem' : col.minWidth,
                          maxWidth: col.maxWidth,
                        }
                      : undefined
                  }
                >
                  {selectionBeside ? (
                    <div className="flex items-center gap-2">
                      <span onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={
                            allVisibleSelected
                              ? true
                              : someVisibleSelected
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={() => rowSelection!.onToggleAll()}
                          aria-label="Select all rows on this page"
                          className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0E3777]"
                        />
                      </span>
                      {renderStackedHeader(
                        col.header,
                        col.align === 'left' || col.align === 'right' ? col.align : 'center',
                        headerSingleLine
                      )}
                    </div>
                  ) : (
                    renderStackedHeader(
                      col.header,
                      col.align === 'left' || col.align === 'right' ? col.align : 'center',
                      headerSingleLine
                    )
                  )}
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length + selectionColSpan} className="text-center py-8 text-sm text-gray-500">
                <td colSpan={colSpan} className="text-center py-8 text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + selectionColSpan} className="text-center py-8 text-sm text-gray-500">
                <td colSpan={colSpan} className="text-center py-8 text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row: any, rowIdx: number) => {
                const selectionRowId = normalizeSelectionRowId(getSelectionRowId(row));
                const rowId = getRowId?.(row, rowIdx) ?? selectionRowId ?? undefined;
                const rowClassName = getRowClassName?.(row, rowIdx);
                const rowStyle = getRowStyle?.(row, rowIdx);
                const isHighlighted = Boolean(rowStyle?.backgroundColor || rowClassName);
                const isRowSelected =
                  selectionRowId != null && rowSelection?.selectedRowIds.has(selectionRowId);
                const canSelectRow =
                  !rowSelection ||
                  isRowSelected ||
                  (rowSelection.canSelectRow ? rowSelection.canSelectRow(row) : true);
                return (
                <tr
                  key={rowId || rowIdx}
                  data-row-id={rowId}
                  data-highlighted={isHighlighted ? 'true' : undefined}
                  tabIndex={rowId ? -1 : undefined}
                  onClick={() => onRowClick?.(row)}
                  style={rowStyle}
                  className={cn(
                    'border-b border-gray-200 bg-white',
                    comfortable && !fitViewport && 'h-[4.5rem]',
                    comfortable && fitViewport && 'h-auto',
                    isRowSelected && 'bg-blue-50/60',
                    hoverable && onRowClick && 'hover:bg-gray-50 cursor-pointer',
                    'border-b border-gray-200',
                    !isHighlighted && !isRowSelected && 'bg-white',
                    !isHighlighted && isRowSelected && 'bg-blue-50/60',
                    comfortable && 'h-[4.5rem]',
                    hoverable && onRowClick && !isHighlighted && 'hover:bg-gray-50 cursor-pointer',
                    hoverable && onRowClick && isHighlighted && 'cursor-pointer',
                    !isHighlighted && isRowSelected && hoverable && onRowClick && 'hover:bg-blue-50/80',
                    !hoverable && 'hover:bg-transparent',
                    rowClassName,
                  )}
                >
                  {showLeadingSelectionColumn ? (
                    <td
                      className={cn(
                        'w-8 min-w-[2rem] max-w-[2rem] text-center align-middle',
                        cellY,
                        fitViewport ? 'px-1' : cellX
                      )}
                      className={cn('w-10 min-w-[2.5rem] max-w-[2.5rem] text-center align-middle', cellY, cellX)}
                      style={
                        rowStyle?.backgroundColor
                          ? {
                              backgroundColor: String(rowStyle.backgroundColor),
                              color: rowStyle.color,
                              boxShadow: 'inset 0 0 0 9999px #BFDBFE',
                            }
                          : undefined
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isRowSelected}
                        disabled={!canSelectRow}
                        onCheckedChange={(checked) => {
                          if (rowId == null || !canSelectRow) return;
                          rowSelection!.onToggleRow(row, checked === true);
                          if (selectionRowId == null || !canSelectRow) return;
                          rowSelection.onToggleRow(row, checked === true);
                        }}
                        aria-label={canSelectRow ? 'Select row' : 'Cannot select row'}
                        title={canSelectRow ? undefined : 'Cannot select this row'}
                      />
                    </td>
                  ) : null}
                  {columns.map((col, colIdx) => {
                    const itemNameCol = isItemNameAccessor(col.accessor);
                    const selectionBeside = isSelectionBesideAccessor(col.accessor);
                    const tightPairCol = isTightPairAccessor(col.accessor);
                    const isFixedCol = Boolean(col.width || col.maxWidth);
                    const tightPad = fitViewport && tightPairCol ? 'px-0.5' : null;
                    const cellPadLeft =
                      fitViewport && itemNameCol
                        ? 'pl-2 pr-2'
                        : tightPad ?? leftCellX;
                    const cellPadOther = tightPad ?? cellX;
                    return (
                    <td
                      key={colIdx}
                      style={
                        rowStyle?.backgroundColor
                          ? {
                              backgroundColor: String(rowStyle.backgroundColor),
                              color: rowStyle.color,
                              // Tables often ignore <tr> backgrounds — force cell paint.
                              boxShadow: 'inset 0 0 0 9999px #BFDBFE',
                            }
                          : undefined
                      }
                      className={cn(
                        'text-sm align-middle',
                        comfortable ? 'whitespace-normal' : 'whitespace-nowrap',
                        // Only clip flexible text columns — item name + fixed cols must stay visible.
                        fitViewport && !isFixedCol && !itemNameCol && 'max-w-0 overflow-hidden',
                        fitViewport && (isFixedCol || itemNameCol) && 'overflow-visible',
                        cellY,
                        col.align === 'left' ? `${cellPadLeft} text-left` : `${cellPadOther} text-center`,
                        col.align === 'right' && `${cellPadOther} text-right`
                        col.align === 'left' ? `${cellPadLeft} text-left` : `${cellX} text-center`,
                        col.align === 'right' && `${cellX} text-right`,
                        rowStyle?.backgroundColor && '!bg-[#BFDBFE]',
                      )}
                    >
                      {selectionBeside ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isRowSelected}
                              disabled={!canSelectRow}
                              onCheckedChange={(checked) => {
                                if (rowId == null || !canSelectRow || !rowSelection) return;
                                rowSelection.onToggleRow(row, checked === true);
                              }}
                              aria-label={canSelectRow ? 'Select row' : 'Cannot select row'}
                              title={canSelectRow ? undefined : 'Cannot select this row'}
                            />
                          </span>
                          <div className="min-w-0 flex-1">{cellRenderer(row, col, colIdx)}</div>
                        </div>
                      ) : (
                        cellRenderer(row, col, colIdx)
                      )}
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
