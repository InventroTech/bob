import React from 'react';

interface ImageComponentProps {
  src?: string;
  alt?: string;
}

export const ImageComponent: React.FC<ImageComponentProps> = ({ src, alt = "Placeholder Image" }) => {
  return (
    <div className="border border-dashed border-indigo-400 p-2 inline-block">
      <p className="text-xs text-indigo-500">Image</p>
      {src ? (
        <img src={src} alt={alt} className="max-w-full h-auto" />
      ) : (
        <div className="bg-gray-200 w-32 h-32 flex items-center justify-center text-gray-500">
          {alt}
        </div>
      )}
    </div>
  );
}; 