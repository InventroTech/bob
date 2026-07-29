import React from 'react';
import JobsAdminPage from '../JobsAdminPage';
import { backgroundJobsAdapter } from '../adapters';

const BackgroundJobsPage: React.FC = () => (
  <JobsAdminPage adapter={backgroundJobsAdapter} />
);

export default BackgroundJobsPage;
