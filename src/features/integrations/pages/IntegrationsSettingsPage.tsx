import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Legacy OAuth landing. Zoho Mail connect now lives on the Users page (/add-user).
 * Keep this route so old ZOHO_OAUTH_SUCCESS_REDIRECT values still work.
 */
const IntegrationsSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    navigate(qs ? `/add-user?${qs}` : '/add-user', { replace: true });
  }, [navigate, searchParams]);

  return null;
};

export default IntegrationsSettingsPage;
