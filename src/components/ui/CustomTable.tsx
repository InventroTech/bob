import React from 'react';
import { cn } from '@/lib/utils';

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
  /**
   * @deprecated Stacked card layout is removed. Prop kept for call-site compatibility.
   * Tables always render as a normal table with horizontal scroll on small screens.
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
  stackBelow = 'lg',
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

  const stackVisible =
    stackBelow === 'sm'
      ? 'sm:hidden'
      : stackBelow === 'md'
        ? 'md:hidden'
        : stackBelow === 'xl'
          ? 'xl:hidden'
          : stackBelow === '2xl'
            ? '2xl:hidden'
            : 'lg:hidden';

  const tableVisible =
    stackBelow === 'sm'
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
      <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <table className={cn('min-w-max w-full bg-white', tableClassName)}>
          <thead>
            <tr className={cn('border-b border-gray-200', headerBgColor, headerTextColor)}>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'text-sm font-medium py-2 text-center whitespace-nowrap',
                    col.align === 'left' ? 'pl-2 pr-4 text-left' : 'px-4',
                    col.align === 'right' && 'px-4 text-right',
                    col.width && `w-[${col.width}]`
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {renderStackedHeader(
                    col.header,
                    col.align === 'left' || col.align === 'right' ? col.align : 'center'
                  )}
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
                        'text-sm py-2 align-middle whitespace-nowrap',
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
