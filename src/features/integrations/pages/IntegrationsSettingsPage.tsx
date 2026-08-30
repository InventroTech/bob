import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ZOHO_OAUTH_RETURN_KEY = 'zoho_oauth_return';

/**
 * OAuth landing. Prefer returning to the tenant Settings page (User Management)
 * that started Connect; fall back to /add-user.
 */
const IntegrationsSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let returnPath = '/add-user';
    try {
      const saved = sessionStorage.getItem(ZOHO_OAUTH_RETURN_KEY);
      if (saved && saved.startsWith('/')) {
        returnPath = saved;
      }
      sessionStorage.removeItem(ZOHO_OAUTH_RETURN_KEY);
    } catch {
      // ignore
    }

    const oauth = new URLSearchParams();
    for (const key of ['zoho_mail', 'email', 'detail'] as const) {
      const value = searchParams.get(key);
      if (value) oauth.set(key, value);
    }

    const url = new URL(returnPath, window.location.origin);
    oauth.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    navigate(`${url.pathname}${url.search}`, { replace: true });
  }, [navigate, searchParams]);

  return null;
};

export default IntegrationsSettingsPage;
