'use client';

import React from 'react';
import type { InventoryFormEditModalProps } from './types';
import { useInventoryFormEditModal } from './useInventoryFormEditModal';
import { InventoryFormEditModalView } from './InventoryFormEditModalView';

/**
 * Inventory request edit modal for PageBuilder tables.
 * Supports workflow actions, tracking, history, and final price.
 */
export const InventoryFormEditModal: React.FC<InventoryFormEditModalProps> = (props) => {
  const model = useInventoryFormEditModal(props);
  return <InventoryFormEditModalView {...model} />;
};

export default InventoryFormEditModal;
export type { FormModalFieldConfig, InventoryFormEditModalProps } from './types';
