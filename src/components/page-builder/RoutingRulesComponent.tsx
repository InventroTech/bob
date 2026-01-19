import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Trash2, ChevronDown, X, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { routingRulesService, membershipService } from '@/lib/api';
import type { RoutingRule, QueueType } from '@/types/userSettings';
import type { RoutingFilterField, RoutingRulesConfigData } from '@/component-config/RoutingRulesConfig';

const QUEUE_TYPES: QueueType[] = ['ticket', 'lead'];

// Helper to format conditions in a user-readable way
const formatConditionsReadable = (conditions: Record<string, any> | null | undefined): React.ReactNode => {
  if (!conditions) return <span className="text-gray-500 italic">No conditions</span>;
  
  // Handle filters array format: { filters: [{ field, op, value }] }
  if (conditions.filters && Array.isArray(conditions.filters)) {
    if (conditions.filters.length === 0) {
      return <span className="text-gray-500 italic">No filters</span>;
    }
    
    return (
      <div className="space-y-1">
        {conditions.filters.map((filter: any, idx: number) => {
          const field = filter.field || 'unknown';
          const op = filter.op || '=';
          let value = filter.value;
          
          // Format the operator
          const opLabel = op === 'in' ? 'is one of' 
            : op === 'eq' || op === '=' ? 'is' 
            : op === 'neq' || op === '!=' ? 'is not'
            : op === 'contains' ? 'contains'
            : op === 'gte' || op === '>=' ? '>='
            : op === 'lte' || op === '<=' ? '<='
            : op;
          
          // Format the value
          let valueDisplay: React.ReactNode;
          if (Array.isArray(value)) {
            valueDisplay = (
              <span className="inline-flex flex-wrap gap-1">
                {value.map((v: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal bg-gray-50 text-gray-900 border-gray-300">
                    {String(v)}
                  </Badge>
                ))}
              </span>
            );
          } else {
            valueDisplay = <Badge variant="outline" className="text-xs font-normal bg-gray-50 text-gray-900 border-gray-300">{String(value)}</Badge>;
          }
          
          return (
            <div key={idx} className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-medium capitalize text-gray-900">{field.replace(/_/g, ' ')}</span>
              <span className="text-gray-500">{opLabel}</span>
              {valueDisplay}
            </div>
          );
        })}
      </div>
    );
  }
  
  // Handle simple key-value format: { state: "value", poster: "value" }
  const entries = Object.entries(conditions).filter(([_, v]) => v !== null && v !== undefined && v !== '');
  
  if (entries.length === 0) {
    return <span className="text-gray-500 italic">No conditions</span>;
  }
  
  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => {
        let valueDisplay: React.ReactNode;
        
        if (Array.isArray(value)) {
          valueDisplay = (
            <span className="inline-flex flex-wrap gap-1">
              {value.map((v: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs font-normal bg-gray-50 text-gray-900 border-gray-300">
                  {String(v)}
                </Badge>
              ))}
            </span>
          );
        } else if (typeof value === 'string' && value.includes(',')) {
          // Comma-separated values
          valueDisplay = (
            <span className="inline-flex flex-wrap gap-1">
              {value.split(',').map((v: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs font-normal bg-gray-50 text-gray-900 border-gray-300">
                  {v.trim()}
                </Badge>
              ))}
            </span>
          );
        } else {
          valueDisplay = <Badge variant="outline" className="text-xs font-normal bg-gray-50 text-gray-900 border-gray-300">{String(value)}</Badge>;
        }
        
        return (
          <div key={key} className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-medium capitalize text-gray-900">{key.replace(/_/g, ' ')}</span>
            <span className="text-gray-500">is</span>
            {valueDisplay}
          </div>
        );
      })}
    </div>
  );
};

// Default filter fields if none are configured
const DEFAULT_FILTER_FIELDS: RoutingFilterField[] = [
  {
    key: 'state',
    label: 'State filter (optional)',
    type: 'text',
    placeholder: 'e.g. Tamil Nadu',
    helpText: '',
  },
  {
    key: 'poster',
    label: 'Poster filter (optional)',
    type: 'text',
    placeholder: 'e.g. Facebook or Facebook,Google',
    helpText: 'Enter comma-separated values for multiple matches',
  },
];

interface RoutingUser {
  id: string;  // This is the user_id from the API
  name: string;
  email: string;
  role_id: string;
  created_at: string;
  role: {
    name: string;
  } | null;
}

interface RoutingRulesComponentProps {
  config?: RoutingRulesConfigData;
}

const RoutingRulesComponent: React.FC<RoutingRulesComponentProps> = ({ config }) => {
  const { user } = useAuth();
  const { customRole, tenantId } = useTenant();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [users, setUsers] = useState<RoutingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [formUserId, setFormUserId] = useState('');
  const [formQueueType, setFormQueueType] = useState<QueueType>('ticket');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formActive, setFormActive] = useState(true);

  // Get filter fields from config or use defaults
  const filterFields = config?.filterFields?.length ? config.filterFields : DEFAULT_FILTER_FIELDS;
  const componentTitle = config?.title || 'Routing Rules';
  const componentDescription = config?.description || 'Configure which tickets and leads each agent should receive. Select a user and set filters.';

  // Helper to get/set form values for dynamic fields
  const getFieldValue = (key: string): string => {
    const val = formValues[key];
    // Handle array values (for multiselect) - join with comma
    if (Array.isArray(val)) return val.join(',');
    return val || '';
  };
  
  const getFieldArrayValue = (key: string): string[] => {
    const val = formValues[key];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val) return val.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };
  
  const setFieldValue = (key: string, value: string | string[]) => {
    // Convert arrays to comma-separated strings to match Record<string, string> type
    const stringValue = Array.isArray(value) ? value.join(',') : value;
    setFormValues(prev => ({ ...prev, [key]: stringValue }));
  };
  
  const toggleMultiSelectValue = (key: string, value: string) => {
    const currentValues = getFieldArrayValue(key);
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setFieldValue(key, newValues);
  };

  const isGM = customRole === 'GM' || customRole === 'gm' || customRole?.toUpperCase() === 'GM';

  // Fetch users using central membershipService
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersData = await membershipService.getUsers();
      // Filter out users with temp IDs (inactive users without real user_id)
      const activeUsers = usersData.filter(user => !user.id.startsWith('temp-'));
      setUsers(activeUsers);
      if (activeUsers.length === 0) {
        toast.info('No users found. The list is empty.');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoading(true);
        const data = await routingRulesService.getAll();
        setRules(data);
      } catch (error: any) {
        console.error('[RoutingRules] Failed to fetch rules', error);
        toast.error(error?.message || 'Failed to fetch routing rules');
      } finally {
        setLoading(false);
      }
    };

    if (user && isGM) {
      fetchRules();
      fetchUsers();
    } else if (user && !isGM) {
      setLoading(false);
      setLoadingUsers(false);
    }
  }, [user, isGM, tenantId]);

  const buildConditions = () => {
    const filters: any[] = [];

    filterFields.forEach((field) => {
      const value = getFieldValue(field.key).trim();
      if (!value) return;

      // Check if value contains commas (multiple values)
      const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length === 1) {
        filters.push({
          field: field.key,
          op: 'equals',
          value: parts[0],
        });
      } else if (parts.length > 1) {
        filters.push({
          field: field.key,
          op: 'in',
          value: parts,
        });
      }
    });

    return filters.length ? { filters } : {};
  };

  const handleSave = async () => {
    if (!formUserId.trim()) {
      toast.error('Please select a user');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        user_id: formUserId.trim(),
        queue_type: formQueueType,
        is_active: formActive,
        conditions: buildConditions(),
      };

      const saved = await routingRulesService.upsert(payload);
      setRules((prev) => {
        const idx = prev.findIndex(
          (r) => r.id === saved.id || (r.user_id === saved.user_id && r.queue_type === saved.queue_type),
        );
        if (idx === -1) {
          return [...prev, saved];
        }
        const clone = [...prev];
        clone[idx] = saved;
        return clone;
      });

      // Reset form
      setFormUserId('');
      setFormValues({});
      setFormActive(true);
      setFormQueueType('ticket');

      toast.success('Routing rule saved');
    } catch (error: any) {
      console.error('[RoutingRules] Failed to save rule', error);
      toast.error(error?.message || 'Failed to save routing rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) {
      return;
    }
    try {
      await routingRulesService.delete(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success('Routing rule deleted');
    } catch (error: any) {
      console.error('[RoutingRules] Failed to delete rule', error);
      toast.error(error?.message || 'Failed to delete routing rule');
    }
  };

  if (!user) {
    return null;
  }

  if (!isGM) {
    return (
      <Card className="bg-white border-0 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900">{componentTitle}</CardTitle>
          <p className="text-gray-600 mt-2">You need GM role to manage routing rules.</p>
        </CardHeader>
      </Card>
    );
  }

  // Find selected user for display
  const selectedUser = users.find(u => u.id === formUserId);

  return (
    <div className="w-full space-y-6">
      <style>{`
        /* Remove margin-top from space-y-6, keep margin-bottom */
        .space-y-6 > :not([hidden]) ~ :not([hidden]) {
          margin-top: 0 !important;
        }
        /* Remove borders from Card components (fallback) */
        .w-full.space-y-6 > div.bg-white.border-0 {
          border: none !important;
          box-shadow: none !important;
        }
        /* Override any default theme colors to ensure pure black/white/gray */
        [data-radix-select-item] {
          background-color: white !important;
          color: rgb(17 24 39) !important;
        }
        [data-radix-select-item][data-highlighted],
        [data-radix-select-item]:hover,
        [data-radix-select-item]:focus {
          background-color: rgb(249 250 251) !important;
          color: rgb(17 24 39) !important;
        }
        [data-radix-select-item][data-state="checked"] {
          background-color: rgb(17 24 39) !important;
          color: rgb(255 255 255) !important;
        }
        [data-radix-select-content] {
          background-color: white !important;
          border-color: rgb(229 231 235) !important;
        }
        [data-radix-popover-content] {
          background-color: white !important;
          border-color: rgb(229 231 235) !important;
        }
        /* Ensure all select items have white background by default */
        button[role="option"] {
          background-color: white !important;
        }
        button[role="option"]:hover,
        button[role="option"]:focus {
          background-color: rgb(249 250 251) !important;
        }
      `}</style>
      {/* Create/Edit Rule Card */}
      <Card className="bg-white border-0 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900">{componentTitle}</CardTitle>
          <p className="text-gray-600 mt-2">{componentDescription}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User and Queue Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-gray-900">Select User</Label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">Loading users...</span>
                </div>
              ) : (
                <Select value={formUserId} onValueChange={setFormUserId}>
                  <SelectTrigger className="border-gray-300 focus:ring-gray-400 focus:ring-offset-0">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {users
                      .filter(user => user.name && user.email && user.id)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-gray-900 hover:bg-gray-50 focus:bg-gray-50">
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-gray-900">Queue Type</Label>
              <Select value={formQueueType} onValueChange={(v) => setFormQueueType(v as QueueType)}>
                <SelectTrigger className="border-gray-300 focus:ring-gray-400 focus:ring-offset-0">
                  <SelectValue placeholder="Select queue type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {QUEUE_TYPES.map((qt) => (
                    <SelectItem key={qt} value={qt} className="text-gray-900 hover:bg-gray-50 focus:bg-gray-50">
                      {qt === 'ticket' ? 'Support Tickets' : 'Leads'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Dynamic filter fields based on config */}
          {filterFields.length > 0 && (
            <div className="py-4 bg-white">
              <h4 className="text-gray-900 mb-4">Filter Conditions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-gray-700">{field.label}</Label>
                    {field.type === 'multiselect' && field.options?.length ? (
                      // Multi-select dropdown with checkboxes
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-gray-400 focus:ring-offset-0"
                          >
                            {getFieldArrayValue(field.key).length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[90%]">
                                {getFieldArrayValue(field.key).length <= 2 ? (
                                  getFieldArrayValue(field.key).map((val) => {
                                    const opt = field.options?.find(o => o.value === val);
                                    return (
                                      <Badge key={val} variant="outline" className="text-xs bg-gray-100 text-gray-900 border-gray-300">
                                        {opt?.label || val}
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <span className="text-sm text-gray-700">
                                    {getFieldArrayValue(field.key).length} selected
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">
                                {field.placeholder || `Select ${field.label}`}
                              </span>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-white border-gray-200" align="start">
                          <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                            {getFieldArrayValue(field.key).length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-gray-500 mb-1 hover:bg-gray-100"
                                onClick={() => setFieldValue(field.key, [])}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Clear all
                              </Button>
                            )}
                            {field.options
                              .filter((opt) => opt.value && opt.value.trim() !== '')
                              .map((opt) => {
                                const isChecked = getFieldArrayValue(field.key).includes(opt.value);
                                return (
                                  <div
                                    key={opt.value}
                                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                                    onClick={() => toggleMultiSelectValue(field.key, opt.value)}
                                  >
                                    <Checkbox
                                      id={`${field.key}-${opt.value}`}
                                      checked={isChecked}
                                      onCheckedChange={() => toggleMultiSelectValue(field.key, opt.value)}
                                      className="data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                                    />
                                    <label
                                      htmlFor={`${field.key}-${opt.value}`}
                                      className="text-sm font-medium leading-none cursor-pointer flex-1 text-gray-900"
                                    >
                                      {opt.label || opt.value}
                                    </label>
                                  </div>
                                );
                              })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : field.type === 'select' && field.options?.length ? (
                      // Single select dropdown
                      <Select
                        value={getFieldValue(field.key)}
                        onValueChange={(v) => setFieldValue(field.key, v)}
                      >
                        <SelectTrigger className="border-gray-300 focus:ring-gray-400 focus:ring-offset-0">
                          <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {field.options
                            .filter((opt) => opt.value && opt.value.trim() !== '')
                            .map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-gray-900 hover:bg-gray-50 focus:bg-gray-50">
                                {opt.label || opt.value}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      // Text input
                      <Input
                        placeholder={field.placeholder || ''}
                        value={getFieldValue(field.key)}
                        onChange={(e) => setFieldValue(field.key, e.target.value)}
                        className="border-gray-300 focus:ring-gray-400 focus:ring-offset-0"
                      />
                    )}
                    {field.helpText && (
                      <p className="text-xs text-gray-500">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active toggle and Save button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Switch 
                id="active" 
                checked={formActive} 
                onCheckedChange={setFormActive}
                className="data-[state=checked]:bg-gray-900"
              />
              <Label htmlFor="active" className="text-gray-700">Rule is active</Label>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formUserId}
              className="bg-gray-900 text-white hover:bg-gray-800 font-semibold px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Rule
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Rules Card */}
      <Card className="bg-white border-0 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900">Existing Rules</CardTitle>
          <p className="text-gray-600 mt-2">Current routing rules configured for this tenant.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-gray-600" />
              <span className="text-gray-600">Loading routing rules…</span>
            </div>
          ) : rules.length === 0 ? (
            <p className="text-body-sm text-gray-500 py-4">No routing rules configured yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">User</TableHead>
                    <TableHead className="font-semibold text-gray-900">Queue</TableHead>
                    <TableHead className="font-semibold text-gray-900">Active</TableHead>
                    <TableHead className="font-semibold text-gray-900">Conditions</TableHead>
                    <TableHead className="font-semibold text-gray-900 w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const ruleUser = users.find(u => u.id === rule.user_id);
                    return (
                      <TableRow key={rule.id} className="hover:bg-gray-50">
                        <TableCell>
                          {ruleUser ? (
                            <div>
                              <div className="font-medium text-gray-900">{ruleUser.name}</div>
                              <div className="text-xs text-gray-500">{ruleUser.email}</div>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-gray-700">{rule.user_id}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {rule.queue_type === 'ticket' ? 'Support Tickets' : 'Leads'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={rule.is_active 
                              ? "bg-gray-900 text-white border-gray-900" 
                              : "bg-gray-50 text-gray-500 border-gray-300"
                            }
                          >
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xl">
                            {formatConditionsReadable(rule.conditions)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
                            aria-label="Delete rule"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoutingRulesComponent;
