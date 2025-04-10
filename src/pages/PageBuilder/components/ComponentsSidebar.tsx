
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  ChevronRight, 
  Grid3X3, 
  Layers, 
  Settings, 
  Trash2 
} from "lucide-react";
import { ComponentItem, ComponentCategory } from "../types";

interface ComponentsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  components: ComponentItem[];
  selectedComponent: string | null;
  handleComponentSelect: (id: string) => void;
  handleComponentRemove: (id: string) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, componentType: string, category: string) => void;
  pageName: string;
  setPageName: (name: string) => void;
  componentCategories: ComponentCategory[];
}

const ComponentsSidebar: React.FC<ComponentsSidebarProps> = ({
  activeTab,
  setActiveTab,
  components,
  selectedComponent,
  handleComponentSelect,
  handleComponentRemove,
  handleDragStart,
  pageName,
  setPageName,
  componentCategories,
}) => {
  return (
    <div className="w-[300px] border-r flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b">
          <TabsList className="w-full rounded-none h-12 bg-transparent">
            <TabsTrigger className="flex-1 rounded-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary" value="components">
              <Grid3X3 className="mr-2 h-4 w-4" />
              Components
            </TabsTrigger>
            <TabsTrigger className="flex-1 rounded-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary" value="layers">
              <Layers className="mr-2 h-4 w-4" />
              Layers
            </TabsTrigger>
            <TabsTrigger className="flex-1 rounded-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary" value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="components" className="m-0 p-0 h-full">
            <div className="p-4 space-y-4">
              {componentCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <h3 className="text-sm font-medium">{category.name}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map((component) => (
                      <Card 
                        key={component.type}
                        className="draggable-component cursor-grab border-dashed"
                        draggable
                        onDragStart={(e) => handleDragStart(e, component.type, category.name)}
                      >
                        <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                          <component.icon className="h-8 w-8 mb-1 text-primary" />
                          <p className="text-sm font-medium">{component.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="layers" className="m-0 p-4 h-full">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Drag to reorder layers</p>
              <div className="space-y-2">
                {components.map((component) => (
                  <div
                    key={component.id}
                    className={`flex items-center justify-between p-2 bg-background border rounded-md ${selectedComponent === component.id ? 'border-primary' : ''}`}
                    onClick={() => handleComponentSelect(component.id)}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" />
                      <span>{component.label}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComponentRemove(component.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {components.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center p-4">
                    No components added yet
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="m-0 p-4 h-full">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Page Settings</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="page-title">Page Title</Label>
                    <Input id="page-title" value={pageName} onChange={(e) => setPageName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="page-slug">URL Slug</Label>
                    <Input id="page-slug" value={pageName.toLowerCase().replace(/\s+/g, '-')} readOnly />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="page-visibility">Public Page</Label>
                    <Switch id="page-visibility" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Component Settings</h3>
                {selectedComponent ? (
                  <div className="space-y-3">
                    <p className="text-sm">
                      Editing: {components.find(c => c.id === selectedComponent)?.label || 'Component'}
                    </p>
                    {/* Component-specific settings would go here */}
                    <p className="text-sm text-muted-foreground">
                      Component property editing will be implemented in a future update.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a component to edit its properties</p>
                )}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default ComponentsSidebar;
