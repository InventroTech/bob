'use client';

import React from 'react';
import { InventoryRequestFormComponent } from './InventoryRequestFormComponent';

type ProcurementRequestFormConfig = {
  entityType?: string;
  initialStatus?: string;
  initialStatusText?: string;
  defaultStatus?: string;
  urgencyOptions?: Array<{ value: string; label: string }>;
  [key: string]: unknown;
};

interface ProcurementRequestFormProps {
  config?: ProcurementRequestFormConfig;
}

/**
 * Procurement request form for Page Builder — same behavior as inventory request,
 * with procurement styling and default entity type `unmannd_request`.
 */
export const ProcurementRequestFormComponent: React.FC<ProcurementRequestFormProps> = ({ config }) => (
  <InventoryRequestFormComponent
    variant="procurement"
    config={{ entityType: 'unmannd_request', ...config }}
  />
);
