import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProcurementDashboardConfig } from '../ProcurementDashboardComponent';

interface Props {
  localConfig: ProcurementDashboardConfig;
  handleInputChange: (field: string, value: string | boolean | number) => void;
}

export const ProcurementDashboardConfigPanel: React.FC<Props> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <div className="space-y-4 p-4">
      <div>
        <Label htmlFor="procurementDashboardTitle">Dashboard title</Label>
        <Input
          id="procurementDashboardTitle"
          value={localConfig.title ?? ''}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Procurement Dashboard"
        />
      </div>
      <div>
        <Label htmlFor="procurementDashboardEntityType">Entity type</Label>
        <Input
          id="procurementDashboardEntityType"
          value={localConfig.entityType ?? ''}
          onChange={(e) => handleInputChange('entityType', e.target.value)}
          placeholder="unmannd_request"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Default <code>unmannd_request</code>. KPIs and charts use estimated cost / line total,
          vendor, shipment type, and status from those records.
        </p>
      </div>
    </div>
  );
};
