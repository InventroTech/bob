import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DynamicFilterConfig,
  type FilterConfig,
} from '@/component-config/DynamicFilterConfig';
import { DEFAULT_DISPATCH_MOBILE_FILTERS } from '../dispatch/dispatchMobileFilters';

export type DispatchCardListConfigState = {
  title?: string;
  subtitle?: string;
  entityType?: string;
  apiEndpoint?: string;
  searchFields?: string;
  pageSize?: number;
  yearLabel?: string;
  periodLabel?: string;
  hidePageHeader?: boolean;
  showFilters?: boolean;
  listTitleField?: string;
  listPoField?: string;
  listSalesOrderField?: string;
  listIndexField?: string;
};

interface Props {
  localConfig: DispatchCardListConfigState;
  handleInputChange: (field: string, value: string | number | boolean) => void;
  localFilters: FilterConfig[];
  numFilters: number;
  onReplaceFilters?: (filters: FilterConfig[]) => void;
  handleFilterCountChange: (count: number) => void;
  handleFilterDelete: (index: number) => void;
  handleFilterFieldChange: (
    index: number,
    field: keyof FilterConfig,
    value: string | FilterConfig['options'] | boolean
  ) => void;
  handleFilterOptionsSourceChange?: (index: number, source: 'manual' | 'api') => void;
  handleAddFilterOption: (filterIndex: number) => void;
  handleRemoveFilterOption: (filterIndex: number, optionIndex: number) => void;
  handleFilterOptionChange: (
    filterIndex: number,
    optionIndex: number,
    field: keyof FilterConfig['options'][0],
    value: string
  ) => void;
}


function Field({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export const DispatchCardListConfigPanel: React.FC<Props> = ({
  localConfig,
  handleInputChange,
  localFilters,
  numFilters,
  onReplaceFilters,
  handleFilterCountChange,
  handleFilterDelete,
  handleFilterFieldChange,
  handleFilterOptionsSourceChange,
  handleAddFilterOption,
  handleRemoveFilterOption,
  handleFilterOptionChange,
}) => {
  const filterBuilderLocalConfig = {
    apiEndpoint: localConfig.apiEndpoint ?? '/crm-records/records/',
    showFilters: localConfig.showFilters !== false,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch Card List (Mobile)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <Field label="Title" id="title">
              <Input
                id="title"
                value={localConfig.title ?? 'Dispatch Data'}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </Field>
            <Field label="Subtitle" id="subtitle">
              <Input
                id="subtitle"
                value={localConfig.subtitle ?? 'Complete tracking & documentation'}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
              />
            </Field>
            <Field label="Entity type" id="entityType">
              <Input
                id="entityType"
                value={localConfig.entityType ?? 'dispatch_request'}
                onChange={(e) => handleInputChange('entityType', e.target.value)}
              />
            </Field>
            <Field label="API endpoint" id="apiEndpoint">
              <Input
                id="apiEndpoint"
                value={localConfig.apiEndpoint ?? '/crm-records/records/'}
                onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
              />
            </Field>
            <Field label="Search fields (comma-separated)" id="searchFields">
              <Input
                id="searchFields"
                value={
                  localConfig.searchFields ??
                  'account_name,dc_number,po_number,sales_order_number,products,engineer'
                }
                onChange={(e) => handleInputChange('searchFields', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Page size" id="pageSize">
                <Input
                  id="pageSize"
                  type="number"
                  min={1}
                  max={500}
                  value={String(localConfig.pageSize ?? 50)}
                  onChange={(e) => handleInputChange('pageSize', parseInt(e.target.value, 10) || 50)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year label" id="yearLabel">
                <Input
                  id="yearLabel"
                  value={localConfig.yearLabel ?? '2026'}
                  onChange={(e) => handleInputChange('yearLabel', e.target.value)}
                />
              </Field>
              <Field label="Period label" id="periodLabel">
                <Input
                  id="periodLabel"
                  value={localConfig.periodLabel ?? 'JAN - MAY'}
                  onChange={(e) => handleInputChange('periodLabel', e.target.value)}
                  placeholder="JAN - MAY"
                />
              </Field>
            </div>
            <ListFieldGrid localConfig={localConfig} handleInputChange={handleInputChange} />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localConfig.hidePageHeader !== false}
                onChange={(e) => handleInputChange('hidePageHeader', e.target.checked)}
              />
              Hide duplicate page header (recommended on mobile)
            </label>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Filters use the same <strong>Filter Type</strong> and API params as the records table (Date From,
              Date To, <strong>Exact Date</strong>, Date Range).{' '}
              <strong>Width → Half</strong> puts a field in the left column (pairs with the next half-width
              filter below it in the list). <strong>Row group</strong> (e.g. <code>row_dates</code>) keeps two
              fields on one row. Segments and date ranges default to full width unless you set Half explicitly.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onReplaceFilters?.(DEFAULT_DISPATCH_MOBILE_FILTERS)}
              >
                Load default dispatch filters
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localConfig.showFilters !== false}
                onChange={(e) => handleInputChange('showFilters', e.target.checked)}
              />
              Show filter sheet on mobile
            </label>
            <DynamicFilterConfig
              localConfig={filterBuilderLocalConfig}
              localFilters={localFilters}
              numFilters={numFilters}
              showDispatchMobileUi
              handleInputChange={handleInputChange}
              handleFilterCountChange={handleFilterCountChange}
              handleFilterDelete={handleFilterDelete}
              handleFilterFieldChange={handleFilterFieldChange}
              handleFilterOptionsSourceChange={handleFilterOptionsSourceChange}
              handleAddFilterOption={handleAddFilterOption}
              handleRemoveFilterOption={handleRemoveFilterOption}
              handleFilterOptionChange={handleFilterOptionChange}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

function ListFieldGrid({
  localConfig,
  handleInputChange,
}: {
  localConfig: DispatchCardListConfigState;
  handleInputChange: (field: string, value: string | number | boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="List title field">
        <Input
          value={localConfig.listTitleField ?? 'account_name'}
          onChange={(e) => handleInputChange('listTitleField', e.target.value)}
        />
      </Field>
      <Field label="PO field">
        <Input
          value={localConfig.listPoField ?? 'po_number'}
          onChange={(e) => handleInputChange('listPoField', e.target.value)}
        />
      </Field>
      <Field label="Sales order field">
        <Input
          value={localConfig.listSalesOrderField ?? 'sales_order_number'}
          onChange={(e) => handleInputChange('listSalesOrderField', e.target.value)}
        />
      </Field>
      <Field label="Engineer field (top-left on card)">
        <Input
          value={localConfig.listIndexField ?? 'engineer'}
          onChange={(e) => handleInputChange('listIndexField', e.target.value)}
          placeholder="engineer"
        />
      </Field>
    </div>
  );
}
