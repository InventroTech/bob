/**
 * WhatsApp Template API Service
 * Handles all WhatsApp template-related API calls
 * Uses the central apiClient for automatic auth and tenant handling
 */

import { apiClient } from '../client';

export interface WhatsAppTemplate {
  id: number;
  title: string;
  description: string;
}

export interface WhatsAppTemplateCreatePayload {
  title: string;
  description: string;
}

export interface WhatsAppTemplateResponse {
  results?: WhatsAppTemplate[];
  templates?: WhatsAppTemplate[];
  data?: WhatsAppTemplate[];
}

/**
 * Normalize endpoint: ensure it starts with / and handle trailing slashes
 * @param endpoint - The endpoint to normalize
 * @returns Normalized endpoint
 */
export const normalizeEndpoint = (endpoint: string): string => {
  let normalized = endpoint.trim();
  
  // Ensure it starts with / if it's a relative path
  if (!normalized.startsWith('/') && !normalized.startsWith('http')) {
    normalized = `/${normalized}`;
  }
  
  // Remove trailing slash unless it's just "/"
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
};

/**
 * Build endpoint path with ID for PUT/DELETE operations
 * @param baseEndpoint - The base endpoint
 * @param id - The ID to append
 * @param ensureTrailingSlash - Whether to ensure trailing slash (default: true)
 * @returns Endpoint path with ID
 */
export const buildEndpointWithId = (
  baseEndpoint: string,
  id: number,
  ensureTrailingSlash: boolean = true
): string => {
  // Normalize base endpoint (remove trailing slash)
  const normalizedBase = normalizeEndpoint(baseEndpoint);
  let endpointWithId = `${normalizedBase}/${id}`;
  
  // Ensure trailing slash for Django compatibility
  if (ensureTrailingSlash && !endpointWithId.endsWith('/')) {
    endpointWithId = `${endpointWithId}/`;
  }
  
  return endpointWithId;
};

/**
 * WhatsApp Template API Service
 */
export const whatsappTemplateService = {
  /**
   * Get all WhatsApp templates
   * @param endpoint - Custom endpoint (optional, uses default if not provided)
   * @returns Promise with array of templates
   */
  async getAll(endpoint?: string): Promise<WhatsAppTemplate[]> {
    try {
      const apiEndpoint = normalizeEndpoint(endpoint || '/api/whatsapp-templates');
      
      // Use apiClient which handles auth and tenant automatically via interceptors
      const response = await apiClient.get<WhatsAppTemplateResponse | WhatsAppTemplate[]>(apiEndpoint);
      
      const responseData = response.data;
      
      // Handle different response formats
      if (Array.isArray(responseData)) {
        return responseData;
      }
      
      if (responseData && typeof responseData === 'object') {
        if ('results' in responseData && Array.isArray(responseData.results)) {
          return responseData.results;
        }
        if ('templates' in responseData && Array.isArray(responseData.templates)) {
          return responseData.templates;
        }
        if ('data' in responseData && Array.isArray(responseData.data)) {
          return responseData.data;
        }
      }
      
      return [];
    } catch (error: any) {
      console.error('Error fetching WhatsApp templates:', error);
      throw error;
    }
  },

  /**
   * Create a new WhatsApp template
   * @param payload - The template data
   * @param endpoint - Custom endpoint (optional)
   * @returns Promise with the created template
   */
  async create(
    payload: WhatsAppTemplateCreatePayload,
    endpoint?: string
  ): Promise<WhatsAppTemplate> {
    try {
      let apiEndpoint = normalizeEndpoint(endpoint || '/api/whatsapp-templates');
      // Ensure trailing slash for POST
      if (!apiEndpoint.endsWith('/')) {
        apiEndpoint = `${apiEndpoint}/`;
      }
      
      // Use apiClient which handles auth and tenant automatically via interceptors
      const response = await apiClient.post<WhatsAppTemplate>(apiEndpoint, payload);
      return response.data;
    } catch (error: any) {
      console.error('Error creating WhatsApp template:', error);
      throw error;
    }
  },

  /**
   * Update an existing WhatsApp template
   * @param id - The template ID
   * @param payload - The updated template data
   * @param endpoint - Custom base endpoint (optional)
   * @returns Promise with the updated template
   */
  async update(
    id: number,
    payload: WhatsAppTemplateCreatePayload,
    endpoint?: string
  ): Promise<WhatsAppTemplate> {
    try {
      const baseEndpoint = endpoint || '/api/whatsapp-templates';
      const apiEndpoint = buildEndpointWithId(baseEndpoint, id, true);
      
      // Use apiClient which handles auth and tenant automatically via interceptors
      const response = await apiClient.put<WhatsAppTemplate>(apiEndpoint, payload);
      return response.data;
    } catch (error: any) {
      console.error('Error updating WhatsApp template:', error);
      throw error;
    }
  },

  /**
   * Delete a WhatsApp template
   * @param id - The template ID
   * @param endpoint - Custom base endpoint (optional)
   * @returns Promise that resolves when the template is deleted
   */
  async delete(id: number, endpoint?: string): Promise<void> {
    try {
      const baseEndpoint = endpoint || '/api/whatsapp-templates';
      const apiEndpoint = buildEndpointWithId(baseEndpoint, id, true);
      
      // Use apiClient which handles auth and tenant automatically via interceptors
      await apiClient.delete(apiEndpoint);
    } catch (error: any) {
      console.error('Error deleting WhatsApp template:', error);
      throw error;
    }
  },
};

