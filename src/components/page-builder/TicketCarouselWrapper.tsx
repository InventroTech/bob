import React from "react";
import { TicketCarousel } from './ticket-carousel';

interface TicketCarouselWrapperProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    apiPrefix?: 'supabase' | 'renderer';
    title?: string;
    whatsappTemplatesApiEndpoint?: string;
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