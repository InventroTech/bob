import React from 'react';
import CallAttemptMatrixPage from '../../pages/CallAttemptMatrixPage';

interface CallAttemptMatrixComponentProps {
  config?: {
    apiEndpoint?: string;
    leadTypesEndpoint?: string;
    title?: string;
  };
}

// Component that can be dragged from the sidebar and used in pages
const CallAttemptMatrixComponent = ({ config }: CallAttemptMatrixComponentProps) => {
  return <CallAttemptMatrixPage showHeader={false} className="p-6" config={config} />;
};

export default CallAttemptMatrixComponent;
