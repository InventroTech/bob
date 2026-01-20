import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface HeaderConfigProps {
  config: {
    title?: string;
  };
  onConfigChange: (config: { title?: string }) => void;
}

export const HeaderConfig: React.FC<HeaderConfigProps> = ({ config, onConfigChange }) => {
  const handleChange = (field: string, value: string) => {
    onConfigChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={config.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter header title"
        />
      </div>
    </div>
  );
};

