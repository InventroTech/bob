import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Legacy path. Zoho Mail lives under Settings → Integrations (`/settings?tab=integrations`).
 */
const IntegrationsSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'integrations');
    const qs = next.toString();
    navigate(qs ? `/settings?${qs}` : '/settings?tab=integrations', { replace: true });
  }, [navigate, searchParams]);

  return null;
};

export default IntegrationsSettingsPage;
