
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ComponentItem } from "../types";

interface ComponentRendererProps {
  component: ComponentItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  component,
  isSelected,
  onSelect,
  onRemove
}) => {
  return (
    <div 
      key={component.id}
      className={`relative group ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onSelect(component.id)}
    >
      <div 
        dangerouslySetInnerHTML={{ __html: component.content || '' }}
        className="component-preview"
      />
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-background/80 rounded-bl-md p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(component.id);
          }}
          className="h-6 w-6"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ComponentRenderer;
