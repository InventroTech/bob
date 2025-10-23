import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  };
  localColumns: ColumnConfig[];
  numColumns: number;
  handleInputChange: (field: string, value: string | number | boolean) => void;
  handleColumnCountChange: (count: number) => void;
  handleColumnFieldChange: (index: number, field: keyof ColumnConfig, value: string) => void;
}

export const TableConfig: React.FC<TableConfigProps> = ({ 
  localConfig, 
  localColumns, 
  numColumns, 
  handleInputChange, 
  handleColumnCountChange, 
  handleColumnFieldChange 
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
      
      <div className="space-y-4">
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
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <h4 className="font-medium">Column {index + 1}</h4>
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
                {(column.type === 'text' || column.key === 'user_id') && (
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
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={localConfig.showFilters}
          onCheckedChange={(checked) => handleInputChange('showFilters', checked)}
        />
        <Label>Show Filters</Label>
      </div>
    </div>
  );
}; 