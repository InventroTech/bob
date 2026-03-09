import { apiClient } from '../client';

export interface PageRecord {
  id: string;
  name: string;
  updated_at: string;
  role: string;
  display_order: number;
}

export const pageService = {
  /**
   * Get all pages for the current user
   * Maps to: GET /pages/
   */
  async getPages(userId: string): Promise<PageRecord[]> {
    try {
      // The backend might filter automatically via your Auth token, 
      // but passing user_id as a query param is a safe standard approach.
      const response = await apiClient.get(`/pages/`, {
        params: { user_id: userId }
      });
      
      const responseData = response.data;

      // Robust parsing (same as your membershipService)
      if (Array.isArray(responseData)) return responseData;
      if (responseData && typeof responseData === 'object') {
        if ('results' in responseData && Array.isArray(responseData.results)) return responseData.results;
        if ('data' in responseData && Array.isArray(responseData.data)) return responseData.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pages from Render API:', error);
      throw error;
    }
  },

  /**
   * Delete a page by ID
   * Maps to: DELETE /pages/{id}/
   */
  async deletePage(pageId: string): Promise<void> {
    try {
      // Notice the trailing slash - Django/Python backends usually require it!
      await apiClient.delete(`/pages/${pageId}/`);
    } catch (error) {
      console.error(`Error deleting page ${pageId}:`, error);
      throw error;
    }
  }
};