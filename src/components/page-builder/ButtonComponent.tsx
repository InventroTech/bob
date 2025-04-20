import React from 'react';
import { Button as ShadButton } from "@/components/ui/button"; // Assuming ShadCN button

interface ButtonComponentProps {
  label?: string;
}

export const ButtonComponent: React.FC<ButtonComponentProps> = ({ label = "Button" }) => {
  return (
    <div className="border border-dashed border-red-400 p-2 inline-block">
      <p className="text-xs text-red-500 mb-1">Button</p>
      <ShadButton size="sm">{label}</ShadButton>
    </div>
  );
}; 