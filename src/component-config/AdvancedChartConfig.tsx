import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface AdvancedChartConfigProps {
  localConfig: {
    apiEndpoint: string;
    title: string;
    refreshInterval: number;
    xAxisUnit?: string;
    yAxisUnit?: string;
  };
  localDatasets: Array<{label: string; backgroundColor: string}>;
  numDatasets: number;
  handleInputChange: (field: string, value: string | number) => void;
  handleDatasetCountChange: (count: number) => void;
  handleDatasetFieldChange: (index: number, field: 'label' | 'backgroundColor', value: string) => void;
}

export const AdvancedChartConfig: React.FC<AdvancedChartConfigProps> = ({
  localConfig, 
  localDatasets, 
  numDatasets, 
  handleInputChange,
  handleDatasetCountChange, 
  handleDatasetFieldChange 
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>API Endpoint</Label>
        <Input
          value={localConfig.apiEndpoint}
          onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
          placeholder="/api/analytics/data"
        />
      </div>
      <div>
        <Label>Title</Label>
        <Input
          value={localConfig.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Chart Title"
        />
      </div>
      <div>
        <Label>Refresh Interval (seconds)</Label>
        <Input
          type="number"
          value={localConfig.refreshInterval}
          onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value) || 0)}
          placeholder="0 for no refresh"
        />
      </div>
      <div>
        <Label>X-Axis Unit</Label>
        <Input
          value={localConfig.xAxisUnit || ''}
          onChange={(e) => handleInputChange('xAxisUnit', e.target.value)}
          placeholder="e.g., Days, Months, Categories"
        />
      </div>
      <div>
        <Label>Y-Axis Unit</Label>
        <Input
          value={localConfig.yAxisUnit || ''}
          onChange={(e) => handleInputChange('yAxisUnit', e.target.value)}
          placeholder="e.g., Sales ($), Count, Percentage (%)"
        />
      </div>
      
      <div className="space-y-4">
        <div>
          <Label>Number of Datasets</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={numDatasets}
            onChange={(e) => handleDatasetCountChange(parseInt(e.target.value) || 1)}
            className="w-24"
          />
        </div>

        {Array.from({ length: numDatasets }).map((_, index) => {
          const dataset = localDatasets[index] || { label: `Dataset ${index + 1}`, backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)` };
          return (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <h4 className="font-medium">Dataset {index + 1}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dataset Label</Label>
                  <Input
                    value={dataset.label}
                    onChange={(e) => handleDatasetFieldChange(index, 'label', e.target.value)}
                    placeholder={`Dataset ${index + 1}`}
                  />
                </div>
                <div>
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={dataset.backgroundColor.includes('rgba') ? '#ff6384' : dataset.backgroundColor}
                    onChange={(e) => {
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      handleDatasetFieldChange(index, 'backgroundColor', `rgba(${r}, ${g}, ${b}, 0.5)`);
                    }}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 