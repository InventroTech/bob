/** Types for the lead table module. */

import type { FilterConfig } from '@/component-config/DynamicFilterConfig';

export interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip' | 'link' | 'action' | 'status_buttons' | 'date' | 'number';
  linkField?: string;
  /** If true, cell is editable inline in table for records endpoints. */
  editableInTable?: boolean;
  openCard?: boolean | string;
  actionApiEndpoint?: string;
  actionApiMethod?: string;
  actionApiHeaders?: string;
  actionApiPayload?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  /** For type status_buttons: buttons that set record data[targetAttribute] (default status). */
  statusButtons?: Array<{
    label: string;
    statusValue: string;
    targetAttribute?: string;
    statusText?: string;
    conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
    openWarningModal?: boolean;
    warningModalConfig?: {
      title?: string;
      description?: string;
      confirmationText?: string;
      formType?: 'payment_confirmation';
      paymentMethods?: string[];
    };
  }>;
}

export type PlaceholderAdapter = {
  tokens: string[];
  resolve: () => string | undefined;
};

export interface LeadTableProps {
  /** When set (e.g. in Page Builder), row-click modal is disabled so clicks don't open modals while editing. */
  pageId?: string;
  config?: {
    apiEndpoint?: string;
    columns?: Array<{
      key: string;
      label: string;
      type: 'text' | 'chip' | 'date' | 'number' | 'link' | 'action';
      linkField?: string;
      editable?: boolean;
      editableInTable?: boolean;
      transform?: (value: any, row: any) => any;
      width?: string;
      openCard?: boolean | string;
      actionApiEndpoint?: string;
      actionApiMethod?: string;
      actionApiHeaders?: string;
      actionApiPayload?: string;
    }>;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
    defaultFilters?: {
      lead_status?: string[];
      lead_stage?: string[];
    };
    /**
     * Always sent on list API fetches (overwrites same keys from UI filters).
     * Example: { status: 'NEW_REQUEST,ON_HOLD' }
     */
    forceQueryParams?: Record<string, string>;
    entityType?: string;
    /** When set, row click opens lead card / record detail / nothing. Use 'auto' or leave unset to infer from entityType. */
    detailMode?: 'lead_card' | 'inventory_request' | 'record_form_modal' | 'inventory_payment_modal' | 'receive_shipments' | 'lead_assignment_modal' | 'none' | 'auto';
    statusOptions?: string[];
    statusColors?: Record<string, string>;
    tableLayout?: 'auto' | 'fixed';
    emptyMessage?: string;

    // New dynamic filter configuration
    filters?: FilterConfig[];
    filterOptions?: {
      pageSize?: number;
      showSummary?: boolean;
      compact?: boolean;
    };
    searchFields?: string;

    showFallbackOnly?: boolean; // New prop to show only fallback

    /** Table type: default (first column can be profile card) or itemsTable (first column normal text, supports status buttons). */
    tableType?: 'default' | 'itemsTable';
    /** When tableType is itemsTable: list of buttons that update chosen record data attribute on click. */
    statusButtons?: Array<{
      label: string;
      statusValue: string;
      targetAttribute?: string;
      statusText?: string;
      conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
      openWarningModal?: boolean;
      warningModalConfig?: {
        title?: string;
        description?: string;
        confirmationText?: string;
        formType?: 'payment_confirmation';
        paymentMethods?: string[];
      };
    }>;
    /** Per-field config for record detail modal: which data keys are editable (key + editable toggle). */
    modalFieldConfig?: Array<{ key: string; editable: boolean }>;
    /** 'default' = record detail modal; 'form_edit' = form-style modal with action buttons. */
    recordDetailModalType?: 'default' | 'form_edit';
    /** For form_edit modal: fields (key, label, enabled). */
    formModalFields?: Array<{ key: string; label: string; enabled: boolean; link?: boolean }>;
    formModalTitle?: string;
    formModalDescription?: string;
    /** For Inventory Payment modal: conditional button (when attribute op value) + default button. */
    paymentModalConfig?: {
      conditionalButton: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: string; label: string; statusValue: string };
      defaultButton: { label: string; statusValue: string };
    };
    /** Show Save button in form-style modal footer. If undefined, Save shows only when there are no action buttons. */
    showFormModalSaveButton?: boolean;
    /**
     * Inventory All Requests actor for built-in modal buttons.
     * manager = Approve/Reject; team_lead = Order only; auto = from role.
     */
    inventoryWorkflowMode?: 'auto' | 'manager' | 'team_lead';
    /** Form-style modal: show the extra “Final price” computed block. Default true when omitted. */
    showFinalPriceSection?: boolean;
    /** Default modal: show requestor-side "Delete request" action. Default false. */
    showDeleteRequestButton?: boolean;
    /** Show "See request history" button in record modals. */
    showHistoryButton?: boolean;
    /** Checkbox flags shown beside action buttons; each can be conditional. */
    modalFlags?: Array<{
      label: string;
      key: string;
      enabled?: boolean;
      conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: string | number };
    }>;
  };
}
