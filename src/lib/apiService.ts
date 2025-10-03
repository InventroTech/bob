import { authService } from '@/lib/authService';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

class ApiService {
  private baseUrl: string;
  private rendererUrl: string;

  constructor() {
    // Use your existing environment variables
    this.baseUrl = import.meta.env.VITE_RENDER_API_URL || 'https://pyro-backend-1.onrender.com';
    this.rendererUrl = import.meta.env.VITE_RENDER_API_URL || 'https://pyro-backend-1.onrender.com';
  }

  private async getAuthHeaders() {
    const sessionResponse = await authService.getSession();
    if (!sessionResponse.success || !sessionResponse.data?.access_token) {
      throw new Error('Authentication required');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionResponse.data.access_token}`,
    };
  }

  // Custom Tables API - Now calls Django backend
  async getCustomTables(tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-tables/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Custom Columns API - Now calls Django backend
  async getCustomColumns(tableId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-columns/?table_id=${tableId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async createCustomColumn(tableId: string, columnData: { name: string; type: string }): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-columns/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...columnData, table_id: tableId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async updateCustomColumn(columnId: string, columnData: { name: string; type: string }): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-columns/${columnId}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(columnData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async deleteCustomColumn(columnId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-columns/${columnId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async reorderCustomColumns(columnIds: string[]): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-columns/reorder/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ columnIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Custom Rows API - Now calls Django backend
  async getCustomRows(tableId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-rows/?table_id=${tableId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async createCustomRow(tableId: string, rowData: any): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-rows/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ table_id: tableId, data: rowData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async updateCustomRow(rowId: string, rowData: any): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-rows/${rowId}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: rowData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async deleteCustomRow(rowId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-rows/${rowId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Pages API - Now calls Django backend
  async getPages(tenantId: string, roleId?: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const url = roleId 
        ? `${this.baseUrl}/page-builder/pages/?tenant_id=${tenantId}&role=${roleId}`
        : `${this.baseUrl}/page-builder/pages/?tenant_id=${tenantId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async getPage(pageId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/pages/${pageId}/`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async createPage(pageData: any): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/pages/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(pageData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async updatePage(pageId: string, pageData: any): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/pages/${pageId}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(pageData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async deletePage(pageId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/pages/${pageId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async getPagesByUser(userId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/pages/?user_id=${userId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Users API - Now calls Django backend
  async getUsers(tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/users/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async getRoles(tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/roles/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async getTenantUser(userId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/tenant-users/`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async getTenant(tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/tenant/`, {
        method: 'GET',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async getUserByEmail(email: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/users/by-email/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Tenant Users API - Now calls Django backend
  async getTenantUsers(tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/tenant-users/`, {
        method: 'GET',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async removeTenantUser(userId: string, tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/tenant-users/remove/`, {
        method: 'DELETE',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Leads API - Now calls Django backend
  async getLeads(): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/leads/`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async deleteLead(leadId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/leads/${leadId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async createLeads(leadsData: any[]): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/leads/create/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(leadsData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Cards API - Now calls Django backend
  async getCards(cardSetId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/cards/`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async deleteCard(cardId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/cards/${cardId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async createCard(cardData: any): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/cards/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // File Upload - Now calls Django backend
  async uploadFile(file: File, path: string): Promise<ApiResponse<any>> {
    try {
      const headers = await this.getAuthHeaders();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);

      const response = await fetch(`${this.baseUrl}/files/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': headers.Authorization,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async getFileUrl(path: string): Promise<ApiResponse<string>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/files/download/${encodeURIComponent(path)}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async deleteFile(path: string): Promise<ApiResponse<any>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/files/delete/${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Leads Table operations - Now calls Django backend
  async checkExistingLeads(emails: string[], phones: string[]): Promise<ApiResponse<{emails: string[], phones: string[]}>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/leads/check-existing/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ emails, phones }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async createLeadsTableRecord(leadData: any): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/leads/create-record/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  async updateLeadsTableRecord(leadId: string, updateData: any): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/leads/update-record/${leadId}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Invite User API - Now calls Django backend
  async inviteUser(email: string, tenantId: string, role: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.rendererUrl}/auth/invite-user/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, tenantId, role }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Update User Role API - Now calls Django backend
  async updateUserRole(userId: string, roleId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.rendererUrl}/auth/users/${userId}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role_id: roleId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Create Custom Table API - Now calls Django backend
  async createCustomTable(name: string, tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/custom-tables/`, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
        body: JSON.stringify({ name, tenant_id: tenantId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Create Role API - Now calls Django backend
  async createRole(name: string, tenantId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/page-builder/roles/`, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Tenant-Slug': tenantId,
        },
        body: JSON.stringify({ name, tenant_id: tenantId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
}

export const apiService = new ApiService();