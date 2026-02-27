import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { FilterConfig } from '@/component-config/DynamicFilterConfig';
import { toast } from 'sonner';

export interface ComponentConfig {
  id: string;
  type: string;
  filters?: FilterConfig[];
  filterOptions?: {
    pageSize?: number;
    showSummary?: boolean;
    compact?: boolean;
  };
  [key: string]: any; // For other component properties
}

export interface PageConfig {
  components: ComponentConfig[];
  [key: string]: any;
}

export interface UseFilterConfigReturn {
  loading: boolean;
  saving: boolean;
  error: string | null;
  componentConfigs: ComponentConfig[];
  updateComponentFilters: (componentId: string, filters: FilterConfig[], filterOptions?: any) => Promise<void>;
  savePageConfig: (pageId: string, config: PageConfig) => Promise<boolean>;
  loadPageConfig: (pageId: string) => Promise<PageConfig | null>;
  validateFilterConfig: (filters: FilterConfig[]) => { isValid: boolean; errors: string[] };
}

// Manages reading/writing filter (and component) configuration to Supabase `pages` table
export const useFilterConfig = (pageId?: string): UseFilterConfigReturn => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [componentConfigs, setComponentConfigs] = useState<ComponentConfig[]>([]);

  // Load page configuration
  // Load page config JSON for a given page id/tenant; updates local component state
  const loadPageConfig = useCallback(async (targetPageId: string): Promise<PageConfig | null> => {
    if (!user || !tenantId) {
      setError('User or tenant not available');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pages')
        .select('config')
        .eq('id', targetPageId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const pageConfig: PageConfig = data?.config || { components: [] };
      setComponentConfigs(pageConfig.components || []);
      return pageConfig;
    } catch (err: any) {
      console.error('Error loading page config:', err);
      setError(err.message);
      toast.error('Failed to load page configuration');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  // Save page configuration
  // Persist the provided config JSON into the `pages` row; returns success boolean
  const savePageConfig = useCallback(async (targetPageId: string, config: PageConfig): Promise<boolean> => {
    if (!user || !tenantId) {
      setError('User or tenant not available');
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('pages')
        .update({
          config: config as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetPageId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw updateError;
      }

      setComponentConfigs(config.components || []);
      toast.success('Page configuration saved successfully');
      return true;
    } catch (err: any) {
      console.error('Error saving page config:', err);
      setError(err.message);
      toast.error('Failed to save page configuration');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, tenantId]);

  // Update filters for a specific component
  // Update a specific component's filters within the page config and save
  const updateComponentFilters = useCallback(async (
    componentId: string,
    filters: FilterConfig[],
    filterOptions?: any
  ): Promise<void> => {
    if (!pageId) {
      setError('No page ID available');
      return;
    }

    const updatedConfigs = componentConfigs.map(config => {
      if (config.id === componentId) {
        return {
          ...config,
          filters,
          filterOptions: filterOptions || config.filterOptions
        };
      }
      return config;
    });

    const pageConfig: PageConfig = {
      components: updatedConfigs,
      // Preserve other page-level configuration
      ...(componentConfigs.length > 0 ? {} : { components: updatedConfigs })
    };

    const success = await savePageConfig(pageId, pageConfig);
    if (success) {
      setComponentConfigs(updatedConfigs);
    }
  }, [pageId, componentConfigs, savePageConfig]);

  // Validate filter configuration
  // Basic validation for filter config editor; catches empty/duplicate keys
  const validateFilterConfig = useCallback((filters: FilterConfig[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    filters.forEach((filter, index) => {
      if (!filter.key || filter.key.trim() === '') {
        errors.push(`Filter ${index + 1}: Key is required`);
      }

      if (!filter.label || filter.label.trim() === '') {
        errors.push(`Filter ${index + 1} (${filter.key}): Label is required`);
      }

      if (filter.type === 'select') {
        const hasApiOptions = !!(filter.optionsApiUrl && filter.optionsApiUrl.trim());
        if (hasApiOptions) {
          if (!filter.optionsDisplayKey?.trim()) errors.push(`Filter ${index + 1} (${filter.key}): optionsDisplayKey required when using API`);
          if (!filter.optionsValueKey?.trim()) errors.push(`Filter ${index + 1} (${filter.key}): optionsValueKey required when using API`);
        } else if (!filter.options || filter.options.length === 0) {
          errors.push(`Filter ${index + 1} (${filter.key}): Select filters must have options or API config`);
        }
      }

      // Check for duplicate keys
      const duplicateIndex = filters.findIndex((f, i) => i !== index && f.key === filter.key);
      if (duplicateIndex !== -1) {
        errors.push(`Filter ${index + 1} (${filter.key}): Duplicate key with filter ${duplicateIndex + 1}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Load configuration when pageId changes
  useEffect(() => {
    if (pageId) {
      loadPageConfig(pageId);
    }
  }, [pageId, loadPageConfig]);

  return {
    loading,
    saving,
    error,
    componentConfigs,
    updateComponentFilters,
    savePageConfig,
    loadPageConfig,
    validateFilterConfig
  };
};
