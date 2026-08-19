/** Types for RecordDetailModal. */

export type RecordDetailEntityType =
  | 'inventory_request'
  | 'inventory_item'
  | 'lead'
  | string;

export type NormalizedStatusHistoryEntry = {
  current_status: string;
  previous_status: string;
  changed_by: string;
};

export interface RecordDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  entityLabel?: string;
  entityType?: RecordDetailEntityType;
  /** Keys inside record.data that are editable (overrides default by entityType). */
  editableFields?: string[];
  /** Called to PATCH the record. If not provided, fields are read-only. */
  onUpdate?: (recordId: number, patch: { data?: Record<string, unknown> }) => Promise<void>;
  /** Called after a record is deleted so the parent can refresh/remove it. */
  onDeleted?: (recordId: number) => void;
  /** Called after a record is updated by an action (e.g. Proceed to PM) so the parent can refresh the table. */
  onRecordUpdated?: (recordId: number) => void;
  /** Optional action buttons that set record data.status on click. */
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
  /** Optional checkbox flags shown beside action buttons; each can be conditional. */
  modalFlags?: Array<{
    label: string;
    key: string;
    enabled?: boolean;
    conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
  }>;
  /**
   * When false, hide price-related data rows (total/unit price, currency, estimated cost, GST flag)
   * so they stay in sync with the form-style modal “Final price section” toggle.
   * Default: true when omitted.
   */
  showFinalPriceSection?: boolean;
  /** Whether requestor can see the "Delete request" button (any status). Default: false. */
  showDeleteRequestButton?: boolean;
  /** Show "See request history" button and history view. */
  showHistoryButton?: boolean;
}
