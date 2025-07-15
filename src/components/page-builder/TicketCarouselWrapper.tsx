import React from "react";
import { TicketCarousel } from "./TicketCarousel";

interface TicketCarouselWrapperProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    showFilters?: boolean;
    readOnly?: boolean;
  };
}

export const TicketCarouselWrapper: React.FC<TicketCarouselWrapperProps> = ({ config }) => {
  return (
    <div className="w-full h-full min-h-[600px]">
      <TicketCarousel 
        config={config}
      />
    </div>
  );
}; 