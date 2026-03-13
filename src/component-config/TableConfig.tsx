import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicFilterConfig, FilterConfig } from './DynamicFilterConfig';

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'chip' | 'date' | 'number' | 'link' | 'action';
  linkField?: string; // Field to use as link for this column
  /** If true, this field is editable in the record detail modal (save icon to update). */
  editable?: boolean;
  /** For action type: open detail card (lead/ticket) on click */
  openCard?: boolean | string;
  /** For action type: API endpoint to call when action button is clicked */
  actionApiEndpoint?: string;
  /** Request method: GET, POST, PUT, PATCH, DELETE */
  actionApiMethod?: string;
  /** Custom headers as JSON object, e.g. {"X-Custom": "value"} */
  actionApiHeaders?: string;
  /** Request body as JSON. Use {id}, {propertyName} for row values, __ROW__ for full row */
  actionApiPayload?: string;
}

interface TableConfigProps {
  localConfig: {
    apiEndpoint: string;
    showFilters: boolean;
    searchFields?: string;
    entityType?: string;
    detailMode?: string;
    /** 'default' | 'itemsTable' — when itemsTable, first column is normal text and status buttons column can be shown */
    tableType?: 'default' | 'itemsTable';
    /** For itemsTable: buttons that set record data.status on click */
    statusButtons?: Array<{ label: string; statusValue: string }>;
    /** Per-field config for record detail modal: which data keys to show and whether each is editable. */
    modalFieldConfig?: Array<{ key: string; editable: boolean }>;
    /** 'default' = record detail modal; 'form_edit' = inventory-form-style modal with action buttons. */
    recordDetailModalType?: 'default' | 'form_edit';
    /** For form_edit modal: fields to show (key, label text, enabled). Add custom fields with key + label. */
    formModalFields?: Array<{ key: string; label: string; enabled: boolean }>;
    /** Form modal title (e.g. "Edit record"). */
    formModalTitle?: string;
    /** Form modal description text below the title. */
    formModalDescription?: string;
  };
  localColumns: ColumnConfig[];
  numColumns: number;
  localFilters: FilterConfig[];
  numFilters: number;
  handleInputChange: (field: string, value: string | number | boolean | Array<{ label: string; statusValue: string }> | Array<{ key: string; editable: boolean }> | Array<{ key: string; label: string; enabled: boolean }>) => void;
  handleColumnCountChange: (count: number) => void;
  handleColumnFieldChange: (index: number, field: keyof ColumnConfig, value: string | boolean) => void;
  handleColumnDelete?: (index: number) => void;
  handleFilterCountChange: (count: number) => void;
  handleFilterFieldChange: (index: number, field: keyof FilterConfig, value: string | FilterConfig['options'] | boolean) => void;
  handleFilterOptionsSourceChange?: (index: number, source: 'manual' | 'api') => void;
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
  handleFilterOptionsSourceChange,
  handleAddFilterOption,
  handleRemoveFilterOption,
  handleFilterOptionChange
}) => {
  const [modalFields, setModalFields] = useState<Array<{ key: string; editable: boolean }>>(
    () => localConfig.modalFieldConfig ?? []
  );
  const [formModalFieldsList, setFormModalFieldsList] = useState<Array<{ key: string; label: string; enabled: boolean }>>(
    () => localConfig.formModalFields ?? []
  );

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

      <div>
        <Label>Entity Type</Label>
        <Input
          value={localConfig.entityType || ''}
          onChange={(e) => handleInputChange('entityType', e.target.value)}
          placeholder="e.g., inventory_request, inventory_cart, inventory_item"
        />
        <p className="text-xs text-gray-500 mt-1">
          For records API: entity_type sent to the API. Used to infer row-click behavior if Detail Mode is not set.
        </p>
      </div>

      <div>
        <Label>Detail Mode (row click)</Label>
        <Select
          value={localConfig.detailMode && localConfig.detailMode !== 'auto' ? localConfig.detailMode : 'auto'}
          onValueChange={(value) => handleInputChange('detailMode', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Auto (from Entity Type)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (from Entity Type)</SelectItem>
            <SelectItem value="lead_card">Lead card (lead modal)</SelectItem>
            <SelectItem value="inventory_request">Record detail (request)</SelectItem>
            <SelectItem value="inventory_cart">Record detail (cart)</SelectItem>
            <SelectItem value="record_form_modal">Record form modal</SelectItem>
            <SelectItem value="receive_shipments">Receive shipment (inventory manager)</SelectItem>
            <SelectItem value="none">None (no row click)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          What happens when a row is clicked. Record form modal: form-style edit with action buttons; receive_shipments: quick add-to-inventory / roll-back modal.
        </p>
      </div>

      <div>
        <Label>Table type</Label>
        <Select
          value={localConfig.tableType === 'itemsTable' ? 'itemsTable' : 'default'}
          onValueChange={(value: 'default' | 'itemsTable') => handleInputChange('tableType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default (first column can show profile card)</SelectItem>
            <SelectItem value="itemsTable">Items table (first column normal text + status action buttons)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Items table: first column is plain text; you can add status change buttons that update the record&apos;s status on click.
        </p>
      </div>

      {localConfig.tableType === 'itemsTable' && (
        <div className="space-y-2">
          <Label>Status action buttons</Label>
          <p className="text-xs text-gray-500">
            Each button updates the record&apos;s <code className="bg-muted px-1 rounded">data.status</code> when clicked. Add buttons below.
          </p>
          {(localConfig.statusButtons || []).map((btn, idx) => (
            <div key={idx} className="flex gap-2 items-center p-2 border rounded-md bg-muted/30">
              <Input
                placeholder="Button label"
                value={btn.label}
                onChange={(e) => {
                  const next = [...(localConfig.statusButtons || [])];
                  next[idx] = { ...next[idx], label: e.target.value };
                  handleInputChange('statusButtons', next);
                }}
              />
              <Input
                placeholder="Status value"
                value={btn.statusValue}
                onChange={(e) => {
                  const next = [...(localConfig.statusButtons || [])];
                  next[idx] = { ...next[idx], statusValue: e.target.value };
                  handleInputChange('statusButtons', next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = (localConfig.statusButtons || []).filter((_, i) => i !== idx);
                  handleInputChange('statusButtons', next);
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleInputChange('statusButtons', [...(localConfig.statusButtons || []), { label: 'New', statusValue: 'NEW' }])}
          >
            Add status button
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label>Modal fields (record detail)</Label>
        <p className="text-xs text-gray-500">
          Choose which <code className="bg-muted px-1 rounded">record.data</code> keys appear in the record detail modal and toggle <strong>Editable</strong> on or off per field. Merged with columns marked &quot;Editable in record detail modal&quot;.
        </p>
        {modalFields.map((field, idx) => (
          <div key={idx} className="flex flex-wrap gap-2 items-center p-2 border rounded-md bg-muted/30">
            <Input
              placeholder="Data key (e.g. status, comments)"
              value={field.key}
              onChange={(e) => {
                const next = [...modalFields];
                next[idx] = { ...next[idx], key: e.target.value };
                setModalFields(next);
                handleInputChange('modalFieldConfig', next);
              }}
              className="min-w-[140px]"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id={`modal-field-editable-${idx}`}
                checked={field.editable}
                onCheckedChange={(checked) => {
                  const next = [...modalFields];
                  next[idx] = { ...next[idx], editable: !!checked };
                  setModalFields(next);
                  handleInputChange('modalFieldConfig', next);
                }}
              />
              <Label htmlFor={`modal-field-editable-${idx}`} className="text-sm font-normal cursor-pointer whitespace-nowrap">
                Editable
              </Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = modalFields.filter((_, i) => i !== idx);
                setModalFields(next);
                handleInputChange('modalFieldConfig', next);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const next = [...modalFields, { key: '', editable: true }];
            setModalFields(next);
            handleInputChange('modalFieldConfig', next);
          }}
        >
          Add modal field
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Record detail modal type</Label>
        <Select
          value={localConfig.recordDetailModalType === 'form_edit' ? 'form_edit' : 'default'}
          onValueChange={(value: 'default' | 'form_edit') => handleInputChange('recordDetailModalType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default (record detail view/edit)</SelectItem>
            <SelectItem value="form_edit">Form-style (inventory form layout + action buttons)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Form-style: same layout as inventory form; action buttons update the entry. Configure fields below.
        </p>
      </div>

      {(localConfig.recordDetailModalType === 'form_edit' || localConfig.detailMode === 'record_form_modal') && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Form modal title</Label>
            <Input
              value={localConfig.formModalTitle ?? ''}
              onChange={(e) => handleInputChange('formModalTitle', e.target.value)}
              placeholder="e.g. Edit record"
            />
          </div>
          <div className="space-y-2">
            <Label>Form modal description</Label>
            <Input
              value={localConfig.formModalDescription ?? ''}
              onChange={(e) => handleInputChange('formModalDescription', e.target.value)}
              placeholder="e.g. Edit fields below. Use an action button to save and set status, or Save to save changes only."
            />
            <p className="text-xs text-gray-500">
              Shown below the title. Leave empty to use the default text.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Form modal fields</Label>
            <p className="text-xs text-gray-500">
              Fields shown in the form-style modal. <strong>Key</strong> = data key, <strong>Text</strong> = label to show. Toggle <strong>Enabled</strong> to allow editing (disabled = read-only). Default: all enabled for inventory request.
            </p>
          {formModalFieldsList.map((field, idx) => (
            <div key={idx} className="flex flex-wrap gap-2 items-center p-2 border rounded-md bg-muted/30">
              <Input
                placeholder="Key (e.g. status, comments)"
                value={field.key}
                onChange={(e) => {
                  const next = [...formModalFieldsList];
                  next[idx] = { ...next[idx], key: e.target.value };
                  setFormModalFieldsList(next);
                  handleInputChange('formModalFields', next);
                }}
                className="min-w-[120px]"
              />
              <Input
                placeholder="Text to show (label)"
                value={field.label}
                onChange={(e) => {
                  const next = [...formModalFieldsList];
                  next[idx] = { ...next[idx], label: e.target.value };
                  setFormModalFieldsList(next);
                  handleInputChange('formModalFields', next);
                }}
                className="min-w-[140px]"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  id={`form-field-enabled-${idx}`}
                  checked={field.enabled}
                  onCheckedChange={(checked) => {
                    const next = [...formModalFieldsList];
                    next[idx] = { ...next[idx], enabled: !!checked };
                    setFormModalFieldsList(next);
                    handleInputChange('formModalFields', next);
                  }}
                />
                <Label htmlFor={`form-field-enabled-${idx}`} className="text-sm font-normal cursor-pointer whitespace-nowrap">
                  Enabled
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = formModalFieldsList.filter((_, i) => i !== idx);
                  setFormModalFieldsList(next);
                  handleInputChange('formModalFields', next);
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = [...formModalFieldsList, { key: '', label: '', enabled: true }];
                setFormModalFieldsList(next);
                handleInputChange('formModalFields', next);
              }}
            >
              Add field
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const defaultFields: Array<{ key: string; label: string; enabled: boolean }> = [
                  { key: 'status', label: 'Status', enabled: true },
                  { key: 'quantity_required', label: 'Quantity required', enabled: true },
                  { key: 'quantity', label: 'Quantity', enabled: true },
                  { key: 'item_name_freeform', label: 'Item name', enabled: true },
                  { key: 'vendor', label: 'Vendor', enabled: true },
                  { key: 'comments', label: 'Comments', enabled: true },
                  { key: 'notes', label: 'Notes', enabled: true },
                  { key: 'urgency_level', label: 'Urgency', enabled: true },
                  { key: 'project_purpose', label: 'Project / purpose', enabled: true },
                  { key: 'department', label: 'Department', enabled: true },
                  { key: 'cart_id', label: 'Cart', enabled: true },
                ];
                setFormModalFieldsList(defaultFields);
                handleInputChange('formModalFields', defaultFields);
              }}
            >
              Use default (inventory request)
            </Button>
          </div>
          </div>
        </div>
      )}

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
                      onValueChange={(value: 'text' | 'chip' | 'date' | 'number' | 'link' | 'action') =>
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
                        <SelectItem value="action">Action Button</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch
                      id={`editable-${index}`}
                      checked={column.editable === true}
                      onCheckedChange={(checked) => handleColumnFieldChange(index, 'editable', !!checked)}
                    />
                    <Label htmlFor={`editable-${index}`} className="text-sm font-normal cursor-pointer">
                      Editable in record detail modal (show save icon to update)
                    </Label>
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
                  {column.type === 'action' && (
                    <>
                      <div className="col-span-2 flex items-center gap-2">
                        <Switch
                          id={`openCard-${index}`}
                          checked={column.openCard === true || column.openCard === 'true'}
                          onCheckedChange={(checked) =>
                            handleColumnFieldChange(index, 'openCard', checked ? 'true' : 'false')
                          }
                        />
                        <Label htmlFor={`openCard-${index}`} className="text-sm font-normal cursor-pointer">
                          Open detail card on click (lead/ticket modal)
                        </Label>
                      </div>
                      <div className="col-span-2">
                        <Label>API Endpoint (optional)</Label>
                        <Input
                          value={column.actionApiEndpoint || ''}
                          onChange={(e) => handleColumnFieldChange(index, 'actionApiEndpoint', e.target.value)}
                          placeholder="e.g., /api/tickets/123/action"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use {`{id}`} for row id (e.g. /api/tickets/{`{id}`}/resolve)
                        </p>
                      </div>
                      <div>
                        <Label>Request Method</Label>
                        <Select
                          value={column.actionApiMethod || 'POST'}
                          onValueChange={(v) => handleColumnFieldChange(index, 'actionApiMethod', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Headers (optional, JSON)</Label>
                        <Input
                          value={column.actionApiHeaders || ''}
                          onChange={(e) => handleColumnFieldChange(index, 'actionApiHeaders', e.target.value)}
                          placeholder='e.g. {"X-Custom-Header": "value"}'
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Custom headers merged with defaults (Authorization, Content-Type, X-Tenant-Slug)
                        </p>
                      </div>
                      <div className="col-span-2">
                        <Label>Payload (optional, JSON)</Label>
                        <Input
                          value={column.actionApiPayload || ''}
                          onChange={(e) => handleColumnFieldChange(index, 'actionApiPayload', e.target.value)}
                          placeholder='e.g. {"lead_id": "{id}"} or __ROW__ for full row'
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use {`{id}`}, {`{propertyName}`} for row values. Leave empty or __ROW__ for full row.
                        </p>
                      </div>
                    </>
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
            handleFilterOptionsSourceChange={handleFilterOptionsSourceChange}
            handleAddFilterOption={handleAddFilterOption}
            handleRemoveFilterOption={handleRemoveFilterOption}
            handleFilterOptionChange={handleFilterOptionChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 