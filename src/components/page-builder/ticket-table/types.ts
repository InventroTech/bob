/** Types for the ticket table module. */

export interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip' | 'link' | 'action';
  openCard?: boolean | string;
  actionApiEndpoint?: string;
  actionApiMethod?: string;
  actionApiHeaders?: string;
  actionApiPayload?: string;
}

export interface TicketTableProps {
  config?: {
    apiEndpoint?: string;
    columns?: Array<{
      key: string;
      label: string;
      type: 'text' | 'chip' | 'date' | 'number' | 'link' | 'action';
      openCard?: boolean | string;
      actionApiEndpoint?: string;
      actionApiMethod?: string;
      actionApiHeaders?: string;
      actionApiPayload?: string;
    }>;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
    /** Comma-separated field names to search in (e.g. "name,email,subject"). Sent as search_fields with search param. */
    searchFields?: string;
  };
}

export interface PrajaTableProps {
  columns: Column[];
  data: any[];
  title: string;
  showFilters?: boolean;
  onRowClick?: (row: any) => void;
}
