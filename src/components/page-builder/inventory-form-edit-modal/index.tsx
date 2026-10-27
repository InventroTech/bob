'use client';

import React from 'react';
import type { InventoryFormEditModalProps } from './types';
import { useInventoryFormEditModal } from './useInventoryFormEditModal';
import { InventoryFormEditModalView } from './InventoryFormEditModalView';
import { mergeUnmanndFormModalFields } from '@/components/page-builder/unmannd-request-detail-modal/fields';

/**
 * Inventory request edit modal. Same layout as the Unmannd detail modal;
 * chrome uses the request form blue (#1A3673) and black (#0B1F4D).
 */
export const InventoryFormEditModal: React.FC<InventoryFormEditModalProps> = (props) => {
  const isPayment = !!props.paymentButtonConfig;
  const model = useInventoryFormEditModal({
    ...props,
    uiVariant: 'inventory',
    showHistoryButton: props.showHistoryButton ?? true,
    showFinalPriceSection: isPayment ? props.showFinalPriceSection : false,
    formModalFields: isPayment
      ? props.formModalFields
      : mergeUnmanndFormModalFields(props.formModalFields),
  });
  return <InventoryFormEditModalView {...model} />;
};

export default InventoryFormEditModal;
export type { FormModalFieldConfig, InventoryFormEditModalProps } from './types';
