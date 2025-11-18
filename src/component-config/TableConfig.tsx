import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicFilterConfig, FilterConfig } from './DynamicFilterConfig';

interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'chip' | 'date' | 'number' | 'link';
  linkField?: string; // Field to use as link for this column
}

interface TableConfigProps {
  localConfig: {
    apiEndpoint: string;
    showFilters: boolean;
    searchFields?: string;
  };
  localColumns: ColumnConfig[];
  numColumns: number;
  localFilters: FilterConfig[];
  numFilters: number;
  handleInputChange: (field: string, value: string | number | boolean) => void;
  handleColumnCountChange: (count: number) => void;
  handleColumnFieldChange: (index: number, field: keyof ColumnConfig, value: string) => void;
  handleColumnDelete?: (index: number) => void;
  handleFilterCountChange: (count: number) => void;
  handleFilterFieldChange: (index: number, field: keyof FilterConfig, value: string | FilterConfig['options']) => void;
  handleAddFilterOption: (filterIndex: number) => void;
  handleRemoveFilterOption: (filterIndex: number, optionIndex: number) => void;
  handleFilterOptionChange: (filterIndex: number, optionIndex: number, field: keyof FilterConfig['options'][0], value: string) => void;
}

export const TableConfig: React.FC<TableConfigProps> = ({
  localConfig,
  localColumns,
  numColumns,
  localFilters,
  numFilters,
  handleInputChange,
  handleColumnCountChange,
  handleColumnFieldChange,
  handleColumnDelete,
  handleFilterCountChange,
  handleFilterFieldChange,
  handleAddFilterOption,
  handleRemoveFilterOption,
  handleFilterOptionChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>API Endpoint</Label>
        <Input
          value={localConfig.apiEndpoint}
          onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
          placeholder="/api/tickets"
        />
      </div>
      <div>
        <Label>Search Fields</Label>
        <Input
          value={localConfig.searchFields || ''}
          onChange={(e) => handleInputChange('searchFields', e.target.value)}
          placeholder="e.g., name,email,company"
        />
        <p className="text-xs text-gray-500 mt-1">
          Comma-separated fields to search in. Leave empty to search all fields.
        </p>
      </div>

      <Tabs defaultValue="columns" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="space-y-4">
          <div>
            <Label>Number of Columns</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={numColumns}
              onChange={(e) => handleColumnCountChange(parseInt(e.target.value) || 0)}
              className="w-24"
            />
          </div>

          {Array.from({ length: numColumns }).map((_, index) => {
            const column = localColumns[index] || { key: '', label: '', type: 'text' };
            return (
              <div key={index} className="space-y-2 p-4 border rounded-lg relative">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Column {index + 1}</h4>
                  {handleColumnDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleColumnDelete(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Column Name</Label>
                    <Input
                      value={column.label}
                      onChange={(e) => handleColumnFieldChange(index, 'label', e.target.value)}
                      placeholder="Display Name"
                    />
                  </div>
                  <div>
                    <Label>Accessor Key</Label>
                    <Input
                      value={column.key}
                      onChange={(e) => handleColumnFieldChange(index, 'key', e.target.value)}
                      placeholder="data_key"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Column Type</Label>
                    <Select
                      value={column.type}
                      onValueChange={(value: 'text' | 'chip' | 'date' | 'number' | 'link') =>
                        handleColumnFieldChange(index, 'type', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="chip">Chip/Badge</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(column.type === 'text' || column.key === 'user_id' || 
                    column.key === 'phone_number' || column.key === 'phone_no' || column.key === 'phone' ||
                    column.label.toLowerCase().includes('phone')) && (
                    <div className="col-span-2">
                      <Label>Link Field (Optional)</Label>
                      <Input
                        value={column.linkField || ''}
                        onChange={(e) => handleColumnFieldChange(index, 'linkField', e.target.value)}
                        placeholder="e.g., user_profile_link"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Field to use as link for this column (e.g., user_profile_link for User ID)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <DynamicFilterConfig
            localConfig={localConfig}
            localFilters={localFilters}
            numFilters={numFilters}
            handleInputChange={handleInputChange}
            handleFilterCountChange={handleFilterCountChange}
            handleFilterFieldChange={handleFilterFieldChange}
            handleAddFilterOption={handleAddFilterOption}
            handleRemoveFilterOption={handleRemoveFilterOption}
            handleFilterOptionChange={handleFilterOptionChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 