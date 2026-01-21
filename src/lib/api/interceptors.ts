/**
 * Request and Response Interceptors
 * Handles authentication, error handling, and request/response transformation
 */

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { supabase } from '@/lib/supabase';
import { getTenantSlug } from './config';
import { 
  ApiError, 
  NetworkError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  ValidationError 
} from './errors';

/**
 * Request interceptor to add authentication token and tenant slug
 */
export const setupRequestInterceptor = (instance: any) => {
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Get session token from Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        console.warn('Failed to get session token:', error);
      }

      // Add tenant slug header if not already present
      if (!config.headers['X-Tenant-Slug']) {
        config.headers['X-Tenant-Slug'] = getTenantSlug();
      }

      // Ensure Content-Type is set
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );
};

/**
 * Response interceptor for error handling
 */
export const setupResponseInterceptor = (instance: any) => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Return full response object (includes status, headers, data, etc.)
      // Services can access response.data for the actual data
      return response;
    },
    async (error: AxiosError) => {
      // Handle aborted/cancelled requests silently
      if (error.code === 'ERR_CANCELED' || error.message?.includes('canceled') || error.message?.includes('aborted')) {
        // Return a special error that can be checked but won't trigger error handlers
        return Promise.reject(new Error('Request was cancelled'));
      }
      
      // Handle network errors
      if (!error.response) {
        // Check if it's an abort error
        if (error.message?.includes('aborted') || error.name === 'AbortError') {
          return Promise.reject(new Error('Request was cancelled'));
        }
        return Promise.reject(new NetworkError(error.message || 'Network error occurred'));
      }

      const { status, statusText, data } = error.response;
      const errorMessage = (data as any)?.error || (data as any)?.message || statusText || 'An error occurred';

      // Map HTTP status codes to custom error classes
      switch (status) {
        case 401:
          // Attempt to refresh token and retry request once
          const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
          
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              console.log('[Interceptor] 401 error - attempting to refresh session and retry request');
              
              // Force a session refresh
              const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError) {
                console.error('[Interceptor] Session refresh failed:', refreshError);
                return Promise.reject(new AuthenticationError(errorMessage, status, data));
              }
              
              if (session?.access_token) {
                console.log('[Interceptor] Session refreshed successfully - retrying request with new token');
                
                // Update the Authorization header with the new token
                originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
                
                // Retry the original request with the new token
                return instance(originalRequest);
              } else {
                console.warn('[Interceptor] Session refresh returned no token');
                return Promise.reject(new AuthenticationError(errorMessage, status, data));
              }
            } catch (refreshError) {
              console.error('[Interceptor] Error during token refresh:', refreshError);
              return Promise.reject(new AuthenticationError(errorMessage, status, data));
            }
          }
          
          // Already retried once, fail with authentication error
          console.log('[Interceptor] Request already retried - authentication failed');
          return Promise.reject(new AuthenticationError(errorMessage, status, data));
          
        case 403:
          return Promise.reject(new AuthorizationError(errorMessage, status, data));
        case 404:
          return Promise.reject(new NotFoundError(errorMessage, data));
        case 400:
          return Promise.reject(new ValidationError(errorMessage, data));
        default:
          return Promise.reject(new ApiError(errorMessage, status, statusText, data));
      }
    }
  );
};

