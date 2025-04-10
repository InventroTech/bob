
import React from "react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageTemplate, ComponentItem } from "../types";

interface TemplateDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  templates: PageTemplate[];
  setPageName: (name: string) => void;
  setComponents: React.Dispatch<React.SetStateAction<ComponentItem[]>>;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({
  isOpen,
  setIsOpen,
  templates,
  setPageName,
  setComponents,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Select a pre-built template to jumpstart your page creation
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                setPageName(`${template.title} Page`);
                setComponents(template.components);
                setIsOpen(false);
                toast({
                  title: "Template Applied",
                  description: `${template.title} template has been applied.`,
                });
              }}
            >
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 text-primary mb-2">
                  <template.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{template.title}</CardTitle>
                <CardDescription className="text-xs">
                  {template.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              setComponents([]);
              setIsOpen(false);
              toast({
                title: "Starting Fresh",
                description: "You're starting with a blank page.",
              });
            }}
          >
            Start from Scratch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog;
