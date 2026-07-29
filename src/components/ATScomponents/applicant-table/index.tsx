import React from 'react';
import type { ApplicantTableComponentProps } from './types';
import { useApplicantTable } from './useApplicantTable';
import { ApplicantTableView } from './ApplicantTableView';

/**
 * Applicant / applications table for ATS PageBuilder.
 * Stage pipeline, filters, and application detail modal.
 */
export const ApplicantTableComponent: React.FC<ApplicantTableComponentProps> = (props) => {
  const model = useApplicantTable(props);
  return <ApplicantTableView {...model} />;
};

export default ApplicantTableComponent;
export type {
  ApplicantStage,
  Application,
  Job,
  ApplicantTableConfig,
  ApplicantTableComponentProps,
} from './types';
