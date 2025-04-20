import React from 'react';

interface FormComponentProps {}

export const FormComponent: React.FC<FormComponentProps> = () => {
  return (
    <div className="border border-dashed border-purple-400 p-4">
      <p className="text-xs text-purple-500 mb-2">Form</p>
      <div className="space-y-2">
        <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">Form Field 1 (Placeholder)</div>
        <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">Form Field 2 (Placeholder)</div>
      </div>
    </div>
  );
}; 