/**
 * Centralized HTTP Client
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getBaseUrl, API_CONFIG, getTenantSlug } from './config';
import { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';

/**
 * Create and configure the main API client
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup interceptors
setupRequestInterceptor(apiClient);
setupResponseInterceptor(apiClient);

/**
 * Create a client for a specific base URL
 * Useful for calling different API endpoints (e.g., MAIN_API vs RENDER_API)
 */
export const createApiClient = (baseURL: string, config?: AxiosRequestConfig): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...config?.headers,
    },
    ...config,
  });

  setupRequestInterceptor(client);
  setupResponseInterceptor(client);

  return client;
};

/**
 * Legacy fetch wrapper for backward compatibility
 * This allows gradual migration from fetch() to axios
 * 
 * @deprecated Use apiClient or service methods instead
 */
export const apiFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Get session token
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!headers['X-Tenant-Slug']) {
    headers['X-Tenant-Slug'] = getTenantSlug();
  }

  // Build full URL
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;

  // Make fetch request
  return fetch(fullUrl, {
    ...options,
    headers,
  });
};

