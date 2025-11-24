import React from "react";
import LeadCardCarousel from "./LeadCardCarousel";

interface LeadCardCarouselWrapperProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
  };
}

export const LeadCardCarouselWrapper: React.FC<LeadCardCarouselWrapperProps> = ({ config }) => {
  return (
    <div className="w-full">
      <LeadCardCarousel 
        config={config}
      />
    </div>
  );
};
