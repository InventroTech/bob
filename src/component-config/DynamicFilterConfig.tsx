import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date_gte' | 'date_lte' | 'date_range' | 'number_gte' | 'number_lte' | 'search' | 'exact' | 'icontains' | 'startswith' | 'endswith' | 'gt' | 'lt' | 'in';
  accessor?: string; // Field to filter on (defaults to key if not provided)
  lookup?: string; // Custom Django ORM lookup (e.g., 'icontains', 'exact', 'gte', etc.)
  options?: FilterOption[]; // For select type filters
  placeholder?: string; // For text and search filters
}

interface DynamicFilterConfigProps {
  localConfig: {
    apiEndpoint: string;
    showFilters: boolean;
  };
  localFilters: FilterConfig[];
  numFilters: number;
  handleInputChange: (field: string, value: string | number | boolean) => void;
  handleFilterCountChange: (count: number) => void;
  handleFilterFieldChange: (index: number, field: keyof FilterConfig, value: string | FilterOption[]) => void;
  handleAddFilterOption: (filterIndex: number) => void;
  handleRemoveFilterOption: (filterIndex: number, optionIndex: number) => void;
  handleFilterOptionChange: (filterIndex: number, optionIndex: number, field: keyof FilterOption, value: string) => void;
}

export const DynamicFilterConfig: React.FC<DynamicFilterConfigProps> = ({
  localConfig,
  localFilters,
  numFilters,
  handleInputChange,
  handleFilterCountChange,
  handleFilterFieldChange,
  handleAddFilterOption,
  handleRemoveFilterOption,
  handleFilterOptionChange
}) => {
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
            <div key={index} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter {index + 1}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterCountChange(numFilters - 1)}
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
                      <SelectItem value="date_range">Date Range</SelectItem>
                      <SelectItem value="number_gte">Number From (≥)</SelectItem>
                      <SelectItem value="number_lte">Number To (≤)</SelectItem>
                      <SelectItem value="gt">Greater Than</SelectItem>
                      <SelectItem value="lt">Less Than</SelectItem>
                      <SelectItem value="in">In List</SelectItem>
                    </SelectContent>
                  </Select>
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

                {/* Select options */}
                {filter.type === 'select' && (
                  <div className="col-span-2 space-y-2">
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