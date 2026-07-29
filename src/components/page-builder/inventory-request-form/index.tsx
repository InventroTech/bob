'use client';

import React from 'react';
import type { InventoryRequestFormProps } from './types';
import { useInventoryRequestForm } from './useInventoryRequestForm';
import { InventoryRequestFormView } from './InventoryRequestFormView';

/**
 * Inventory request creation form for PageBuilder.
 * Supports multiple items per submission; each item is saved as a separate record via API.
 * Hierarchy (this tenant): Requestor -> Procurement Manager -> Team Lead.
 * manager = requestor's parent; team_lead = manager's parent when present.
 */
export const InventoryRequestFormComponent: React.FC<InventoryRequestFormProps> = (props) => {
  const form = useInventoryRequestForm(props);
  return <InventoryRequestFormView {...form} />;
};

export default InventoryRequestFormComponent;
export type { InventoryRequestFormProps, InventoryRequestFormConfig } from './types';
