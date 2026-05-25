import React from "react";
import { WorkItemCarousel } from "./WorkItemCarousel";

interface WorkItemCarouselWrapperProps {
  config?: {
    apiPrefix?: "supabase" | "renderer";
    useWorkItemApi?: boolean;
    title?: string;
  };
}

export const WorkItemCarouselWrapper: React.FC<WorkItemCarouselWrapperProps> = ({ config }) => {
  return (
    <div className="w-full h-full min-h-[600px]">
      <WorkItemCarousel config={{ useWorkItemApi: true, ...config }} />
    </div>
  );
};
