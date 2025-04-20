import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';

interface DraggableSidebarItemProps {
  id: string; // Component type, e.g., 'container', 'text'
  label: string;
  icon: React.ReactNode;
}

export const DraggableSidebarItem: React.FC<DraggableSidebarItemProps> = ({ id, label, icon }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id, // Use the component type as the draggable ID
  });

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`draggable-component cursor-grab border-dashed transition-colors ${
        isDragging ? 'opacity-30' : 'hover:border-primary/50'
      }`}
      data-component-type={id}
    >
      <CardContent className="p-3 flex flex-col items-center justify-center text-center">
        <div className="h-8 w-8 mb-1 text-primary flex items-center justify-center">{icon}</div>
        <p className="text-sm font-medium">{label}</p>
      </CardContent>
    </Card>
  );
};
