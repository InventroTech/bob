'use client';

import React from 'react';
import type { InventoryFormEditModalProps } from '@/components/page-builder/inventory-form-edit-modal/types';
import { useInventoryFormEditModal } from '@/components/page-builder/inventory-form-edit-modal/useInventoryFormEditModal';
import { InventoryFormEditModalView } from '@/components/page-builder/inventory-form-edit-modal/InventoryFormEditModalView';
import { mergeUnmanndFormModalFields } from './fields';

/**
 * Unmannd All Requests detail modal — same layout as the inventory edit modal,
 * with Unmannd blue (#1A44A1) instead of the form blue and black.
 */
export const UnmanndRequestDetailModal: React.FC<InventoryFormEditModalProps> = (props) => {
  const model = useInventoryFormEditModal({
    ...props,
    uiVariant: 'unmannd',
    showHistoryButton: props.showHistoryButton ?? true,
    showFinalPriceSection: false,
    formModalFields: mergeUnmanndFormModalFields(props.formModalFields),
  });
  return <InventoryFormEditModalView {...model} />;
};

export default UnmanndRequestDetailModal;
