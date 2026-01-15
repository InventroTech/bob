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
    (error: AxiosError) => {
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

