import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface TicketTableConfigProps {
  localConfig: {
    apiEndpoint?: string;
    title?: string;
    columns?: Array<{
      key: string;
      label: string;
      type: 'text' | 'chip' | 'date' | 'number' | 'link';
    }>;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
  handleColumnCountChange: (count: number) => void;
  handleColumnFieldChange: (index: number, field: string, value: string) => void;
  localColumns: Array<{
    key: string;
    label: string;
    type: 'text' | 'chip' | 'date' | 'number' | 'link';
  }>;
  numColumns: number;
}

export const TicketTableConfig: React.FC<TicketTableConfigProps> = ({
  localConfig,
  handleInputChange,
  handleColumnCountChange,
  handleColumnFieldChange,
  localColumns,
  numColumns,
}) => {
  const columnTypes = [
    { value: 'text', label: 'Text' },
    { value: 'chip', label: 'Chip/Badge' },
    { value: 'date', label: 'Date' },
    { value: 'number', label: 'Number' },
    { value: 'link', label: 'Link' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Table Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title || ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter table title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiEndpoint">API Endpoint</Label>
          <Input
            id="apiEndpoint"
            value={localConfig.apiEndpoint || ""}
            onChange={(e) => handleInputChange("apiEndpoint", e.target.value)}
            placeholder="e.g., /api/tickets"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for fetching ticket data
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="columnCount">Number of Columns</Label>
          <div className="flex items-center gap-2">
            <Input
              id="columnCount"
              type="number"
              min="1"
              max="10"
              value={numColumns}
              onChange={(e) => handleColumnCountChange(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleColumnCountChange(numColumns + 1)}
              disabled={numColumns >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleColumnCountChange(Math.max(1, numColumns - 1))}
              disabled={numColumns <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Column Configuration</Label>
          {localColumns.map((column, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Column {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleColumnCountChange(Math.max(1, numColumns - 1))}
                  disabled={numColumns <= 1}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`header-${index}`} className="text-xs">Header</Label>
                  <Input
                    id={`header-${index}`}
                    value={column.label}
                    onChange={(e) => handleColumnFieldChange(index, 'label', e.target.value)}
                    placeholder="Column header"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`accessor-${index}`} className="text-xs">Accessor</Label>
                  <Input
                    id={`accessor-${index}`}
                    value={column.key}
                    onChange={(e) => handleColumnFieldChange(index, 'key', e.target.value)}
                    placeholder="Data field key"
                    className="text-sm"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor={`type-${index}`} className="text-xs">Type</Label>
                <Select
                  value={column.type}
                  onValueChange={(value) => handleColumnFieldChange(index, 'type', value as any)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Configure how your table columns should be displayed. The accessor should match the data field names from your API response.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
