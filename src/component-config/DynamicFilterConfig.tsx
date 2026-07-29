import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date_gte' | 'date_lte' | 'date_exact' | 'date_range' | 'date_time_range' | 'number_gte' | 'number_lte' | 'search' | 'exact' | 'icontains' | 'startswith' | 'endswith' | 'gt' | 'lt' | 'in';
  accessor?: string; // Field to filter on (defaults to key if not provided)
  lookup?: string; // Custom Django ORM lookup (e.g., 'icontains', 'exact', 'gte', etc.)
  options?: FilterOption[]; // For select type filters (manual options)
  /** When set, dropdown options are fetched from this API. Use with optionsDisplayKey and optionsValueKey. */
  optionsApiUrl?: string;
  /** Key in each API response item for the display label in the dropdown (e.g. "name"). */
  optionsDisplayKey?: string;
  /** Key in each API response item for the value sent in filter/query (e.g. "id"). */
  optionsValueKey?: string;
  /** When true (and using API options), prepend a NULL/empty option with configurable label and value. */
  optionsIncludeNull?: boolean;
  /** Label for the NULL option (e.g. "Unassigned", "None"). Used when optionsIncludeNull is true. */
  optionsNullLabel?: string;
  /** Value for the NULL option sent in filter/query (e.g. "", "null"). Used when optionsIncludeNull is true. */
  optionsNullValue?: string;
  /** Label for the start date field in Date Range filter (e.g. "From", "Start date"). */
  dateRangeStartLabel?: string;
  /** Label for the end date field in Date Range filter (e.g. "To", "End date"). */
  dateRangeEndLabel?: string;
  placeholder?: string; // For text and search filters
  /** Dispatch mobile sheet: control type (Page Builder → Dispatch Card List). */
  dispatchUi?: 'text' | 'date' | 'floatingDate' | 'toggle' | 'segment' | 'chip';
  /** Group fields on one row (e.g. `row_start` = Start Date + toggles). */
  dispatchRow?: string;
  dispatchWidth?: 'full' | 'half';
}

interface DynamicFilterConfigProps {
  localConfig: {
    apiEndpoint: string;
    showFilters: boolean;
  };
  localFilters: FilterConfig[];
  numFilters: number;
  /** Dispatch Card List: show mobile layout fields (UI type, row group). */
  showDispatchMobileUi?: boolean;
  handleInputChange: (field: string, value: string | number | boolean) => void;
  handleFilterCountChange: (count: number) => void;
  handleFilterDelete: (index: number) => void;
  handleFilterFieldChange: (index: number, field: keyof FilterConfig, value: string | FilterOption[] | boolean | undefined) => void;
  /** When switching options source (manual vs API), update all related fields in one go. */
  handleFilterOptionsSourceChange?: (index: number, source: 'manual' | 'api') => void;
  handleAddFilterOption: (filterIndex: number) => void;
  handleRemoveFilterOption: (filterIndex: number, optionIndex: number) => void;
  handleFilterOptionChange: (filterIndex: number, optionIndex: number, field: keyof FilterOption, value: string) => void;
}

export const DynamicFilterConfig: React.FC<DynamicFilterConfigProps> = ({
  localConfig,
  localFilters,
  numFilters,
  showDispatchMobileUi,
  handleInputChange,
  handleFilterCountChange,
  handleFilterDelete,
  handleFilterFieldChange,
  handleFilterOptionsSourceChange,
  handleAddFilterOption,
  handleRemoveFilterOption,
  handleFilterOptionChange
}) => {
  const [directFetchModes, setDirectFetchModes] = useState<Set<number>>(new Set());
  const [directFetchInputs, setDirectFetchInputs] = useState<Record<number, string>>({});
  const [directFetchLoading, setDirectFetchLoading] = useState<Record<number, boolean>>({});
  const [directFetchError, setDirectFetchError] = useState<Record<number, string>>({});
  const [directFetchSuccess, setDirectFetchSuccess] = useState<Record<number, string>>({});

  const handleDirectFetch = async (filterIndex: number) => {
    if (directFetchLoading[filterIndex]) return;

    const raw = (directFetchInputs[filterIndex] || '').trim();
    const field = raw.startsWith('data.') ? raw.slice(5) : raw.trim();
    if (!field) {
      setDirectFetchError(prev => ({ ...prev, [filterIndex]: 'Enter a field name, e.g. data.engineer or just engineer' }));
      return;
    }

    const entityTypeMatch = (localConfig.apiEndpoint || '').match(/[?&]entity_type=([^&]+)/);
    const entityType = entityTypeMatch ? decodeURIComponent(entityTypeMatch[1]) : '';
    if (!entityType) {
      setDirectFetchError(prev => ({ ...prev, [filterIndex]: 'No entity_type found in the API Endpoint configured above. Add ?entity_type=your_type to it first.' }));
      return;
    }

    setDirectFetchLoading(prev => ({ ...prev, [filterIndex]: true }));
    setDirectFetchError(prev => ({ ...prev, [filterIndex]: '' }));
    setDirectFetchSuccess(prev => ({ ...prev, [filterIndex]: '' }));
    try {
      const response = await apiClient.get('/crm-records/records/distinct-values/', {
        params: { entity_type: entityType, field },
      });
      const rawValues = response.data?.values;
      const values: string[] = Array.isArray(rawValues) && rawValues.length > 0
        ? rawValues
        : (response.data?.results ?? []).map((r: { value: string }) => r.value);

      if (values.length === 0) {
        setDirectFetchError(prev => ({
          ...prev,
          [filterIndex]: `No values found for field "${field}" in "${entityType}". Check that the field name matches exactly what's stored in the data column.`,
        }));
        return;
      }

      const options: FilterOption[] = values.map(v => ({ label: String(v), value: String(v) }));
      handleFilterFieldChange(filterIndex, 'options', options);
      setDirectFetchSuccess(prev => ({ ...prev, [filterIndex]: `${values.length} option${values.length !== 1 ? 's' : ''} loaded` }));
      setDirectFetchModes(prev => { const next = new Set(prev); next.delete(filterIndex); return next; });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; detail?: string } } };
      const status = axiosErr?.response?.status;
      const serverMsg = axiosErr?.response?.data?.error || axiosErr?.response?.data?.detail;
      let msg = 'Fetch failed';
      if (status) msg += ` (HTTP ${status})`;
      if (serverMsg) msg += `: ${serverMsg}`;
      else msg += ' — check the browser console for details';
      setDirectFetchError(prev => ({ ...prev, [filterIndex]: msg }));
    } finally {
      setDirectFetchLoading(prev => ({ ...prev, [filterIndex]: false }));
    }
  };

  return (
    <div className="space-y-4">

      <div className="space-y-4">
        <div>
          <Label>Number of Filters</Label>
          <Input
            type="number"
            min="0"
            max="20"
            value={numFilters}
            onChange={(e) => handleFilterCountChange(parseInt(e.target.value) || 0)}
            className="w-24"
          />
        </div>

        {Array.from({ length: numFilters }).map((_, index) => {
          const filter = localFilters[index] || {
            key: '',
            label: '',
            type: 'select',
            accessor: '',
            options: [],
            placeholder: ''
          };

          return (
            <div
              key={filter.key || `filter-row-${index}`}
              className="space-y-3 p-4 border rounded-lg"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter {index + 1}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterDelete(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={filter.label}
                    onChange={(e) => handleFilterFieldChange(index, 'label', e.target.value)}
                    placeholder="Resolution Status"
                  />
                </div>
                <div>
                  <Label>Accessor Key</Label>
                  <Input
                    value={filter.accessor || ''}
                    onChange={(e) => handleFilterFieldChange(index, 'accessor', e.target.value)}
                    placeholder="resolution_status"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Field to filter on (uses display name if empty)
                  </p>
                </div>
                {showDispatchMobileUi ? (
                  <>
                    <div>
                      <Label>Mobile UI control</Label>
                      <Select
                        value={filter.dispatchUi ?? 'text'}
                        onValueChange={(value: NonNullable<FilterConfig['dispatchUi']>) =>
                          handleFilterFieldChange(index, 'dispatchUi', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text field</SelectItem>
                          <SelectItem value="floatingDate">Start date (floating label)</SelectItem>
                          <SelectItem value="date">Date text field</SelectItem>
                          <SelectItem value="toggle">Toggle (DC in Office style)</SelectItem>
                          <SelectItem value="segment">Segment (NR / Paid style)</SelectItem>
                          <SelectItem value="chip">Client chip</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Row group</Label>
                      <Input
                        value={filter.dispatchRow ?? ''}
                        onChange={(e) => handleFilterFieldChange(index, 'dispatchRow', e.target.value)}
                        placeholder="e.g. row_start, row_dates (same row = side by side)"
                      />
                    </div>
                    <div>
                      <Label>Width</Label>
                      <Select
                        value={filter.dispatchWidth ?? 'full'}
                        onValueChange={(value: 'full' | 'half') =>
                          handleFilterFieldChange(index, 'dispatchWidth', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full width</SelectItem>
                          <SelectItem value="half">Half width</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
                <div className="col-span-2">
                  <Label>Filter Type</Label>
                  <Select
                    value={filter.type}
                    onValueChange={(value: FilterConfig['type']) =>
                      handleFilterFieldChange(index, 'type', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select">Select/Dropdown (Multiple)</SelectItem>
                      <SelectItem value="text">Text Search (icontains)</SelectItem>
                      <SelectItem value="exact">Exact Match</SelectItem>
                      <SelectItem value="icontains">Contains (Case-insensitive)</SelectItem>
                      <SelectItem value="startswith">Starts With</SelectItem>
                      <SelectItem value="endswith">Ends With</SelectItem>
                      <SelectItem value="search">Global Search</SelectItem>
                      <SelectItem value="date_gte">Date From (≥)</SelectItem>
                      <SelectItem value="date_lte">Date To (≤)</SelectItem>
                      <SelectItem value="date_exact">Exact Date (=)</SelectItem>
                      <SelectItem value="date_range">Date Range</SelectItem>
                      <SelectItem value="date_time_range">Date Time Range</SelectItem>
                      <SelectItem value="number_gte">Number From (≥)</SelectItem>
                      <SelectItem value="number_lte">Number To (≤)</SelectItem>
                      <SelectItem value="gt">Greater Than</SelectItem>
                      <SelectItem value="lt">Less Than</SelectItem>
                      <SelectItem value="in">In List</SelectItem>
                    </SelectContent>
                  </Select>
                  {(filter.type === 'date_gte' || filter.type === 'date_lte' || filter.type === 'date_exact' || filter.type === 'date_range' || filter.type === 'date_time_range') && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Date filters:</strong> From (≥) → <code className="bg-muted px-1 rounded">accessor__gte</code>. To (≤) → <code className="bg-muted px-1 rounded">accessor__lte</code>. Exact (=) → <code className="bg-muted px-1 rounded">accessor</code> (YYYY-MM-DD). Range → both gte and lte.
                    </p>
                  )}
                </div>

                {/* Custom lookup field for advanced filtering */}
                <div className="col-span-2">
                  <Label>Custom Lookup (Optional)</Label>
                  <Select
                    value={filter.lookup || 'auto'}
                    onValueChange={(value: string) =>
                      handleFilterFieldChange(index, 'lookup', value === 'auto' ? undefined : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect or choose lookup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="exact">Exact Match</SelectItem>
                      <SelectItem value="icontains">Contains (Case-insensitive)</SelectItem>
                      <SelectItem value="contains">Contains (Case-sensitive)</SelectItem>
                      <SelectItem value="iexact">Exact (Case-insensitive)</SelectItem>
                      <SelectItem value="startswith">Starts With</SelectItem>
                      <SelectItem value="endswith">Ends With</SelectItem>
                      <SelectItem value="in">In List</SelectItem>
                      <SelectItem value="gt">Greater Than</SelectItem>
                      <SelectItem value="gte">Greater Than or Equal</SelectItem>
                      <SelectItem value="lt">Less Than</SelectItem>
                      <SelectItem value="lte">Less Than or Equal</SelectItem>
                      <SelectItem value="isnull">Is Null</SelectItem>
                      <SelectItem value="isnotnull">Is Not Null</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Override auto-detection for specific Django ORM lookups
                  </p>
                </div>

                {/* Text/Search specific fields */}
                {(filter.type === 'text' || filter.type === 'search') && (
                  <div className="col-span-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={filter.placeholder || ''}
                      onChange={(e) => handleFilterFieldChange(index, 'placeholder', e.target.value)}
                      placeholder="Enter search term..."
                    />
                  </div>
                )}

                {/* Date Range: labels for start and end date fields */}
                {(filter.type === 'date_range' || filter.type === 'date_time_range') && (
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Start date label</Label>
                      <Input
                        value={filter.dateRangeStartLabel ?? ''}
                        onChange={(e) => handleFilterFieldChange(index, 'dateRangeStartLabel', e.target.value)}
                        placeholder="e.g. From, Start date"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End date label</Label>
                      <Input
                        value={filter.dateRangeEndLabel ?? ''}
                        onChange={(e) => handleFilterFieldChange(index, 'dateRangeEndLabel', e.target.value)}
                        placeholder="e.g. To, End date"
                      />
                    </div>
                  </div>
                )}

                {/* Select options: Manual, fetch from API, or direct fetch */}
                {filter.type === 'select' && (
                  <div className="col-span-2 space-y-2">
                    <div>
                      <Label className="block mb-2">Options source</Label>
                      <Select
                        value={directFetchModes.has(index) ? 'direct' : (filter.optionsApiUrl ? 'api' : 'manual')}
                        onValueChange={(value: string) => {
                          if (value === 'direct') {
                            setDirectFetchModes(prev => new Set([...prev, index]));
                            setDirectFetchError(prev => ({ ...prev, [index]: '' }));
                          } else if (value === 'api') {
                            setDirectFetchModes(prev => { const next = new Set(prev); next.delete(index); return next; });
                            if (handleFilterOptionsSourceChange) {
                              handleFilterOptionsSourceChange(index, 'api');
                            } else {
                              handleFilterFieldChange(index, 'optionsApiUrl', '/membership/roles');
                              handleFilterFieldChange(index, 'optionsDisplayKey', 'name');
                              handleFilterFieldChange(index, 'optionsValueKey', 'id');
                              handleFilterFieldChange(index, 'options', []);
                            }
                          } else {
                            setDirectFetchModes(prev => { const next = new Set(prev); next.delete(index); return next; });
                            if (handleFilterOptionsSourceChange) {
                              handleFilterOptionsSourceChange(index, 'manual');
                            } else {
                              handleFilterFieldChange(index, 'optionsApiUrl', '');
                              handleFilterFieldChange(index, 'optionsDisplayKey', '');
                              handleFilterFieldChange(index, 'optionsValueKey', '');
                              if (!filter.options?.length) handleFilterFieldChange(index, 'options', [{ label: '', value: '' }]);
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual (add options below)</SelectItem>
                          <SelectItem value="api">Fetch from API</SelectItem>
                          <SelectItem value="direct">Direct Fetch (auto-fill from DB)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {directFetchModes.has(index) ? (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                        <Label className="text-xs text-muted-foreground">Type the data field to fetch unique values from</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="data.engineer"
                            value={directFetchInputs[index] ?? ''}
                            onChange={(e) => {
                              setDirectFetchInputs(prev => ({ ...prev, [index]: e.target.value }));
                              setDirectFetchError(prev => ({ ...prev, [index]: '' }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleDirectFetch(index);
                              }
                            }}
                            className="font-mono text-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDirectFetch(index)}
                            disabled={!!directFetchLoading[index]}
                          >
                            {directFetchLoading[index] ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
                          </Button>
                        </div>
                        {directFetchError[index] && (
                          <p className="text-xs text-red-500">{directFetchError[index]}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Fetches all unique values for <code className="bg-muted px-1 rounded">data.&lt;field&gt;</code> from the database and autofills the options list.
                        </p>
                      </div>
                    ) : filter.optionsApiUrl ? (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                        <Label className="text-xs text-muted-foreground">API configuration</Label>
                        <Input
                          placeholder="API URL (e.g. /membership/roles)"
                          value={filter.optionsApiUrl || ''}
                          onChange={(e) => handleFilterFieldChange(index, 'optionsApiUrl', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Display key (label in dropdown)</Label>
                            <Input
                              placeholder="e.g. name"
                              value={filter.optionsDisplayKey || ''}
                              onChange={(e) => handleFilterFieldChange(index, 'optionsDisplayKey', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Value key (sent in filter/query)</Label>
                            <Input
                              placeholder="e.g. id"
                              value={filter.optionsValueKey || ''}
                              onChange={(e) => handleFilterFieldChange(index, 'optionsValueKey', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-muted space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-normal">Include NULL / empty option</Label>
                            <Switch
                              checked={!!filter.optionsIncludeNull}
                              onCheckedChange={(checked) => handleFilterFieldChange(index, 'optionsIncludeNull', checked)}
                            />
                          </div>
                          {filter.optionsIncludeNull && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">NULL option label</Label>
                                <Input
                                  placeholder="e.g. Unassigned, None"
                                  value={filter.optionsNullLabel ?? ''}
                                  onChange={(e) => handleFilterFieldChange(index, 'optionsNullLabel', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">NULL option value</Label>
                                <Input
                                  placeholder="e.g. empty, null"
                                  value={filter.optionsNullValue ?? ''}
                                  onChange={(e) => handleFilterFieldChange(index, 'optionsNullValue', e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          API should return an array of objects. Display key = field shown in dropdown; value key = value sent as filter parameter.
                        </p>
                      </div>
                    ) : (
                      <>
                        {directFetchSuccess[index] && (
                          <p className="text-xs text-green-600 font-medium">{directFetchSuccess[index]} — edit below if needed</p>
                        )}
                        <div className="flex items-center justify-between">
                          <Label>Options</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFilterOption(index)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        {filter.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2 items-center">
                            <Input
                              placeholder="Display Name"
                              value={option.label}
                              onChange={(e) => handleFilterOptionChange(index, optionIndex, 'label', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="Value"
                              value={option.value}
                              onChange={(e) => handleFilterOptionChange(index, optionIndex, 'value', e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFilterOption(index, optionIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleFilterCountChange(numFilters + 1)}
          disabled={numFilters >= 20}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Filter
        </Button>
      </div>

      
    </div>
  );
};