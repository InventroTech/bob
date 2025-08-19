import React from "react";
import { LeadCardCarousel } from "./LeadCardCarousel";

interface LeadCardCarouselWrapperProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string; 
  };
}

export const LeadCardCarouselWrapper: React.FC<LeadCardCarouselWrapperProps> = ({ config }) => {
  return (
    <div className="w-full h-full min-h-[600px]">
      <LeadCardCarousel 
        config={config}
      />
    </div>
  );
};
