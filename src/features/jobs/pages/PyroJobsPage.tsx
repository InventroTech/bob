import React from 'react';
import JobsAdminPage from '../JobsAdminPage';
import { pyroJobsAdapter } from '../adapters';

const PyroJobsPage: React.FC = () => (
  <JobsAdminPage adapter={pyroJobsAdapter} />
);

export default PyroJobsPage;
