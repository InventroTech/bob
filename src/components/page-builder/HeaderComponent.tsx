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
    <div className="w-full py-1.5">
      <h2 className="!m-0 !text-lg !font-semibold !leading-snug text-gray-900 px-4 pb-1.5 border-b border-gray-200">
        {title}
      </h2>
    </div>
  );
};

