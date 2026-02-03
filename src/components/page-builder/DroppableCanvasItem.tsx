import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react'; // Import X icon

interface DroppableCanvasItemProps {
  id: string; // Unique instance ID of the component
  children: React.ReactNode;
  onDelete: (id: string) => void; // Add onDelete handler prop
  onSelect?: (id: string) => void; // Optional select handler
}

export const DroppableCanvasItem: React.FC<DroppableCanvasItemProps> = ({ id, children, onDelete, onSelect }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id, // Use the component's unique instance ID as the droppable ID
    data: { // Add data to identify this as a canvas item target
      isCanvasItem: true,
      componentId: id,
      accepts: ['container', 'split', 'form', 'table', 'text', 'button', 'image', 'dataCard', 'leadTable', 'collapseCard','leadCarousel','oeLeadsTable','progressBar','leadProgressBar','ticketTable','ticketCarousel','ticketBarGraph','barGraph','lineChart','stackedBarChart','temporaryLogout','addUser','leadAssignment','openModalButton','jobManager','jobsPage','applicantTable','fileUpload','dynamicScoring','routingRules','header'], // Accept all component types
    },
  });

  // Handler for the delete button click
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag/drop on the parent div
    e.preventDefault();  // Prevent any default button behavior if necessary
    onDelete(id);      // Call the passed-in onDelete function with the component ID
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "droppable-canvas-item relative group", // Removed p-1 padding to eliminate borders
        isOver && "outline-dashed outline-2 outline-offset-2 outline-foreground rounded" // Highlight when dragged over
      )}
      onClick={() => onSelect?.(id)}
      data-droppable-id={id}
    >
      {/* Delete Button - positioned top-right, visible on group hover */}
      <Button
        variant="ghost" // Subtle appearance
        size="icon"      // Square shape
        className="absolute top-1 right-1 z-10 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-destructive hover:text-destructive-foreground rounded-full"
        onClick={handleDelete}
        aria-label="Delete component"
      >
        <X className="h-3 w-3" /> {/* Small X icon */}
      </Button>

      {/* The actual component being rendered */}
      {children}

      {/* Insertion indicator line (visual cue) */}
      {isOver && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px] bg-foreground -translate-y-1/2 pointer-events-none rounded"
          aria-hidden="true"
        />
      )}
    </div>
  );
};
