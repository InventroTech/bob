import { apiClient } from '../client';

export interface PageRecord {
  id?: string;
  name?: string;
  updated_at?: string;
  role?: string | null;
  display_order?: number;
  config?: any;          // The JSON data for your drag-and-drop components
  icon_name?: string;    // The icon chosen in the builder
  header_title?: string; // The title shown in the app
  tenant_id?: string;
  user_id?: string;
}

export const pageService = {
  /**
   * 1. Get all pages (Used in MyPages dashboard)
   * GET /pages/
   */
  async getPages(userId: string): Promise<PageRecord[]> {
    try {
      const response = await apiClient.get(`/pages/`, { params: { user_id: userId } });
      const responseData = response.data;
      
      if (Array.isArray(responseData)) return responseData;
      if (responseData && typeof responseData === 'object') {
        if ('results' in responseData && Array.isArray(responseData.results)) return responseData.results;
        if ('data' in responseData && Array.isArray(responseData.data)) return responseData.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pages:', error);
      throw error;
    }
  },

  /**
   * 2. Delete a page (Used in MyPages dashboard)
   * DELETE /pages/{id}/
   */
  async deletePage(pageId: string): Promise<void> {
    await apiClient.delete(`/pages/${pageId}/`);
  },

  /**
   * 3. Get a single page's exact layout and settings (Used in PageBuilder)
   * GET /pages/{id}/
   */
  async getPageById(pageId: string): Promise<PageRecord> {
    const response = await apiClient.get(`/pages/${pageId}/`);
    // Depending on how your backend wraps single objects
    return response.data.data || response.data; 
  },

  /**
   * 4. Save a brand new page (Used in PageBuilder)
   * POST /pages/
   */
  async createPage(pageData: Partial<PageRecord>): Promise<{ id: string }> {
    const response = await apiClient.post(`/pages/`, pageData);
    return response.data.data || response.data;
  },

  /**
   * 5. Overwrite an existing page (Used in PageBuilder)
   * PATCH /pages/{id}/
   */
  async updatePage(pageId: string, pageData: Partial<PageRecord>): Promise<void> {
    await apiClient.patch(`/pages/${pageId}/`, pageData);
  }
};