import React, { useState, useRef, useEffect } from "react";
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
  Image as ImageIcon,
  User,
  Table,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  useDroppable,
  DragMoveEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  closestCenter,
} from "@dnd-kit/core";
import { DraggableSidebarItem } from "@/components/page-builder/DraggableSidebarItem";
import {
  ContainerComponent,
  SplitViewComponent,
  FormComponent,
  TableComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
} from "@/components/page-builder";
import { DroppableCanvasItem } from "@/components/page-builder/DroppableCanvasItem";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Json } from '@/types/supabase';
import { useTenant } from '@/hooks/useTenant';
import { LeadCardComponent } from "@/components/page-builder/LeadCardComponent";
import {DataCardComponent} from "@/components/page-builder/DataCardComponent"
  import { LeadTableComponent } from "@/components/page-builder/LeadTableComponent";
  import { CollapseCard } from "@/components/page-builder/ColapsableCardComponent";
import { CardComponent } from "@/layout/CardEditLayout";
import { LeadCarousel } from "@/components/ui/leadCarousel";
import { Carousel } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OeLeadsTable } from "@/components/page-builder/OeLeadsTable";
import { ProgressBar } from "@/components/ui/progressBar";
// Define a type for the components we'll render on the canvas
export interface CanvasComponentData {
  id: string;               // Unique instance ID
  type: string;             // e.g., 'container', 'text', 'button'
  props: Record<string, any>; // Component-specific props (e.g., tableId)
}

// Map component types to actual components
export const componentMap: Record<string, React.FC<any>> = {
  container: ContainerComponent,
  split: SplitViewComponent,
  form: FormComponent,
  table: TableComponent,
  text: TextComponent,
  button: ButtonComponent,
  image: ImageComponent,
  leadCard: LeadCardComponent,
  dataCard:DataCardComponent,
  leadTable: LeadTableComponent,
  collapseCard: CollapseCard,
  leadCarousel: LeadCarousel,
  oeLeadsTable: OeLeadsTable,
  progressBar: ProgressBar,
};

const PageBuilder = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [pageName, setPageName] = useState("Untitled Page");
  const [activeTab, setActiveTab] = useState("components");
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponentData[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  // Update sensors with less restrictive configuration
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // No activation constraint - so it starts dragging immediately
    }),
    useSensor(KeyboardSensor)
  );

  // Setup droppable canvas area
  const { setNodeRef: setCanvasRef, isOver } = useDroppable({
    id: 'canvas-drop-area',
    data: { accepts: ['container', 'split', 'form', 'table', 'text', 'button', 'image', 'leadCard', 'dataCard', 'leadTable', 'collapseCard','leadCarousel','oeLeadsTable','progressBar'] }
  });

  // At the top of the PageBuilder component, after your state declarations
  const canvasRef = useRef(null);

  // Add these effects
  useEffect(() => {
    // Log the droppable area dimensions for debugging
    const element = canvasRef.current;
    if (element) {
      const rect = element.getBoundingClientRect();
      console.log("Canvas Drop Area Dimensions:", {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  useEffect(() => {
    // If editing an existing page, fetch its data
    const fetchPageData = async () => {
      if (pageId && pageId !== 'new') {
        console.log(`Fetching data for page ID: ${pageId}`);
        try {
          const { data, error } = await supabase
            .from('pages')
            .select('name, config, role')
            .eq('id', pageId)
            .single();

          if (error) throw error;

          if (data) {
            console.log("Fetched page data:", data);
            setPageName(data.name || 'Untitled Page');
            setCanvasComponents(Array.isArray(data.config) ? (data.config as unknown as CanvasComponentData[]) : []);
            if (data.role) setSelectedRole(data.role);
          } else {
            console.warn(`Page with ID ${pageId} not found.`);
            toast.error("Page not found.");
            navigate('/'); // Redirect if page not found
          }
        } catch (error: any) {
          console.error("Error fetching page data:", error);
          toast.error(`Error loading page: ${error.message}`);
          navigate('/'); // Redirect on error
        }
      }
    };

    fetchPageData();
  }, [pageId, navigate]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from('custom_tables').select('id, name').eq('tenant_id', tenantId).then(({ data }) => {
      if (data) setCollections(data);
    });
  }, [tenantId]);

  // Add useEffect to fetch roles based on tenant_id
  useEffect(() => {
    const fetchRoles = async () => {
      if (!tenantId) return;
      
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('id, name')
          .eq('tenant_id', tenantId);
        console.log("Roles:", data);
        if (error) throw error;
        if (data) setRoles(data);
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };
    
    fetchRoles();
  }, [tenantId]);

  // Handler for when a drag operation starts
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    console.log("Drag start:", active.id);
    setActiveDragId(String(active.id));
    setActiveComponent(String(active.id));
  };

  // New handler for when a drag operation moves over a droppable
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    console.log("Dragging over:", over?.id);
  };

  // New handler for when a drag operation moves
  const handleDragMove = (event: DragMoveEvent) => {
    // This is helpful for debugging
    console.log("Drag move delta:", event.delta);
  };

  // Modify the handleDragEnd function with manual drop detection
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveComponent(null);

    console.log("Drag End Event: ", event);
    console.log("Dragged Item ID (active):", active.id);
    console.log("Dropped On Area ID (over):", over?.id);
    console.log("Over data:", over?.data?.current);

    // Manual drop detection if dnd-kit's detection fails
    const manualDetection = () => {
      // Get the canvas element's boundaries
      const element = canvasRef.current;
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      
      // Get the pointer position from the event
      const { clientX, clientY } = event.activatorEvent as PointerEvent;
      
      console.log("Drop Position:", { clientX, clientY });
      console.log("Canvas Boundaries:", { 
        top: rect.top, 
        right: rect.right, 
        bottom: rect.bottom, 
        left: rect.left 
      });
      
      // SOLUTION: Instead of strict position checking, determine if this was a dragging action 
      // from the sidebar toward the canvas area
      const deltaX = event.delta.x;
      const deltaY = event.delta.y;
      
      console.log("Drag delta:", { deltaX, deltaY });
      
      // If dragged significantly rightward (from sidebar toward canvas)
      // AND cursor is within reasonable vertical range of the canvas
      const isDraggingTowardCanvas = deltaX > 100; // Dragged right significantly
      const isWithinVerticalRange = clientY >= rect.top - 50 && clientY <= rect.bottom + 50;
      
      const isLikelyIntendedForCanvas = isDraggingTowardCanvas && isWithinVerticalRange;
      
      console.log("Drag intent analysis:", { 
        isDraggingTowardCanvas, 
        isWithinVerticalRange,
        isLikelyIntendedForCanvas
      });
      
      return isLikelyIntendedForCanvas;
    };

    // Check if dropped over the canvas OR manually detected
    if ((over && over.id === 'canvas-drop-area') || (!over && manualDetection())) {
      const componentType = String(active.id);

      // Check if it's a valid component type we can render
      if (componentMap[componentType]) {
        const newComponent: CanvasComponentData = {
          id: `${componentType}-${Date.now()}`, // Simple unique ID for now
          type: componentType,
          props: {},
        };

        console.log("Adding component to canvas: ", newComponent);
        // Add the new component to the canvas state
        setCanvasComponents((prev) => [...prev, newComponent]);
      } else {
        console.warn(`Unknown component type dropped: ${componentType}`);
      }
    } 
    // ADD THIS SECTION to handle drops onto existing components
    else if (over && typeof over.id === 'string' && over.id.includes('-')) {
      // This is likely a component ID (they have format like "container-1234567890")
      const componentType = String(active.id);
      if (!componentMap[componentType]) {
        console.warn(`Unknown component type dropped: ${componentType}`);
        return;
      }

      const newComponent: CanvasComponentData = {
        id: `${componentType}-${Date.now()}`,
        type: componentType,
        props: {},
      };

      // Find the index of the component we dropped on
      const targetId = over.id as string;
      const targetIndex = canvasComponents.findIndex(comp => comp.id === targetId);
      
      if (targetIndex !== -1) {
        console.log(`Inserting new component at index ${targetIndex}`);
        // Insert the new component at this index
        setCanvasComponents(prev => {
          const newList = [...prev];
          newList.splice(targetIndex, 0, newComponent);
          return newList;
        });
      } else {
        console.warn(`Target component with ID ${targetId} not found`);
        // Fallback: Add to end
        setCanvasComponents(prev => [...prev, newComponent]);
      }
    }
    else {
      console.log("Dropped outside canvas.");
    }
  };

  // Function to get the overlay component when dragging
  const getDragOverlay = () => {
    if (!activeComponent) return null;
    
    return (
      // Render a very simple div for the overlay
      <div className="p-2 bg-primary text-primary-foreground rounded shadow-lg">
        Dragging: {activeComponent}
      </div>
    );
  };

  // Function to handle component deletion
  const handleDeleteComponent = (idToDelete: string) => {
    console.log(`Attempting to delete component: ${idToDelete}`);
    setCanvasComponents((prev) =>
      prev.filter(component => component.id !== idToDelete)
    );
  };

  const handleSavePage = async () => {
    if (!user || !tenantId) {
      toast.error("You must be logged in to save.");
      return;
    }
    if (!pageName.trim()) {
      toast.error("Page name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const pageData = {
        user_id: user.id,
        tenant_id: tenantId,
        name: pageName.trim(),
        config: canvasComponents as unknown as Json,
        updated_at: new Date().toISOString(),
        role: selectedRole || null,
      };

      let response;
      if (pageId && pageId !== 'new') {
        // Update existing page
        console.log(`Updating page ID: ${pageId}`, pageData);
        response = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', pageId);
      } else {
        // Insert new page
        console.log("Inserting new page:", pageData);
        response = await supabase
          .from('pages')
          .insert([pageData])
          .select('id')
          .single();
      }

      console.log("Save response:", response);
      if (response.error) throw response.error;

      toast.success("Page saved successfully!");

      // If it was a new page, navigate to the edit URL with the new ID
      if (!(pageId && pageId !== 'new') && response.data?.id) {
          navigate(`/builder/${response.data.id}`, { replace: true });
      }

    } catch (error: any) {
      console.error("Error saving page:", error);
      toast.error(`Error saving page: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Property editor logic
  const selectedComponent = canvasComponents.find(c => c.id === selectedComponentId);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      collisionDetection={rectIntersection}
      accessibility={{ 
        announcements: { 
          onDragStart: () => `Dragging component`,
          onDragOver: () => `Over droppable area`,
          onDragEnd: () => `Drag operation complete`,
          onDragCancel: () => `Drag operation cancelled`
        } 
      }}
    >
      <div className="min-h-screen flex flex-col">
        {/* Builder Header (includes page name input) */}
        <header className="border-b px-6 py-3 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="Page Name"
                className="w-1/3"
              />
              <Button variant="outline" size="sm"> {/* Preview functionality TBD */}
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <select
                id="role"
                className="w-full border px-3 py-2 rounded text-sm"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">-- Select Role --</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
              <Button size="sm" onClick={handleSavePage} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </header>

        {/* Builder Content (Sidebar + Canvas) - Now wrapped */}
        <div className="flex-1 flex">
          {/* Left Sidebar - Components & Settings */}
          <div className="w-[300px] border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b">
                <TabsList className="w-full rounded-none h-12 bg-transparent">
                   {/* ... existing TabsTrigger ... */}
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="components" className="m-0 p-0 h-full">
                  <div className="p-4 space-y-4">
                    {/* Layout Components */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Layout Components</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="container"
                          label="Container"
                          icon={<Layout className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="split"
                          label="Split View"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="leadCard"
                          label="Lead Card"
                          icon={<User className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="collapseCard"
                          label="Collapse Card"
                          icon={<ChevronDown className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="leadCarousel"
                          label="Lead Carousel"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="progressBar"
                          label="Progress Bar"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-primary" />}
                        />
                        
                      </div>
                    </div>

                    <Separator />

                    {/* Data Components */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Data Components</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="form"
                          label="Form"
                          icon={<Layers className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="table"
                          label="Table"
                          icon={<Layers className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="dataCard"
                          label="Data Card"
                          icon={<Table className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="leadTable"
                          label="Lead Table"
                          icon={<Table className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="oeLeadsTable"
                          label="OE Leads Table"
                          icon={<Table className="h-8 w-8 mb-1 text-primary" />}
                        />
                        
                      </div>
                    </div>

                    <Separator />

                    {/* Basic Components */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Basic Components</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="text"
                          label="Text"
                          icon={<Layers className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="button"
                          label="Button"
                          icon={<Layers className="h-8 w-8 mb-1 text-primary" />}
                        />
                        <DraggableSidebarItem
                          id="image"
                          label="Image"
                          icon={<ImageIcon className="h-8 w-8 mb-1 text-primary" />}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="layers" className="m-0 p-4 h-full">
                  {/* ... existing Layers content ... */}
                </TabsContent>

                <TabsContent value="settings" className="m-0 p-4 h-full">
                 {/* ... existing Settings content ... */}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Main Canvas - Apply useDroppable ref DIRECTLY to this container */}
          <div
            ref={(node) => {
              // Apply both refs to the same element
              setCanvasRef(node);
              canvasRef.current = node;
            }}
            className={`flex-1 bg-muted/30 overflow-visible p-8 border-2 ${
              isOver ? 'border-primary border-dashed' : 'border-dashed'
            } flex-1 flex flex-col bg-background shadow-sm ${
              activeDragId ? 'ring-2 ring-primary/20' : ''
            }`}
            data-droppable="true"
            id="canvas-drop-area"
            style={{ minHeight: 'calc(100vh - 150px)' }}
          >
            {/* Optional Header inside the droppable area */}
            <div className="text-center text-muted-foreground text-sm p-2 border-b bg-muted/40 mb-4">
              Drop Zone Canvas {isOver ? "(Item Hovering)" : ""}
            </div>

            {/* Content area within the droppable div */}
            <div
              className={`flex-1 flex flex-col gap-4 ${
                isOver ? 'bg-primary/5 transition-colors duration-150' : ''
              }`}
            >
              {/* Render dropped components OR placeholder */}
              {canvasComponents.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground flex-1">
                  <Grid3X3 className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">
                    Drop components here
                  </p>
                  <p className="text-sm mt-1">
                    Drag from the sidebar onto this area
                  </p>
                  <div className="mt-6">
                    <Button variant="outline">
                      Choose a Template
                    </Button>
                  </div>
                </div>
              ) : (
                // Render the actual components from state, wrapped in DroppableCanvasItem
                canvasComponents.map((component) => {
                  const ComponentToRender = componentMap[component.type];
                  if (!ComponentToRender) return null;
                  return (
                    <DroppableCanvasItem
                      key={component.id}
                      id={component.id}
                      onDelete={handleDeleteComponent}
                      onSelect={setSelectedComponentId}
                    >
                      <ComponentToRender {...component.props} />
                    </DroppableCanvasItem>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add the DragOverlay to show a floating preview when dragging */}
      <DragOverlay style={{ pointerEvents: 'none' }}>
        {activeComponent ? getDragOverlay() : null}
      </DragOverlay>

      {/*
       {selectedComponentId && (
        <aside className="fixed right-0 top-0 h-full w-80 bg-background border-l p-4 shadow-lg z-50">
          <h3 className="text-lg font-semibold mb-2">Component Properties</h3>
          {selectedComponent?.type === 'table' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1">Collection</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={selectedComponent.props.tableId || ''}
                onChange={e => {
                  const newTableId = e.target.value;
                  setCanvasComponents(prev => prev.map(c =>
                    c.id === selectedComponentId ? { ...c, props: { ...c.props, tableId: newTableId } } : c
                  ));
                }}
              >
                <option value="">Select collection</option>
                {collections.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setSelectedComponentId(null)}>Close</Button>
        </aside>
      )} 
      */}
    </DndContext>
  );
};

export default PageBuilder;
