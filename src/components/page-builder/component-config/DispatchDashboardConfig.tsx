import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { DispatchDashboardConfig } from '../DispatchDashboardComponent';

export type DispatchDashboardConfigState = DispatchDashboardConfig;

interface Props {
  localConfig: DispatchDashboardConfigState;
  handleInputChange: (field: string, value: string | boolean | number) => void;
}

export const DispatchDashboardConfigPanel: React.FC<Props> = ({ localConfig, handleInputChange }) => {
  return (
    <div className="space-y-4 p-4">
      <div>
        <Label htmlFor="homeTitle">Dashboard title</Label>
        <Input
          id="homeTitle"
          value={localConfig.homeTitle ?? ''}
          onChange={(e) => handleInputChange('homeTitle', e.target.value)}
          placeholder="Sales Dashboard"
        />
      </div>
      <div>
        <Label htmlFor="homeSubtitle">Dashboard subtitle</Label>
        <Input
          id="homeSubtitle"
          value={localConfig.homeSubtitle ?? ''}
          onChange={(e) => handleInputChange('homeSubtitle', e.target.value)}
          placeholder="Track performance for"
        />
      </div>
      <div>
        <Label htmlFor="engineerField">Engineer / rep field</Label>
        <Input
          id="engineerField"
          value={localConfig.engineerField ?? ''}
          onChange={(e) => handleInputChange('engineerField', e.target.value)}
          placeholder="engineer"
        />
      </div>
      <div>
        <Label htmlFor="groupByCustomerLabel">Group by customer label</Label>
        <Input
          id="groupByCustomerLabel"
          value={localConfig.groupByCustomerLabel ?? ''}
          onChange={(e) => handleInputChange('groupByCustomerLabel', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="lastTenLabel">Last 10 label</Label>
        <Input
          id="lastTenLabel"
          value={localConfig.lastTenLabel ?? ''}
          onChange={(e) => handleInputChange('lastTenLabel', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="entityType">Entity type</Label>
        <Input
          id="entityType"
          value={localConfig.entityType ?? ''}
          onChange={(e) => handleInputChange('entityType', e.target.value)}
          placeholder="dispatch_request"
        />
      </div>
      <div>
        <Label htmlFor="customerField">Customer field</Label>
        <Input
          id="customerField"
          value={localConfig.customerField ?? ''}
          onChange={(e) => handleInputChange('customerField', e.target.value)}
          placeholder="account_name"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="hidePageHeader">Hide page header on mobile app</Label>
        <Switch
          id="hidePageHeader"
          checked={localConfig.hidePageHeader !== false}
          onCheckedChange={(checked) => handleInputChange('hidePageHeader', checked)}
        />
      </div>
    </div>
  );
};
