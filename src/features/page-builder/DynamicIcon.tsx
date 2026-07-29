import React from "react";
import { Sparkles } from "lucide-react";
import { icons } from "lucide-react";
import { CustomIcons, CUSTOM_ICON_NAMES } from "@/components/page-builder/NewCustomIcons";

// Use the built-in 'icons' object from lucide-react
// This merges your custom Figma names with the 1,500+ Lucide names
export const AVAILABLE_ICONS = [...CUSTOM_ICON_NAMES, ...Object.keys(icons)];

// 👇 Add customIcons to the props
export const DynamicIcon = ({ name, className, customIcons = [] }: { name: string; className?: string; customIcons?: any[] }) => {
  
  // 1. Check if it's an uploaded custom icon
  const uploadedIcon = customIcons.find(icon => icon.name === name);
  if (uploadedIcon) {
    return <div 
      className={`flex items-center justify-center [&>svg]:h-full [&>svg]:w-full ${className || ''}`} 
      dangerouslySetInnerHTML={{ __html: uploadedIcon.svg_content }} 
    />;
  }

  // Look up the component in the full icons map
  const IconComponent = (icons as any)[name];
  const CustomIcon = CustomIcons[name];

  if (CustomIcon) return <CustomIcon className={className} />;
  if (IconComponent) return <IconComponent className={className} />;

  // Fallback to Sparkles
  return <Sparkles className={className} />;
};

