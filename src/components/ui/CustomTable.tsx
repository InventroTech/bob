import React from 'react';
import { cn } from '@/lib/utils';

export interface CustomTableColumn {
  /**
   * Column header text
   */
  header: string;

  /**
   * Column accessor/key for data
   */
  accessor: string;

  /**
   * Column type for rendering
   */
  type?: 'text' | 'chip' | 'link' | 'action';

  /**
   * Field to use as link (for link type)
   */
  linkField?: string;
  /** Whether this column is editable inline in table (used by custom renderers). */
  editableInTable?: boolean;

  /**
   * For action type: open detail card (lead/ticket) on click
   */
  openCard?: boolean | string;

  /**
   * For action type: API endpoint to call when action button is clicked
   */
  actionApiEndpoint?: string;
  actionApiMethod?: string;
  actionApiHeaders?: string;
  actionApiPayload?: string;

  /**
   * Custom width
   */
  width?: string;

  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right';
}

export interface CustomTableProps {
  /**
   * Table columns configuration
   */
  columns: CustomTableColumn[];

  /**
   * Table data rows
   */
  data: any[];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Row click handler
   */
  onRowClick?: (row: any) => void;

  /**
   * Custom cell renderer
   */
  renderCell?: (row: any, column: CustomTableColumn, columnIndex: number) => React.ReactNode;

  /**
   * Table header background color
   */
  headerBgColor?: string;

  /**
   * Table header text color
   */
  headerTextColor?: string;

  /**
   * Row hover effect
   */
  hoverable?: boolean;

  /**
   * Additional CSS classes for the table wrapper
   */
  className?: string;

  /**
   * Additional CSS classes for the table element
   */
  tableClassName?: string;

  /**
   * Below this Tailwind breakpoint, rows stack columns vertically (cards)
   * instead of a wide horizontal table. Pass falsy / omit to always keep the
   * normal table (with horizontal scroll on small screens).
   */
  stackBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | false;
}

/**
 * Stack multi-word headers (e.g. "Request Date").
 * Centered under the column by default; left-aligned columns keep words left.
 */
function renderStackedHeader(header: string, align: 'left' | 'center' | 'right' = 'center') {
  const words = String(header || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 1) return header;
  return (
    <span
      className={cn(
        'inline-flex flex-col gap-0.5 leading-tight',
        align === 'left' && 'items-start',
        align === 'right' && 'items-end',
        align === 'center' && 'items-center justify-center'
      )}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>{word}</span>
      ))}
    </span>
  );
}

/**
 * CustomTable Component
 * A reusable table component with consistent styling and behavior.
 * Optionally stacks columns as cards below a breakpoint when `stackBelow` is set.
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
  stackBelow = false,
}) => {
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

  const useStackedCards = Boolean(stackBelow);

  const stackVisible = !useStackedCards
    ? 'hidden'
    : stackBelow === 'sm'
      ? 'sm:hidden'
      : stackBelow === 'md'
        ? 'md:hidden'
        : stackBelow === 'xl'
          ? 'xl:hidden'
          : stackBelow === '2xl'
            ? '2xl:hidden'
            : 'lg:hidden';

  const tableVisible = !useStackedCards
    ? 'block'
    : stackBelow === 'sm'
      ? 'hidden sm:block'
      : stackBelow === 'md'
        ? 'hidden md:block'
        : stackBelow === 'xl'
          ? 'hidden xl:block'
          : stackBelow === '2xl'
            ? 'hidden 2xl:block'
            : 'hidden lg:block';

  const emptyOrLoading = (
    <div className="px-4 py-8 text-center text-sm text-gray-500">
      {loading ? 'Loading...' : emptyMessage}
    </div>
  );

  return (
    <div className={cn('w-full max-w-full min-w-0', className)}>
      {/* Narrow / not-fullscreen: columns stack downward as cards */}
      <div className={cn('space-y-3', stackVisible)}>
        {loading || data.length === 0 ? (
          emptyOrLoading
        ) : (
          data.map((row: any, rowIdx: number) => (
            <div
              key={rowIdx}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (!onRowClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className={cn(
                'rounded-lg border border-gray-200 bg-white p-3 shadow-sm',
                hoverable && onRowClick && 'cursor-pointer hover:bg-gray-50',
                onRowClick && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20'
              )}
            >
              <dl className="space-y-2.5">
                {columns.map((col, colIdx) => (
                  <div
                    key={colIdx}
                    className="grid grid-cols-[minmax(6rem,8.5rem)_minmax(0,1fr)] items-start gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {col.header}
                    </dt>
                    <dd className="min-w-0 text-sm text-gray-800">{cellRenderer(row, col, colIdx)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </div>

      {/* Wide / fullscreen: normal table */}
      <div className={cn('overflow-x-auto overflow-y-hidden', tableVisible)}>
        <table className={cn('min-w-full bg-white', tableClassName)}>
          <thead>
            <tr className={cn('border-b border-gray-200', headerBgColor, headerTextColor)}>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'text-sm font-medium py-2 text-center',
                    col.align === 'left' ? 'pl-2 pr-4 text-left' : 'px-4',
                    col.align === 'right' && 'px-4 text-right',
                    col.width && `w-[${col.width}]`
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {renderStackedHeader(col.header, col.align === 'left' || col.align === 'right' ? col.align : 'center')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row: any, rowIdx: number) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-gray-200 bg-white',
                    hoverable && onRowClick && 'hover:bg-gray-50 cursor-pointer',
                    !hoverable && 'hover:bg-transparent'
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn(
                        'text-sm py-2 align-middle',
                        col.align === 'left' ? 'pl-2 pr-4 text-left' : 'px-4 text-center',
                        col.align === 'right' && 'px-4 text-right'
                      )}
                    >
                      {cellRenderer(row, col, colIdx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomTable;
