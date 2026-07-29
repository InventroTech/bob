import React from 'react';
import type { JobManagerComponentProps } from './types';
import { useJobManager } from './useJobManager';
import { JobManagerView } from './JobManagerView';

/**
 * Job management UI for ATS / PageBuilder.
 * Create, edit, preview, and delete job postings with dynamic application forms.
 */
export const JobManagerComponent: React.FC<JobManagerComponentProps> = (props) => {
  const model = useJobManager(props);
  return <JobManagerView {...model} />;
};

export default JobManagerComponent;
export type { Job, JobManagerComponentProps, JobManagerComponentConfig, QuestionWithType } from './types';
