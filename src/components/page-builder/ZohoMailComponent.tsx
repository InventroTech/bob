import React from 'react';
import { ZohoMailConnectCard } from '@/features/integrations/components/ZohoMailConnectCard';

export interface ZohoMailComponentConfig {
  title?: string;
}

interface ZohoMailComponentProps {
  config?: ZohoMailComponentConfig;
}

/**
 * Opt-in Zoho Mail parsing widget for Page Builder.
 * Only tenants that add this component to a page get mailbox connect/sync.
 */
export const ZohoMailComponent: React.FC<ZohoMailComponentProps> = () => {
  return <ZohoMailConnectCard />;
};

export default ZohoMailComponent;
