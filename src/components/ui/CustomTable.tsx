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
}

/**
 * CustomTable Component
 * A reusable table component with consistent styling and behavior
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
}) => {
  const defaultRenderCell = (row: any, column: CustomTableColumn, columnIndex: number) => {
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
    <div className={cn('overflow-hidden w-full', className)}>
      <table className={cn('min-w-full bg-white', tableClassName)}>
        <thead>
          <tr className={cn('border-b border-gray-200', headerBgColor, headerTextColor)}>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={cn(
                  'text-sm font-medium px-4 py-3',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.width && `w-[${col.width}]`
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
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
                      'text-sm px-4 py-3',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
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
  );
};

export default CustomTable;
