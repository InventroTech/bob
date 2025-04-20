import React, { ReactNode } from 'react';

interface SplitViewComponentProps {
  leftChildren?: ReactNode;
  rightChildren?: ReactNode;
}

export const SplitViewComponent: React.FC<SplitViewComponentProps> = ({ leftChildren, rightChildren }) => {
  return (
    <div className="border border-dashed border-green-400 p-2">
      <p className="text-xs text-green-500 mb-1">Split View</p>
      <div className="flex gap-2">
        <div className="flex-1 border border-dashed border-green-300 p-2 min-h-[40px]">
          {leftChildren || <div className="text-center text-gray-400">Left Pane</div>}
        </div>
        <div className="flex-1 border border-dashed border-green-300 p-2 min-h-[40px]">
          {rightChildren || <div className="text-center text-gray-400">Right Pane</div>}
        </div>
      </div>
    </div>
  );
}; 