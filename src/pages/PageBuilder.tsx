
import React, { useState, useEffect, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlignCenter,
  ArrowLeft,
  ChevronRight,
  Eye,
  Grid3X3,
  Layout,
  Layers,
  Save,
  Settings,
  Trash2,
  X,
  Type,
  FileText,
  FormInput,
  Table,
  Image,
  CheckSquare,
  List,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

interface ComponentItem {
  id: string;
  type: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  content?: string;
  properties?: Record<string, any>;
}

interface PageTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  components: ComponentItem[];
}

const PageBuilder = () => {
  const { template, id } = useParams();
  const navigate = useNavigate();
  const [pageName, setPageName] = useState("Untitled Page");
  const [activeTab, setActiveTab] = useState("components");
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Define templates
  const templates: PageTemplate[] = [
    {
      id: "task",
      title: "Task View",
      description: "Detailed view of a single task with actions",
      icon: CheckSquare,
      components: [
        {
          id: uuidv4(),
          type: "container",
          icon: Layout,
          label: "Container",
          content: "<div class='w-full p-4'></div>",
          properties: { className: "w-full p-4" }
        },
        {
          id: uuidv4(),
          type: "heading",
          icon: Type,
          label: "Task Header",
          content: "<h1 class='text-2xl font-bold'>Task Details</h1>",
          properties: { text: "Task Details", level: "h1" }
        },
        {
          id: uuidv4(),
          type: "form",
          icon: FormInput,
          label: "Task Form",
          content: "<form class='space-y-4 mt-4'></form>",
          properties: { fields: [] }
        }
      ]
    },
    {
      id: "leads",
      title: "Leads List",
      description: "List of leads with filtering options",
      icon: List,
      components: [
        {
          id: uuidv4(),
          type: "container",
          icon: Layout,
          label: "Container",
          content: "<div class='w-full p-4'></div>",
          properties: { className: "w-full p-4" }
        },
        {
          id: uuidv4(),
          type: "heading",
          icon: Type,
          label: "Leads Header",
          content: "<h1 class='text-2xl font-bold'>All Leads</h1>",
          properties: { text: "All Leads", level: "h1" }
        },
        {
          id: uuidv4(),
          type: "table",
          icon: Table,
          label: "Leads Table",
          content: "<div class='mt-4 border rounded'></div>",
          properties: { columns: [], data: [] }
        }
      ]
    }
  ];

  // Component categories
  const componentCategories = [
    {
      name: "Layout Components",
      items: [
        {
          type: "container",
          icon: Layout,
          label: "Container",
          content: "<div class='w-full p-4 border border-dashed rounded-md min-h-[100px]'></div>",
          properties: { className: "w-full p-4" }
        },
        {
          type: "split-view",
          icon: AlignCenter,
          label: "Split View",
          content: "<div class='flex flex-col md:flex-row gap-4'><div class='flex-1 border border-dashed rounded-md min-h-[100px] p-4'></div><div class='flex-1 border border-dashed rounded-md min-h-[100px] p-4'></div></div>",
          properties: { orientation: "horizontal" }
        },
      ]
    },
    {
      name: "Data Components",
      items: [
        {
          type: "form",
          icon: FormInput,
          label: "Form",
          content: "<form class='space-y-4 border border-dashed rounded-md p-4 min-h-[100px]'></form>",
          properties: { fields: [] }
        },
        {
          type: "table",
          icon: Table,
          label: "Table",
          content: "<div class='border border-dashed rounded-md p-4 min-h-[100px]'><table class='w-full'><thead><tr><th class='text-left'>Column 1</th><th class='text-left'>Column 2</th></tr></thead><tbody><tr><td>Data 1</td><td>Data 2</td></tr></tbody></table></div>",
          properties: { columns: [], data: [] }
        },
      ]
    },
    {
      name: "Basic Components",
      items: [
        {
          type: "text",
          icon: Type,
          label: "Text",
          content: "<p class='text-base'>Add your text here</p>",
          properties: { text: "Add your text here" }
        },
        {
          type: "heading",
          icon: FileText,
          label: "Heading",
          content: "<h2 class='text-xl font-bold'>Heading</h2>",
          properties: { text: "Heading", level: "h2" }
        },
        {
          type: "button",
          icon: CheckSquare,
          label: "Button",
          content: "<button class='px-4 py-2 bg-primary text-primary-foreground rounded-md'>Button</button>",
          properties: { text: "Button", variant: "default" }
        },
        {
          type: "image",
          icon: Image,
          label: "Image",
          content: "<div class='border border-dashed rounded-md p-4 flex items-center justify-center'><img src='/placeholder.svg' alt='Placeholder' class='max-w-full h-auto' /></div>",
          properties: { src: "/placeholder.svg", alt: "Placeholder" }
        },
      ]
    }
  ];

  // Load template if specified in URL
  useEffect(() => {
    if (template) {
      const selectedTemplate = templates.find(t => t.id === template);
      if (selectedTemplate) {
        setPageName(`${selectedTemplate.title} Page`);
        setComponents(selectedTemplate.components);
      }
    }

    // If editing, load the page data
    if (id) {
      setIsEditing(true);
      // In a real implementation, we would fetch from Supabase
      // fetchPageData(id);
    }
  }, [template, id]);

  // Handle component drag events
  const handleDragStart = (e: DragEvent<HTMLDivElement>, componentType: string, category: string) => {
    const componentData = componentCategories
      .find(cat => cat.name === category)?.items
      .find(item => item.type === componentType);
    
    if (componentData) {
      e.dataTransfer.setData("application/json", JSON.stringify({
        ...componentData,
        id: uuidv4() // Generate unique ID for the new component
      }));
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json")) as ComponentItem;
      setComponents(prev => [...prev, data]);
      toast({
        title: "Component Added",
        description: `${data.label} component has been added to the page.`,
      });
    } catch (error) {
      console.error("Error adding component:", error);
    }
  };

  // Component selection
  const handleComponentSelect = (componentId: string) => {
    setSelectedComponent(componentId === selectedComponent ? null : componentId);
    setActiveTab("settings");
  };

  // Remove component
  const handleComponentRemove = (componentId: string) => {
    setComponents(prev => prev.filter(component => component.id !== componentId));
    if (selectedComponent === componentId) {
      setSelectedComponent(null);
    }
    toast({
      title: "Component Removed",
      description: "The component has been removed from the page.",
    });
  };

  // Save page
  const handleSavePage = async () => {
    // In a real implementation, we would save to Supabase
    const pageData = {
      id: id || uuidv4(),
      title: pageName,
      description: "Page created with the builder",
      content: JSON.stringify(components),
      lastEdited: new Date().toISOString(),
      type: template || "Custom Page",
      status: "draft"
    };

    try {
      // For now we'll just display a success message
      console.log("Saving page:", pageData);
      
      toast({
        title: "Page Saved",
        description: "The page has been saved successfully.",
      });

      // Redirect to the pages gallery
      setTimeout(() => {
        navigate("/pages");
      }, 1500);
    } catch (error) {
      console.error("Error saving page:", error);
      toast({
        title: "Error Saving",
        description: "There was an error saving the page. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Preview page
  const handlePreviewPage = () => {
    // Save the current state to localStorage for preview
    localStorage.setItem("pagePreview", JSON.stringify({
      title: pageName,
      components
    }));
    
    // Open in a new tab
    window.open(`/pages/preview`, "_blank");
  };

  // Render component in the builder
  const renderComponent = (component: ComponentItem) => {
    const isSelected = selectedComponent === component.id;
    
    return (
      <div 
        key={component.id}
        className={`relative group ${isSelected ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleComponentSelect(component.id)}
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
              handleComponentRemove(component.id);
            }}
            className="h-6 w-6"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Builder Header */}
      <header className="border-b px-6 py-3 bg-background z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Dashboard</span>
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <Input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="h-9 w-[300px] font-medium"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviewPage}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button size="sm" onClick={handleSavePage}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </header>

      {/* Builder Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Components & Settings */}
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
                    {components.map((component, i) => (
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

        {/* Main Canvas */}
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
                    {components.map(component => renderComponent(component))}
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
      </div>

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
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
                  setIsTemplateDialogOpen(false);
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
              onClick={() => setIsTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setComponents([]);
                setIsTemplateDialogOpen(false);
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
    </div>
  );
};

export default PageBuilder;
