'use client';

import React, { forwardRef } from 'react';
import type { LeadCardCarouselHandle, LeadCardCarouselProps } from './types';
import { useLeadCardCarousel } from './useLeadCardCarousel';
import { LeadCardCarouselView } from './LeadCardCarouselView';

/**
 * Lead card carousel for PageBuilder / CRM call workflows.
 * Supports pending dashboard, action buttons, and imperative ref handlers.
 */
export const LeadCardCarousel = forwardRef<LeadCardCarouselHandle, LeadCardCarouselProps>(
  (props, ref) => {
    const model = useLeadCardCarousel(props, ref);
    return <LeadCardCarouselView {...model} />;
  }
);

LeadCardCarousel.displayName = 'LeadCardCarousel';

export default LeadCardCarousel;
export type { LeadCardCarouselHandle, LeadCardCarouselProps, LeadData } from './types';
