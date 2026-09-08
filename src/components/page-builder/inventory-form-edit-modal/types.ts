/** Types for the inventory form edit modal. */

export type FormModalFieldConfig = {
  key: string;
  label: string;
  enabled: boolean;
  /** When true and field is read-only, render value as a clickable link. */
  link?: boolean;
};

export interface InventoryFormEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  entityType?: string;
  /** Field config: key (data key), label (text to show), enabled (editable vs read-only). */
  formModalFields: FormModalFieldConfig[];
  /** Action buttons: label + status value. Click updates record with form data + this status. */
  actionButtons?: Array<{
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
  onUpdate?: (recordId: number, patch: { data?: Record<string, unknown> }) => Promise<void>;
  onRecordUpdated?: (recordId: number) => void;
  /** Modal title (e.g. "Edit record"). */
  formModalTitle?: string;
  /** Modal description text below the title. */
  formModalDescription?: string;
  /** Whether to show the Save button in the footer. If undefined, Save shows only when there are no action buttons. */
  showSaveButton?: boolean;
  /**
   * Inventory All Requests actor page. Team lead and PM both get Approve/Reject
   * (including on their own requests). Mode is kept for Page Builder pages.
   */
  inventoryWorkflowMode?: 'auto' | 'manager' | 'team_lead';
  /** When set, show one button: conditional if attribute matches, else default (e.g. Inventory Payment modal). */
  paymentButtonConfig?: {
    conditionalButton: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: string | number; label: string; statusValue: string; targetAttribute?: string };
    defaultButton: { label: string; statusValue: string; targetAttribute?: string };
  };
  /** Checkboxes shown beside action buttons; each saves data[key] = true/false. */
  modalFlags?: Array<{
    label: string;
    key: string;
    enabled?: boolean;
    conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
  }>;
  /**
   * Show the extra “Final price” block (computed total/unit from one input).
   * When false, that section is hidden and computed price overrides are not applied on save.
   * Default: true (when omitted).
   */
  showFinalPriceSection?: boolean;
  /** Requestor-only: show "Delete request" for inventory_request (any status). Default false. */
  showDeleteRequestButton?: boolean;
  /** Show "See request history" button and history view. */
  showHistoryButton?: boolean;
  /** Called after a successful delete (e.g. refresh table). */
  onDeleted?: (recordId: number) => void;
  /**
   * Visual chrome for Unmannd “All Requests” redesign (dark header/footer).
   * Default keeps the classic light modal used by inventory_request.
   */
  uiVariant?: 'default' | 'unmannd';
  /** Move to the previous/next row without closing the modal (e.g. table row navigation). */
  onNavigate?: (direction: 'prev' | 'next') => void;
  /** Whether a previous record exists relative to the current one. */
  hasPrevious?: boolean;
  /** Whether a next record exists relative to the current one. */
  hasNext?: boolean;
  /** Current position within the list, e.g. { index: 2, total: 24 } for "3 of 24". */
  navigationPosition?: { index: number; total: number };
}

export type StatusHistoryEntry = {
  current_status: string;
  previous_status: string;
  changed_by: string;
};
