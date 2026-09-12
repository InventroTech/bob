/**
 * Grafana Faro (Frontend Observability) configuration
 */

export interface FaroConfig {
  url: string;
  appName: string;
  appVersion: string;
  environment: string;
  enableTracing: boolean;
}

/**
 * Parse env vars for Faro. Returns null when collector URL is unset (Faro stays off).
 */
export const getFaroConfig = (): FaroConfig | null => {
  const url = import.meta.env.VITE_FARO_URL;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  const environment =
    import.meta.env.VITE_FARO_ENVIRONMENT ||
    import.meta.env.MODE ||
    import.meta.env.NODE_ENV ||
    'development';

  const enableTracing = import.meta.env.VITE_FARO_ENABLE_TRACING !== 'false';

  return {
    url: url.trim(),
    appName: (import.meta.env.VITE_FARO_APP_NAME || 'pyro-frontend').trim(),
    appVersion: (import.meta.env.VITE_FARO_APP_VERSION || '1.0.0').trim(),
    environment,
    enableTracing,
  };
};
