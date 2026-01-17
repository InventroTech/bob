import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

export interface ScoringRule {
  id: string;
  attribute: string;
  operator: string;
  value: string;
  weight: number;
}

export interface DynamicScoringComponentConfig {
  title?: string;
  description?: string;
  
  // API Configuration
  attributesEndpoint?: string; // GET endpoint to fetch available attributes
  scoringEndpoint?: string; // POST endpoint to calculate score
  apiMode?: 'localhost' | 'renderer';
  tenantSlug?: string;
  
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
  
  const {
    title = 'Dynamic Scoring',
    description = 'Configure scoring rules and calculate scores',
    attributesEndpoint = '',
    scoringEndpoint = '',
    apiMode = 'renderer',
    tenantSlug,
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
  const [calculating, setCalculating] = useState(false);
  const [pyroValue, setPyroValue] = useState<number | null>(null);

  // Fetch attributes from API
  useEffect(() => {
    if (!attributesEndpoint) {
      // Use default attributes if no endpoint provided
      const defaultMap = new Map<string, string>();
      defaultMap.set('Attr1', 'attr1');
      defaultMap.set('Source', 'source');
      defaultMap.set('Call Attempts', 'call_attempts');
      setAttributeMap(defaultMap);
      setAttributes(['Attr1', 'Source', 'Call Attempts']);
      return;
    }

    const fetchAttributes = async () => {
      setLoadingAttributes(true);
      try {
        let url = attributesEndpoint;
        
        // Check if endpoint is already a full URL (starts with http:// or https://)
        const isFullUrl = attributesEndpoint && (attributesEndpoint.startsWith('http://') || attributesEndpoint.startsWith('https://'));
        
        if (isFullUrl) {
          // If it's already a full URL, use it as-is regardless of mode
          url = attributesEndpoint;
          console.log('Using full URL as-is:', url);
        } else {
          // Only add prefix if it's not a full URL
          if (apiMode === 'renderer') {
            const baseUrl = import.meta.env.VITE_RENDER_API_URL;
            url = baseUrl ? `${baseUrl}${attributesEndpoint}` : attributesEndpoint;
            console.log('Renderer mode - URL:', url, 'Base URL:', baseUrl);
          } else if (apiMode === 'localhost') {
            // For localhost, use the endpoint as-is without any prefix
            url = attributesEndpoint;
            console.log('Localhost mode - URL:', url);
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add Bearer token from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
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
  }, [attributesEndpoint, apiMode, tenantSlug, tenantId]);

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

  const handleRemoveRule = (id: string) => {
    if (rules.length === 1) {
      toast.error('At least one rule is required');
      return;
    }
    setRules(rules.filter(rule => rule.id !== id));
  };

  const handleRuleChange = (id: string, field: keyof ScoringRule, value: string | number) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const handleCalculate = async () => {
    if (!scoringEndpoint) {
      toast.error('Scoring endpoint not configured');
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Add tenant slug if provided
      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      // Prepare payload with all rule fields
      const payload = {
        rules: rules.map(rule => {
          // Get full attribute name from display name using the mapping
          const fullAttributeName = attributeMap.get(rule.attribute) || rule.attribute;
          
          // Convert value to number if it's a numeric string, otherwise keep as string
          let processedValue: string | number = rule.value;
          if (rule.operator !== 'contains' && rule.operator !== 'startsWith' && rule.operator !== 'endsWith') {
            // For comparison operators, try to parse as number
            const numValue = parseFloat(rule.value);
            if (!isNaN(numValue) && rule.value.trim() !== '') {
              processedValue = numValue;
            }
          }
          
          return {
            attr: fullAttributeName,      // Full attribute name (e.g., "data.affiliated_party")
            operator: rule.operator,      // Comparison operator
            value: processedValue,        // Value to compare (string or number)
            weight: rule.weight,          // Score/weight for this rule
          };
        })
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
              <CardTitle className="text-gray-900">{title}</CardTitle>
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
                  <TableHead className="text-body-sm-semibold text-gray-900 w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule, index) => (
                  <TableRow key={rule.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Select
                        value={rule.attribute}
                        onValueChange={(value) => handleRuleChange(rule.id, 'attribute', value)}
                        disabled={loadingAttributes}
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
                        onValueChange={(value) => handleRuleChange(rule.id, 'operator', value)}
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
                        onChange={(e) => handleRuleChange(rule.id, 'value', e.target.value)}
                        placeholder="Enter value"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={rule.weight}
                        onChange={(e) => handleRuleChange(rule.id, 'weight', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRule(rule.id)}
                        disabled={rules.length === 1}
                        className="hover:bg-muted hover:text-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add Rule Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleAddRule}
              className="hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          {/* Calculate Button and Result */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCalculate}
                disabled={calculating}
                className="hover:bg-muted hover:text-foreground text-body-lg-semibold px-6"
              >
                {calculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run
                  </>
                )}
              </Button>
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

