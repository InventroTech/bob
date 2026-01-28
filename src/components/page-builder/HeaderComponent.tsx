import React from 'react';

interface HeaderComponentProps {
  config?: {
    title?: string;
  };
}

export const HeaderComponent: React.FC<HeaderComponentProps> = ({ config }) => {
  // Get title from config, with fallback for empty string
  const title = config?.title ?? '';

  return (
    <div className="w-full py-4">
      <h2 className="text-3xl font-bold text-gray-900 mb-0 pb-3 px-6 border-b border-gray-300">
        {title}
      </h2>
    </div>
  );
};

