import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface CarouselConfigProps {
  localConfig: {
    apiEndpoint: string;
    title: string;
    showFilters: boolean;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const CarouselConfig: React.FC<CarouselConfigProps> = ({ localConfig, handleInputChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>API Endpoint</Label>
        <Input
          value={localConfig.apiEndpoint}
          onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
          placeholder="/api/tickets/carousel"
        />
      </div>
      <div>
        <Label>Title</Label>
        <Input
          value={localConfig.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Carousel Title"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={localConfig.showFilters}
          onCheckedChange={(checked) => handleInputChange('showFilters', checked)}
        />
        <Label>Show Status Filter</Label>
      </div>
    </div>
  );
}; 