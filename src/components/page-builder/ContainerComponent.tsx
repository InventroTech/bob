import React, { ReactNode } from 'react';

interface ContainerComponentProps {
  children?: ReactNode;
}

export const ContainerComponent: React.FC<ContainerComponentProps> = ({ children }) => {
  return (
    <div className="border border-dashed border-blue-400 p-4 min-h-[50px]">
      <p className="text-xs text-blue-500 mb-1">Container</p>
      {children || <div className="text-center text-gray-400">Empty Container</div>}
    </div>
  );
}; 