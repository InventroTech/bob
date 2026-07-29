import React from 'react';
import type { JobsPageComponentProps } from './types';
import { useJobsPage } from './useJobsPage';
import { JobsPageView } from './JobsPageView';

/**
 * Public jobs listing / application page for ATS PageBuilder.
 * Filters, job cards, and application modal with resume upload.
 */
export const JobsPageComponent: React.FC<JobsPageComponentProps> = (props) => {
  const model = useJobsPage(props);
  return <JobsPageView {...model} />;
};

export default JobsPageComponent;
export type { Job, JobsPageComponentConfig, JobsPageComponentProps } from './types';
