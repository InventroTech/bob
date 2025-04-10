
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid3X3 } from "lucide-react";
import { ComponentItem } from "../types";
import ComponentRenderer from "./ComponentRenderer";

interface BuilderCanvasProps {
  components: ComponentItem[];
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleComponentSelect: (id: string) => void;
  handleComponentRemove: (id: string) => void;
  selectedComponent: string | null;
  canvasRef: React.RefObject<HTMLDivElement>;
  pageName: string;
  setIsTemplateDialogOpen: (isOpen: boolean) => void;
}

const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  components,
  handleDragOver,
  handleDrop,
  handleComponentSelect,
  handleComponentRemove,
  selectedComponent,
  canvasRef,
  pageName,
  setIsTemplateDialogOpen,
}) => {
  return (
    <div 
      className="flex-1 bg-muted/30 overflow-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="min-h-full p-8 flex flex-col items-center justify-center">
        <Card className="w-full max-w-4xl border-2 border-dashed">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="text-center text-muted-foreground">
              {components.length > 0 ? pageName : "Drop components here to build your page"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8" ref={canvasRef}>
            {components.length > 0 ? (
              <div className="space-y-4">
                {components.map(component => (
                  <ComponentRenderer 
                    key={component.id} 
                    component={component}
                    isSelected={selectedComponent === component.id}
                    onSelect={handleComponentSelect}
                    onRemove={handleComponentRemove}
                  />
                ))}
              </div>
            ) : (
              <div className="drop-target flex flex-col items-center justify-center p-8 text-center">
                <Grid3X3 className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">
                  Drag components from the sidebar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Or select a template to get started quickly
                </p>
                <div className="mt-6">
                  <Button 
                    variant="outline"
                    onClick={() => setIsTemplateDialogOpen(true)}
                  >
                    Choose a Template
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t bg-muted/40 flex justify-center">
            <p className="text-sm text-muted-foreground">
              Page footer area
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default BuilderCanvas;
