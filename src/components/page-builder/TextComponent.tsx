import React from 'react';

interface TextComponentProps {
  text?: string;
}

export const TextComponent: React.FC<TextComponentProps> = ({ text = "Placeholder Text" }) => {
  return (
    <div className="border border-dashed border-pink-400 p-2 inline-block">
      <p className="text-xs text-pink-500">Text</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}; 