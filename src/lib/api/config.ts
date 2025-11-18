/**
 * API Configuration
 * Centralized configuration for all API endpoints and base URLs
 */

export const API_CONFIG = {
  // Primary API endpoints
  RENDER_API: import.meta.env.VITE_RENDER_API_URL || '',
  MAIN_API: import.meta.env.VITE_API_URI || '',
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // Default tenant slug (can be overridden per request)
  DEFAULT_TENANT_SLUG: 'bibhab-thepyro-ai',
  
  // Request timeout in milliseconds
  TIMEOUT: 30000,
} as const;

/**
 * Get the appropriate base URL for API calls
 * Priority: RENDER_API > BASE_URL
 */
export const getBaseUrl = (): string => {
  return API_CONFIG.RENDER_API || API_CONFIG.BASE_URL;
};

/**
 * Get tenant slug (can be extended to get from context/hook)
 * For now, returns the default tenant slug
 */
export const getTenantSlug = (): string => {
  return API_CONFIG.DEFAULT_TENANT_SLUG;
};

