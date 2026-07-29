'use client';

import React from 'react';
import type { RecordDetailModalProps } from './types';
import { useRecordDetailModal } from './useRecordDetailModal';
import { RecordDetailModalView } from './RecordDetailModalView';

/**
 * Record detail / edit modal for inventory requests and CRM records.
 */
export const RecordDetailModal: React.FC<RecordDetailModalProps> = (props) => {
  const model = useRecordDetailModal(props);
  return <RecordDetailModalView {...model} />;
};

export default RecordDetailModal;
export type { RecordDetailEntityType, RecordDetailModalProps } from './types';
