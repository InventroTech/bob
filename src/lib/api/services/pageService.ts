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
        params: { user_id: userId },
      });

      const responseData = response.data;

      // Robust parsing (same as your membershipService)
      if (Array.isArray(responseData)) return responseData;
      if (responseData && typeof responseData === 'object') {
        if ('results' in responseData && Array.isArray((responseData as any).results))
          return (responseData as any).results;
        if ('data' in responseData && Array.isArray((responseData as any).data))
          return (responseData as any).data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pages from Render API:', error);
      throw error;
    }
  },

  /**
   * Get pages for a specific tenant and role (used by custom app/spoof flows)
   * Maps to: GET /pages/?tenant_id=&role_id=
   */
  async getPagesForRole(
    tenantId: string,
    roleId: string
  ): Promise<{ id: string; name: string; display_order: number; icon_name: string }[]> {
    try {
      const response = await apiClient.get(`/pages/`, {
        params: { tenant_id: tenantId, role_id: roleId },
      });

      const responseData = response.data;

      const items: any[] =
        Array.isArray(responseData)
          ? responseData
          : responseData && typeof responseData === 'object'
          ? Array.isArray((responseData as any).results)
            ? (responseData as any).results
            : Array.isArray((responseData as any).data)
            ? (responseData as any).data
            : []
          : [];

      return items.map((page) => ({
        id: page.id,
        name: page.name,
        display_order: page.display_order ?? 0,
        icon_name: page.icon_name ?? 'Sparkles',
      }));
    } catch (error) {
      console.error('Error fetching pages by role from API:', error);
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
  },

  /**
   * Get a single page by ID for a given tenant
   * Maps to: GET /pages/{id}/?tenant_id=
   */
  async getPageById(
    pageId: string,
    tenantId: string
  ): Promise<{ name: string; config: any } | null> {
    try {
      const response = await apiClient.get(`/pages/${pageId}/`, {
        params: { tenant_id: tenantId },
      });

      const data = response.data;
      if (!data) return null;

      if (typeof data === 'object' && 'name' in data && 'config' in data) {
        return {
          name: (data as any).name,
          config: (data as any).config,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching page ${pageId} from API:`, error);
      throw error;
    }
  },
};