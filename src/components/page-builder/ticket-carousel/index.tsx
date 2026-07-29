import React from 'react';
import type { TicketCarouselProps } from './types';
import { useTicketCarousel } from './useTicketCarousel';
import { TicketCarouselView } from './TicketCarouselView';

/**
 * Support ticket detail carousel for PageBuilder.
 * Pending dashboard, ticket actions, and WhatsApp templates.
 */
export const TicketCarousel: React.FC<TicketCarouselProps> = (props) => {
  const model = useTicketCarousel(props);
  return <TicketCarouselView {...model} />;
};

export default TicketCarousel;
export type { TicketCarouselProps, Ticket } from './types';
