import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Play, Loader2, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

export interface ScoringRule {
  id?: string | number;
  attribute: string;
  operator: string;
  value: string;
  weight: number;
  order?: number;
  is_active?: boolean;
  description?: string;
  entity_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DynamicScoringComponentConfig {
  title?: string;
  description?: string;
  
  // API Configuration
  attributesEndpoint?: string; // GET endpoint to fetch available attributes
  scoringEndpoint?: string; // POST endpoint to calculate score
  rulesEndpoint?: string; // GET/POST endpoint for CRUD operations on rules (default: /crm-records/scoring-rules/)
  apiMode?: 'localhost' | 'renderer';
  tenantSlug?: string;
  entityType?: string; // Entity type for rules (default: 'lead')
  
  // Display Options
  showTitle?: boolean;
  showDescription?: boolean;
}

interface DynamicScoringComponentProps {
  config?: DynamicScoringComponentConfig;
  className?: string;
}

const OPERATORS = [
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
];

export const DynamicScoringComponent: React.FC<DynamicScoringComponentProps> = ({
  config = {},
  className = ''
}) => {
  const { tenantId } = useTenant();
  const { session } = useAuth();
  
  const {
    title = 'Dynamic Scoring',
    description = 'Configure scoring rules and calculate scores',
    attributesEndpoint = '',
    scoringEndpoint = '',
    rulesEndpoint = '/crm-records/scoring-rules/',
    apiMode = 'renderer',
    tenantSlug,
    entityType = 'lead',
    showTitle = true,
    showDescription = true,
  } = config;

  // Map to store display name -> full attribute name
  const [attributeMap, setAttributeMap] = useState<Map<string, string>>(new Map());
  const [attributes, setAttributes] = useState<string[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([
    {
      id: `rule_${Date.now()}`,
      attribute: '',
      operator: '==',
      value: '',
      weight: 0,
    }
  ]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [pyroValue, setPyroValue] = useState<number | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | number | null>(null);

  // Use default endpoint if not provided - dynamically extracts from records
  const effectiveAttributesEndpoint = attributesEndpoint || '/crm-records/entity-attributes/';

  // Fetch attributes from API
  useEffect(() => {
    const fetchAttributes = async () => {
      setLoadingAttributes(true);
      try {
        let url = effectiveAttributesEndpoint;
        
        // Check if endpoint is already a full URL (starts with http:// or https://)
        const isFullUrl = effectiveAttributesEndpoint && (effectiveAttributesEndpoint.startsWith('http://') || effectiveAttributesEndpoint.startsWith('https://'));
        
        if (isFullUrl) {
          // If it's already a full URL, use it as-is regardless of mode
          url = effectiveAttributesEndpoint;
          console.log('Using full URL as-is:', url);
        } else {
          // Only add prefix if it's not a full URL
          if (apiMode === 'renderer') {
            const baseUrl = import.meta.env.VITE_RENDER_API_URL;
            url = baseUrl ? `${baseUrl}${effectiveAttributesEndpoint}` : effectiveAttributesEndpoint;
            console.log('Renderer mode - URL:', url, 'Base URL:', baseUrl);
          } else if (apiMode === 'localhost') {
            // For localhost, use the endpoint as-is without any prefix
            url = effectiveAttributesEndpoint;
            console.log('Localhost mode - URL:', url);
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add Bearer token from Supabase session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        // Add tenant slug if provided
        const effectiveTenantSlug = tenantSlug || tenantId;
        if (effectiveTenantSlug) {
          headers['X-Tenant-Slug'] = effectiveTenantSlug;
        }

        console.log('Fetching attributes from:', url);
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch attributes: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle different response structures
        let attributeList: string[] = [];
        if (Array.isArray(data)) {
          attributeList = data;
        } else if (data.attributes && Array.isArray(data.attributes)) {
          attributeList = data.attributes;
        } else if (data.data && Array.isArray(data.data)) {
          attributeList = data.data;
        } else if (typeof data === 'object') {
          // If it's an object, use keys as attributes
          attributeList = Object.keys(data);
        }

        // Create mapping: display name -> full attribute name
        const newAttributeMap = new Map<string, string>();
        const displayNames: string[] = [];

        attributeList.forEach((fullAttr: string) => {
          let displayName = fullAttr;
          
          // Remove "data." prefix for display
          if (fullAttr.startsWith('data.')) {
            displayName = fullAttr.replace('data.', '');
          }
          
          // Convert snake_case to Title Case for better readability
          displayName = displayName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Store mapping: display name -> full attribute name
          newAttributeMap.set(displayName, fullAttr);
          displayNames.push(displayName);
        });

        setAttributeMap(newAttributeMap);
        setAttributes(displayNames);
        console.log('✅ Fetched attributes:', attributeList);
        console.log('✅ Display names:', displayNames);
        console.log('✅ Attribute mapping:', Array.from(newAttributeMap.entries()));
      } catch (error) {
        console.error('Error fetching attributes:', error);
        toast.error('Failed to fetch attributes. Using default list.');
        const defaultMap = new Map<string, string>();
        defaultMap.set('Attr1', 'attr1');
        defaultMap.set('Source', 'source');
        defaultMap.set('Call Attempts', 'call_attempts');
        setAttributeMap(defaultMap);
        setAttributes(['Attr1', 'Source', 'Call Attempts']);
      } finally {
        setLoadingAttributes(false);
      }
    };

    fetchAttributes();
  }, [effectiveAttributesEndpoint, apiMode, tenantSlug, tenantId, entityType, session]);

  // Fetch existing rules from API on component mount
  useEffect(() => {
    if (!rulesEndpoint) return;

    const fetchRules = async () => {
      setLoadingRules(true);
      try {
        let url = rulesEndpoint;
        const isFullUrl = rulesEndpoint && (rulesEndpoint.startsWith('http://') || rulesEndpoint.startsWith('https://'));
        
        if (!isFullUrl) {
          if (apiMode === 'renderer') {
            const baseUrl = import.meta.env.VITE_RENDER_API_URL;
            url = baseUrl ? `${baseUrl}${rulesEndpoint}` : rulesEndpoint;
          } else if (apiMode === 'localhost') {
            url = rulesEndpoint;
          }
        }

        // Add entity_type query param
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}entity_type=${entityType}`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const effectiveTenantSlug = tenantSlug || tenantId;
        if (effectiveTenantSlug) {
          headers['X-Tenant-Slug'] = effectiveTenantSlug;
        }

        console.log('Fetching rules from:', url);
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch rules: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle different response structures
        let rulesList: ScoringRule[] = [];
        if (Array.isArray(data)) {
          rulesList = data;
        } else if (data.results && Array.isArray(data.results)) {
          rulesList = data.results;
        } else if (data.data && Array.isArray(data.data)) {
          rulesList = data.data;
        }

        // Convert backend rules to frontend format
        const formattedRules: ScoringRule[] = rulesList.map((rule: any) => {
          // Find display name for attribute
          const fullAttr = rule.attribute || rule.attr;
          let displayAttr = fullAttr;
          
          // Remove "data." prefix for display
          if (fullAttr.startsWith('data.')) {
            displayAttr = fullAttr.replace('data.', '');
          }
          
          // Convert snake_case to Title Case
          displayAttr = displayAttr
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          // Extract operator and value from data field
          const ruleData = rule.data || {};
          const operator = ruleData.operator || rule.operator || '==';
          const value = ruleData.value !== undefined ? String(ruleData.value) : (rule.value !== undefined ? String(rule.value) : '');

          return {
            id: rule.id,
            attribute: displayAttr, // Display name
            operator: operator,
            value: value,
            weight: rule.weight || 0,
            order: rule.order || 0,
            is_active: rule.is_active !== false,
            description: rule.description,
            entity_type: rule.entity_type || entityType,
          };
        });

        if (formattedRules.length > 0) {
          setRules(formattedRules);
          console.log('✅ Loaded', formattedRules.length, 'rules from database');
        } else {
          // If no rules found, start with one empty rule
          setRules([{
            id: `rule_${Date.now()}`,
            attribute: '',
            operator: '==',
            value: '',
            weight: 0,
          }]);
        }
      } catch (error) {
        console.error('Error fetching rules:', error);
        // Don't show error toast - just use empty rules
        // Start with one empty rule if fetch fails
        setRules([{
          id: `rule_${Date.now()}`,
          attribute: '',
          operator: '==',
          value: '',
          weight: 0,
        }]);
      } finally {
        setLoadingRules(false);
      }
    };

    // Only fetch if we have a session (user is authenticated)
    if (session?.access_token) {
      fetchRules();
    }
  }, [rulesEndpoint, apiMode, tenantSlug, tenantId, entityType, session]);

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        id: `rule_${Date.now()}_${Math.random()}`,
        attribute: '',
        operator: '==',
        value: '',
        weight: 0,
      }
    ]);
  };

  const handleSaveRule = async (rule: ScoringRule) => {
    if (!rulesEndpoint) {
      toast.error('Rules endpoint not configured');
      return;
    }

    // Validate rule
    if (!rule.attribute || !rule.operator || rule.value === '' || rule.weight === 0) {
      toast.error('Please fill all fields (attribute, operator, value, weight)');
      return;
    }

    try {
      let url = rulesEndpoint;
      const isFullUrl = rulesEndpoint && (rulesEndpoint.startsWith('http://') || rulesEndpoint.startsWith('https://'));
      
      if (!isFullUrl) {
        if (apiMode === 'renderer') {
          const baseUrl = import.meta.env.VITE_RENDER_API_URL;
          url = baseUrl ? `${baseUrl}${rulesEndpoint}` : rulesEndpoint;
        } else if (apiMode === 'localhost') {
          url = rulesEndpoint;
        }
      }

      // Ensure trailing slash
      if (!url.includes('?') && !url.endsWith('/')) {
        url = `${url}/`;
      }

      // Check if this is a new rule (no ID or temporary ID starting with "rule_")
      const isNewRule = !rule.id || (typeof rule.id === 'string' && rule.id.startsWith('rule_'));
      
      // Add ID to URL only if updating an existing rule (not a temporary ID)
      if (rule.id && !isNewRule) {
        url = `${url}${rule.id}/`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      // Get full attribute name from display name
      const fullAttributeName = attributeMap.get(rule.attribute) || rule.attribute;

      const payload = {
        entity_type: entityType,
        attribute: fullAttributeName,
        data: {
          operator: rule.operator,
          value: rule.value,
          // Allow any other fields in data - flexible structure
        },
        weight: rule.weight,
        order: rule.order || 0,
        is_active: rule.is_active !== false,
        description: rule.description || '',
      };

      // Use POST for new rules (including those with temporary IDs), PUT for existing rules
      const method = isNewRule ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save rule: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      toast.success(rule.id ? 'Rule updated successfully' : 'Rule created successfully');
      
      setEditingRuleId(null);
      
      // Re-fetch rules to get updated list
      const fetchRules = async () => {
        try {
          let fetchUrl = rulesEndpoint;
          const isFullUrl = rulesEndpoint && (rulesEndpoint.startsWith('http://') || rulesEndpoint.startsWith('https://'));
          
          if (!isFullUrl) {
            if (apiMode === 'renderer') {
              const baseUrl = import.meta.env.VITE_RENDER_API_URL;
              fetchUrl = baseUrl ? `${baseUrl}${rulesEndpoint}` : rulesEndpoint;
            } else if (apiMode === 'localhost') {
              fetchUrl = rulesEndpoint;
            }
          }

          const separator = fetchUrl.includes('?') ? '&' : '?';
          fetchUrl = `${fetchUrl}${separator}entity_type=${entityType}`;

          const fetchHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          if (session?.access_token) {
            fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }

          if (effectiveTenantSlug) {
            fetchHeaders['X-Tenant-Slug'] = effectiveTenantSlug;
          }

          const fetchResponse = await fetch(fetchUrl, {
            method: 'GET',
            headers: fetchHeaders,
          });

          if (fetchResponse.ok) {
            const responseData = await fetchResponse.json();
            let rulesList: ScoringRule[] = [];
            if (Array.isArray(responseData)) {
              rulesList = responseData;
            } else if (responseData.results && Array.isArray(responseData.results)) {
              rulesList = responseData.results;
            } else if (responseData.data && Array.isArray(responseData.data)) {
              rulesList = responseData.data;
            }

            const formattedRules: ScoringRule[] = rulesList.map((r: any) => {
              const fullAttr = r.attribute || r.attr;
              let displayAttr = fullAttr;
              if (fullAttr.startsWith('data.')) {
                displayAttr = fullAttr.replace('data.', '');
              }
              displayAttr = displayAttr
                .split('_')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              const ruleData = r.data || {};
              const operator = ruleData.operator || r.operator || '==';
              const value = ruleData.value !== undefined ? String(ruleData.value) : (r.value !== undefined ? String(r.value) : '');

              return {
                id: r.id,
                attribute: displayAttr,
                operator: operator,
                value: value,
                weight: r.weight || 0,
                order: r.order || 0,
                is_active: r.is_active !== false,
                description: r.description,
                entity_type: r.entity_type || entityType,
              };
            });

            setRules(formattedRules.length > 0 ? formattedRules : [{
              id: `rule_${Date.now()}`,
              attribute: '',
              operator: '==',
              value: '',
              weight: 0,
            }]);
          }
        } catch (error) {
          console.error('Error refreshing rules:', error);
        }
      };
      
      await fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save rule');
    }
  };

  const handleDeleteRule = async (ruleId: string | number) => {
    if (!rulesEndpoint || !ruleId) {
      toast.error('Cannot delete rule');
      return;
    }

    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      let url = rulesEndpoint;
      const isFullUrl = rulesEndpoint && (rulesEndpoint.startsWith('http://') || rulesEndpoint.startsWith('https://'));
      
      if (!isFullUrl) {
        if (apiMode === 'renderer') {
          const baseUrl = import.meta.env.VITE_RENDER_API_URL;
          url = baseUrl ? `${baseUrl}${rulesEndpoint}` : rulesEndpoint;
        } else if (apiMode === 'localhost') {
          url = rulesEndpoint;
        }
      }

      if (!url.endsWith('/')) {
        url = `${url}/`;
      }
      url = `${url}${ruleId}/`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete rule: ${response.status}`);
      }

      toast.success('Rule deleted successfully');
      // Remove from local state
      setRules(rules.filter(rule => rule.id !== ruleId));
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete rule');
    }
  };

  const handleRemoveRule = (ruleToRemove: ScoringRule) => {
    // This is for canceling new rules (rules without database ID)
    // Check if it's a temporary ID (string starting with "rule_") or no ID
    const isNewRule = !ruleToRemove.id || (typeof ruleToRemove.id === 'string' && ruleToRemove.id.startsWith('rule_'));
    
    if (isNewRule) {
      // Remove from local state only (new rule not saved yet)
      if (rules.length === 1) {
        toast.error('At least one rule is required');
        return;
      }
      
      // Filter out the rule by comparing IDs
      // Since new rules have unique temporary IDs, we can filter by ID
      const ruleIdToRemove = ruleToRemove.id;
      const filteredRules = rules.filter(rule => {
        // Compare IDs - handle both undefined and defined cases
        if (ruleIdToRemove === undefined && rule.id === undefined) {
          // If both are undefined, compare by object reference as fallback
          return rule !== ruleToRemove;
        }
        return rule.id !== ruleIdToRemove;
      });
      
      if (filteredRules.length === rules.length) {
        // Rule wasn't removed - try object reference comparison as fallback
        console.warn('Rule not found by ID, trying object reference comparison');
        setRules(rules.filter(rule => rule !== ruleToRemove));
      } else {
        setRules(filteredRules);
      }
      
      toast.success('Rule removed');
    } else {
      // This shouldn't happen - existing rules use handleDeleteRule
      console.warn('handleRemoveRule called with existing rule ID, using handleDeleteRule instead');
      if (ruleToRemove.id) {
        handleDeleteRule(ruleToRemove.id);
      }
    }
  };

  const handleRuleChange = (ruleToUpdate: ScoringRule, field: keyof ScoringRule, value: string | number) => {
    // Update rule by matching the rule object itself (works for both new and existing rules)
    setRules(rules.map(rule => 
      rule === ruleToUpdate || rule.id === ruleToUpdate.id ? { ...rule, [field]: value } : rule
    ));
  };

  const handleCalculate = async () => {
    if (!scoringEndpoint) {
      toast.error('Scoring endpoint not configured');
      return;
    }

    // Check if there are unsaved rules (rules with temporary IDs starting with "rule_")
    const unsavedRules = rules.filter(rule => !rule.id || (typeof rule.id === 'string' && rule.id.startsWith('rule_')));
    if (unsavedRules.length > 0) {
      toast.error('Please save all rules before running the scoring job');
      return;
    }

    // Validate rules
    const invalidRules = rules.filter(rule => 
      !rule.attribute || !rule.operator || rule.value === '' || rule.weight === 0
    );

    if (invalidRules.length > 0) {
      toast.error('Please fill all fields for all rules');
      return;
    }

    // Only trigger the background job - rules should already be saved individually
    setCalculating(true);
    try {
      let url = scoringEndpoint;
      
      // Check if endpoint is already a full URL (starts with http:// or https://)
      const isFullUrl = scoringEndpoint && (scoringEndpoint.startsWith('http://') || scoringEndpoint.startsWith('https://'));
      
      if (isFullUrl) {
        // If it's already a full URL, use it as-is regardless of mode
        url = scoringEndpoint;
        console.log('Using full URL as-is:', url);
      } else {
        // Only add prefix if it's not a full URL
        if (apiMode === 'renderer') {
          const baseUrl = import.meta.env.VITE_RENDER_API_URL;
          url = baseUrl ? `${baseUrl}${scoringEndpoint}` : scoringEndpoint;
          console.log('Renderer mode - URL:', url, 'Base URL:', baseUrl);
        } else if (apiMode === 'localhost') {
          // For localhost, use the endpoint as-is without any prefix
          url = scoringEndpoint;
          console.log('Localhost mode - URL:', url);
        }
      }

      // Ensure trailing slash for Django compatibility (only if not a full URL with query params)
      if (!url.includes('?') && !url.endsWith('/')) {
        url = `${url}/`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Bearer token from Supabase session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Add tenant slug if provided
      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      // Prepare payload - send empty rules array since rules are already saved in ScoringRule table
      // The backend will read rules from ScoringRule table instead
      const payload = {
        rules: []  // Rules are already saved individually, backend will read from ScoringRule table
      };

      console.log('Calculating score with payload:', JSON.stringify(payload, null, 2));
      console.log('Scoring endpoint:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Scoring failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Handle different response structures
      let calculatedValue: number | null = null;
      let successMessage = '';
      
      // Check for success response with message
      if (data.success === true) {
        successMessage = data.message || 'Scoring completed successfully';
        
        // Try to extract score value from stats or other fields
        if (data.stats?.total_score_added !== undefined) {
          calculatedValue = data.stats.total_score_added;
        } else if (data.stats?.total_leads !== undefined) {
          // Use total_leads as a fallback if no score available
          calculatedValue = data.stats.total_leads;
        } else if (data.pyro_value !== undefined) {
          calculatedValue = data.pyro_value;
        } else if (data.score !== undefined) {
          calculatedValue = data.score;
        } else if (data.value !== undefined) {
          calculatedValue = data.value;
        } else if (data.data?.pyro_value !== undefined) {
          calculatedValue = data.data.pyro_value;
        }
        
        // Show success message with stats if available
        if (data.stats) {
          const statsMsg = `Total: ${data.stats.total_leads || 0}, Updated: ${data.stats.updated_leads || 0}, Score Added: ${data.stats.total_score_added || 0}`;
          toast.success(`${successMessage} - ${statsMsg}`);
        } else {
          toast.success(successMessage);
        }
        
        if (calculatedValue !== null) {
          setPyroValue(calculatedValue);
        }
      } else if (typeof data === 'number') {
        // Direct number response
        calculatedValue = data;
        setPyroValue(calculatedValue);
        toast.success(`Score calculated: ${calculatedValue}`);
      } else if (data.pyro_value !== undefined) {
        calculatedValue = data.pyro_value;
        setPyroValue(calculatedValue);
        toast.success(`Score calculated: ${calculatedValue}`);
      } else if (data.score !== undefined) {
        calculatedValue = data.score;
        setPyroValue(calculatedValue);
        toast.success(`Score calculated: ${calculatedValue}`);
      } else if (data.value !== undefined) {
        calculatedValue = data.value;
        setPyroValue(calculatedValue);
        toast.success(`Score calculated: ${calculatedValue}`);
      } else if (data.data?.pyro_value !== undefined) {
        calculatedValue = data.data.pyro_value;
        setPyroValue(calculatedValue);
        toast.success(`Score calculated: ${calculatedValue}`);
      } else {
        // If we have a message but no success flag, still show success
        if (data.message) {
          toast.success(data.message);
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      console.error('Error calculating score:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to calculate score');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <Card className="border border-gray-200 shadow-sm">
        {(showTitle || showDescription) && (
          <CardHeader className="pb-4">
            {showTitle && (
              <h5 className="text-gray-900">{title}</h5>
            )}
            {showDescription && description && (
              <p className="text-gray-600 mt-2">{description}</p>
            )}
          </CardHeader>
        )}
        <CardContent className="space-y-6">
          {/* Scoring Rules Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-body-sm-semibold text-gray-900 w-[30%]">attr.</TableHead>
                  <TableHead className="text-body-sm-semibold text-gray-900 w-[20%]">operator</TableHead>
                  <TableHead className="text-body-sm-semibold text-gray-900 w-[30%]">value.</TableHead>
                  <TableHead className="text-body-sm-semibold text-gray-900 w-[15%]">weight</TableHead>
                  <TableHead className="text-body-sm-semibold text-gray-900 w-[10%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule, index) => {
                  // Check if this is a new rule (no ID or temporary ID starting with "rule_")
                  const isNewRule = !rule.id || (typeof rule.id === 'string' && rule.id.startsWith('rule_'));
                  // Fields should be enabled for new rules, or for existing rules when editing
                  const fieldsDisabled = !isNewRule && editingRuleId !== rule.id;
                  
                  return (
                  <TableRow key={rule.id || `temp-${index}`} className="hover:bg-gray-50">
                    <TableCell>
                      <Select
                        value={rule.attribute}
                        onValueChange={(value) => handleRuleChange(rule, 'attribute', value)}
                        disabled={loadingAttributes || fieldsDisabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          {attributes.map((attr) => (
                            <SelectItem key={attr} value={attr}>
                              {attr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rule.operator}
                        onValueChange={(value) => handleRuleChange(rule, 'operator', value)}
                        disabled={fieldsDisabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={rule.value}
                        onChange={(e) => handleRuleChange(rule, 'value', e.target.value)}
                        placeholder="Enter value"
                        className="w-full"
                        disabled={fieldsDisabled}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={rule.weight}
                        onChange={(e) => handleRuleChange(rule, 'weight', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full"
                        disabled={fieldsDisabled}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isNewRule ? (
                          // New rule (no ID or temporary ID): Always show Save and Cancel, fields enabled
                          <>
                            <CustomButton
                              variant="outline"
                              size="sm"
                              icon={<Save className="h-4 w-4" />}
                              onClick={() => handleSaveRule(rule)}
                              className="hover:bg-green-50 hover:text-green-700"
                              title="Save new rule"
                            />
                            <CustomButton
                              variant="outline"
                              size="sm"
                              icon={<X className="h-4 w-4" />}
                              onClick={() => {
                                // Use index to reliably remove the rule
                                if (rules.length === 1) {
                                  toast.error('At least one rule is required');
                                  return;
                                }
                                setRules(rules.filter((_, i) => i !== index));
                                toast.success('Rule removed');
                              }}
                              disabled={rules.length === 1}
                              className="hover:bg-gray-50"
                              title="Cancel (remove rule)"
                            />
                          </>
                        ) : (
                          // Existing rule (has real database ID)
                          editingRuleId === rule.id ? (
                            // Editing mode: Show Save and Cancel
                            <>
                              <CustomButton
                                variant="outline"
                                size="sm"
                                icon={<Save className="h-4 w-4" />}
                                onClick={() => handleSaveRule(rule)}
                                className="hover:bg-green-50 hover:text-green-700"
                                title="Save rule"
                              />
                              <CustomButton
                                variant="outline"
                                size="sm"
                                icon={<X className="h-4 w-4" />}
                                onClick={() => setEditingRuleId(null)}
                                className="hover:bg-gray-50"
                                title="Cancel editing"
                              />
                            </>
                          ) : (
                            // Not editing: Show Edit and Delete, fields disabled
                            <>
                              <CustomButton
                                variant="outline"
                                size="sm"
                                icon={<Edit2 className="h-4 w-4" />}
                                onClick={() => setEditingRuleId(rule.id || null)}
                                className="hover:bg-blue-50 hover:text-blue-700"
                                title="Edit rule"
                              />
                              <CustomButton
                                variant="outline"
                                size="sm"
                                icon={<Trash2 className="h-4 w-4" />}
                                onClick={() => handleDeleteRule(rule.id!)}
                                className="hover:bg-red-50 hover:text-red-700"
                                title="Delete rule"
                              />
                            </>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Add Rule Button */}
          <div className="flex items-center gap-4">
            <CustomButton
              variant="outline"
              icon={<Plus className="h-4 w-4" />}
              onClick={handleAddRule}
              className="hover:bg-muted hover:text-foreground"
            >
              Add Rule
            </CustomButton>
          </div>

          {/* Calculate Button and Result */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <CustomButton
                type="button"
                variant="outline"
                icon={!calculating ? <Play className="h-4 w-4" /> : undefined}
                onClick={handleCalculate}
                disabled={calculating}
                loading={calculating}
                className="hover:bg-muted hover:text-foreground text-body-lg-semibold px-6"
              >
                Run
              </CustomButton>
            </div>
            {pyroValue !== null && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-body-lg-semibold px-4 py-2 bg-gray-50 text-gray-900 border-gray-300">
                  pyro_value = {pyroValue}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

