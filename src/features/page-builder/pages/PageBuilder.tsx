import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlignCenter,
  Eye,
  Grid3X3,
  Layout,
  Layers,
  Save,
  Settings,
  Image as ImageIcon,
  User,
  Table,
  ChevronDown,
  LogOut,
  TrendingUp,
  Target,
  MousePointer,
  Briefcase,
  Users,
  Upload,
  Calculator,
  MessageSquare,
  Database,
  Sparkles,
  Truck,
  LayoutDashboard,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
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
  rectIntersection,
} from "@dnd-kit/core";
import { DraggableSidebarItem } from "@/components/page-builder/DraggableSidebarItem";
import { DEFAULT_PROCUREMENT_TABLE_CONFIG } from "@/components/page-builder/ProcurementTableComponent";
import { DEFAULT_PENDING_APPROVAL_TABLE_CONFIG } from "@/components/page-builder/PendingApprovalTableComponent";
import { DEFAULT_REJECTED_TABLE_CONFIG } from "@/components/page-builder/RejectedTableComponent";
import { DEFAULT_VENDOR_IDENTIFIED_TABLE_CONFIG } from "@/components/page-builder/VendorIdentifiedTableComponent";
import { DEFAULT_PROCUREMENT_DASHBOARD_CONFIG } from "@/components/page-builder/ProcurementDashboardComponent";
import { DroppableCanvasItem } from "@/components/page-builder/DroppableCanvasItem";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTenant } from '@/hooks/useTenant';
import { apiClient, membershipService, pageService } from '@/lib/api';
import { FilterConfig } from "@/component-config/DynamicFilterConfig";

import { componentMap, type CanvasComponentData, type ComponentConfig } from "../componentMap";
import { ConfigurationPanel } from "../ConfigurationPanel";
import { DynamicIcon, AVAILABLE_ICONS } from "../DynamicIcon";

const PageBuilder = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [visibleIconsCount, setVisibleIconsCount] = useState(100);
  const [pageName, setPageName] = useState("Untitled Page");
  const [headerTitle, setHeaderTitle] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageIcon, setPageIcon] = useState<string>("Sparkles"); // Standard library default
  // --- NEW: Custom Icons State & Upload Logic ---
  const [customIcons, setCustomIcons] = useState<{ id: string, name: string, svg_content: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch custom icons when the builder loads
  // Fetch custom icons when the builder loads
  useEffect(() => {
    const fetchIcons = async () => {
      if (!tenantId) return;
      try {
        // Look how clean this is now!
        const res = await apiClient.get('/pages/custom-icons/');
        setCustomIcons(res.data);
      } catch (e) {
        console.error("Failed to fetch custom icons", e);
      }
    };
    fetchIcons();
  }, [tenantId]);

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "image/svg+xml") {
      toast.error("Please upload a valid SVG file.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const rawSvgText = e.target?.result as string;
      const baseName = file.name.replace('.svg', '').replace(/[^a-zA-Z0-9-]/g, '-');
      
      try {
        // Knock on the Django backend door with the correct badge!
        const response = await apiClient.post('/pages/custom-icons/', {
          name: baseName,
          svg_content: rawSvgText
        });

        const newIcon = response.data;
        setCustomIcons(prev => [newIcon, ...prev]); 
        setPageIcon(newIcon.name); 
        toast.success("Icon uploaded successfully!");
      } catch (error) {
        console.error("Upload error details:", error);
        toast.error("Failed to upload icon.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };
  // 1. THIS FILTERS THE STANDARD LIBRARY (The one you are missing!)
  const filteredIcons = useMemo(() => {
    const allMatching = searchTerm
      ? AVAILABLE_ICONS.filter(icon =>
          icon.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : AVAILABLE_ICONS;

    return allMatching.slice(0, visibleIconsCount);
  }, [searchTerm, visibleIconsCount]);

  // 2. THIS FILTERS THE CUSTOM UPLOADED ICONS
  const filteredCustomIcons = useMemo(() => {
    if (!searchTerm) return customIcons;
    return customIcons.filter(icon => 
      icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, customIcons]);
  const [activeTab, setActiveTab] = useState("components");
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponentData[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  // Update sensors with less restrictive configuration
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [componentConfig, setComponentConfig] = useState<ComponentConfig>({});
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // No activation constraint - so it starts dragging immediately
    }),
    useSensor(KeyboardSensor)
  );

  // Setup droppable canvas area
  // Make the main canvas a droppable area that accepts these component types from the sidebar
  const { setNodeRef: setCanvasRef, isOver } = useDroppable({
    id: 'canvas-drop-area',
    data: { accepts: ['container', 'split', 'form', 'table', 'text', 'button', 'image', 'dataCard', 'leadTable', 'inventoryTable', 'procurementTable', 'myRequestTable', 'pendingApprovalTable', 'rejectedTable', 'vendorIdentifiedTable', 'procurementDashboard', 'inventoryRequestForm', 'procurementRequestForm', 'dispatchCardList', 'dispatchDashboard', 'collapseCard','leadCarousel','oeLeadsTable','progressBar','leadProgressBar','cseProgressBar','ticketTable','ticketCarousel','ticketBarGraph','barGraph','lineChart','stackedBarChart','temporaryLogout','addUser','leadAssignment','callAttemptMatrix','openModalButton','jobManager','jobsPage','applicantTable','fileUpload','dynamicScoring','whatsappTemplate','teamDashboard','analyticsBoard','operationsPrograms','userHierarchy'] }
  });

  // At the top of the PageBuilder component, after your state declarations
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Add these effects
  useEffect(() => {
    const element = canvasRef.current;
    if (element) {
      element.getBoundingClientRect();
    }
  }, []);

useEffect(() => {
    const fetchPageData = async () => {
      if (pageId && pageId !== 'new') {
        try {
          const response = await pageService.getPageById(pageId, tenantId!);
          
          // Debugging: Check your console to see the real shape of the data
          console.log("API Response:", response);

          // Standardize the data object (handle nesting if it exists)
          const data = (response as any).data || response;

          if (data) {
            setPageName(data.name || 'Untitled Page');
            setHeaderTitle(data.header_title || '');
            setDisplayOrder(data.display_order || 0);
            setPageIcon(data.icon_name || 'Sparkles');
            setCanvasComponents(Array.isArray(data.config) ? data.config : []);
            
            // Fix for Role: ensure it matches the ID in your dropdown
            if (data.role) setSelectedRole(data.role);
          }
        } catch (error: any) {
          toast.error(`Error loading page: ${error.message}`);
        }
      }
    };
    fetchPageData();
  }, [pageId]);

  // Ensure all filters in canvas components have proper unique keys
  useEffect(() => {
    if (canvasComponents.length > 0) {
      const updatedComponents = canvasComponents.map(component => {
        if (component.config?.filters && component.config.filters.length > 0) {
          const updatedFilters = component.config.filters.map((filter: FilterConfig, index: number) => {
            if (!filter.key || (typeof filter.key === 'string' && filter.key.trim() === '')) {
              return {
                ...filter,
                key: `filter_${filter.accessor || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
              };
            }
            return filter;
          });

          if (JSON.stringify(updatedFilters) !== JSON.stringify(component.config.filters)) {
            return {
              ...component,
              config: {
                ...component.config,
                filters: updatedFilters
              }
            };
          }
        }
        return component;
      });

      if (JSON.stringify(updatedComponents) !== JSON.stringify(canvasComponents)) {
        setCanvasComponents(updatedComponents);
      }
    }
  }, [canvasComponents]);

  // Add useEffect to fetch roles based on tenant_id using API
  useEffect(() => {
    const fetchRoles = async () => {
      if (!tenantId) return;
      
      try {
        const rolesData = await membershipService.getRoles();
        setRoles(rolesData);
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };
    
    fetchRoles();
  }, [tenantId]);

  // Handler for when a drag operation starts
  // Track the currently dragged palette item for overlay and canvas highlighting
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(String(active.id));
    setActiveComponent(String(active.id));
  };

  // New handler for when a drag operation moves over a droppable
  // Currently used only to keep DnD-kit state fresh; no side-effects needed
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
  };

  // New handler for when a drag operation moves
  // Could be used for live feedback while dragging (kept minimal for readability)
  const handleDragMove = (event: DragMoveEvent) => {
    // Intentionally left blank
  };

  // Modify the handleDragEnd function with manual drop detection
  // When dropping, either add a new component to the canvas or insert near an existing one
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveComponent(null);

    

    // Manual drop detection if dnd-kit's detection fails
    // Fallback heuristic when DnD-kit fails to detect drop over the canvas
    const manualDetection = () => {
      // Get the canvas element's boundaries
      const element = canvasRef.current;
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      
      // Get the pointer position from the event
      const { clientX, clientY } = event.activatorEvent as PointerEvent;
      
      
      
      // Determine if user dragged from sidebar toward the canvas area
      const deltaX = event.delta.x;
      const deltaY = event.delta.y;
      
      
      
      // If dragged significantly rightward (from sidebar toward canvas)
      // AND cursor is within reasonable vertical range of the canvas
      const isDraggingTowardCanvas = deltaX > 100; // Dragged right significantly
      const isWithinVerticalRange = clientY >= rect.top - 50 && clientY <= rect.bottom + 50;
      
      const isLikelyIntendedForCanvas = isDraggingTowardCanvas && isWithinVerticalRange;
      
      
      
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
          config:
            componentType === 'procurementTable'
              ? ({
                  ...DEFAULT_PROCUREMENT_TABLE_CONFIG,
                  columns: [...DEFAULT_PROCUREMENT_TABLE_CONFIG.columns],
                } as ComponentConfig)
              : componentType === 'pendingApprovalTable'
                ? ({
                    ...DEFAULT_PENDING_APPROVAL_TABLE_CONFIG,
                    columns: [...DEFAULT_PENDING_APPROVAL_TABLE_CONFIG.columns],
                  } as ComponentConfig)
              : componentType === 'rejectedTable'
                ? ({
                    ...DEFAULT_REJECTED_TABLE_CONFIG,
                    columns: [...DEFAULT_REJECTED_TABLE_CONFIG.columns],
                  } as ComponentConfig)
              : componentType === 'vendorIdentifiedTable'
                ? ({
                    ...DEFAULT_VENDOR_IDENTIFIED_TABLE_CONFIG,
                    columns: [...DEFAULT_VENDOR_IDENTIFIED_TABLE_CONFIG.columns],
                  } as ComponentConfig)
              : componentType === 'procurementDashboard'
                ? ({ ...DEFAULT_PROCUREMENT_DASHBOARD_CONFIG } as ComponentConfig)
              : componentType === 'procurementRequestForm'
                ? ({ entityType: 'unmannd_request' } as ComponentConfig)
                : {},
        };

        // Add the new component to the canvas state
        setCanvasComponents((prev) => [...prev, newComponent]);
      } else {
        // Unknown component type: ignore drop
      }
    } 
    // ADD THIS SECTION to handle drops onto existing components
    else if (over && typeof over.id === 'string' && over.id.includes('-')) {
      // This is likely a component ID (they have format like "container-1234567890")
      const componentType = String(active.id);
      if (!componentMap[componentType]) {
        
        return;
      }

      const newComponent: CanvasComponentData = {
        id: `${componentType}-${Date.now()}`,
        type: componentType,
        props: {},
        config:
          componentType === 'procurementTable'
            ? ({
                ...DEFAULT_PROCUREMENT_TABLE_CONFIG,
                columns: [...DEFAULT_PROCUREMENT_TABLE_CONFIG.columns],
              } as ComponentConfig)
            : componentType === 'pendingApprovalTable'
              ? ({
                  ...DEFAULT_PENDING_APPROVAL_TABLE_CONFIG,
                  columns: [...DEFAULT_PENDING_APPROVAL_TABLE_CONFIG.columns],
                } as ComponentConfig)
            : componentType === 'rejectedTable'
              ? ({
                  ...DEFAULT_REJECTED_TABLE_CONFIG,
                  columns: [...DEFAULT_REJECTED_TABLE_CONFIG.columns],
                } as ComponentConfig)
            : componentType === 'vendorIdentifiedTable'
              ? ({
                  ...DEFAULT_VENDOR_IDENTIFIED_TABLE_CONFIG,
                  columns: [...DEFAULT_VENDOR_IDENTIFIED_TABLE_CONFIG.columns],
                } as ComponentConfig)
            : componentType === 'procurementDashboard'
              ? ({ ...DEFAULT_PROCUREMENT_DASHBOARD_CONFIG } as ComponentConfig)
            : componentType === 'procurementRequestForm'
              ? ({ entityType: 'unmannd_request' } as ComponentConfig)
              : {},
      };

      // Find the index of the component we dropped on
      const targetId = over.id as string;
      const targetIndex = canvasComponents.findIndex(comp => comp.id === targetId);
      
      if (targetIndex !== -1) {
        // Always insert above the target component (at target index)
        // This ensures the new component appears on top when dropped on an existing component
        setCanvasComponents(prev => {
          const newList = [...prev];
          newList.splice(targetIndex, 0, newComponent);
          return newList;
        });
      } else {
        // Fallback: Add to end
        setCanvasComponents(prev => [...prev, newComponent]);
      }
    }
    else {
      // Drop outside valid targets: no state change
    }
  };

  // Function to get the overlay component when dragging
  const getDragOverlay = () => {
    if (!activeComponent) return null;
    
    return (
      <div className="p-2 bg-foreground text-background rounded-md shadow-lg text-sm font-medium">
        Dragging: {activeComponent}
      </div>
    );
  };

  // Function to handle component deletion
  const handleDeleteComponent = (idToDelete: string) => {
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
      // 1. Build the payload matching your Python backend Serializer
      // Ensure every field is present so the backend doesn't overwrite them with defaults
      const pageData: any = {
        name: pageName.trim(),
        config: canvasComponents, 
        role: selectedRole || null,
        display_order: Number(displayOrder), // Force number type
        icon_name: pageIcon,
        header_title: headerTitle.trim() || "", // Always include, even if empty string
      };

      // 2. Send to Render API
      if (pageId && pageId !== 'new') {
        // UPDATE an existing page (PATCH/PUT)
        await pageService.updatePage(pageId, pageData);
        toast.success("Page updated successfully!");
      } else {
        // CREATE a new page (POST)
        const response = await pageService.createPage(pageData);
        
        // Handle nested response data if necessary
        const newPage = (response as any).data || response;
        
        toast.success("Page created successfully!");
        
        if (newPage?.id) {
          navigate(`/builder/${newPage.id}`, { replace: true });
        }
      }

    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(`Error saving page: ${error.message || 'Failed to save via API'}`);
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
        <header className="border-b border-border px-6 py-3 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="Page Name"
                className="w-1/3 text-sm font-medium border-border"
              />
              <Input
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Header Title"
                className="w-1/3 text-sm font-medium border-border"
              />
               <div className="flex items-center gap-2 px-2 border-l border-border">
              <Label htmlFor="order" className="text-[10px] uppercase font-bold text-muted-foreground">Order</Label>
              <Input
              id="order"
              type="number"
              value={displayOrder === 0 ? "" : displayOrder}
              onChange={(e) => {
                const val = e.target.value;
                setDisplayOrder(val === "" ? 0 : parseInt(val, 10));
                }}
                // Added Tailwind classes to hide the arrows (spinners)
                className="w-16 h-9 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              </div>
              {/* Visual Icon Picker */}
              <div className="flex items-center gap-2 px-2 border-l border-border">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Icon</Label>
              <Popover>
                <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 w-10 p-0 flex items-center justify-center border-border">
                <DynamicIcon name={pageIcon} className="h-4 w-4" customIcons={customIcons} />
                </Button>
                </PopoverTrigger>
    
                <PopoverContent className="w-72 p-0 shadow-xl border-border bg-background" align="start">
                <div className="p-3 border-b space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Select Icon</p>
                <Input 
                  placeholder="Search icons..." 
                  className="h-8 text-xs" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
      
                <ScrollArea className="h-64 p-3">
                {/* --- SECTION 1: CUSTOM ICONS (TOP) --- */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] text-muted-foreground uppercase font-medium">
                      Custom Icons ({filteredCustomIcons.length})
                    </p>
    
                    <div className="relative">
                      <Input 
                      type="file" 
                      accept=".svg" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      onChange={handleIconUpload}
                      disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={isUploading}>
                        <Upload className="h-3 w-3 mr-1" />
                        {isUploading ? 'Uploading...' : 'Upload SVG'}
                      </Button>
                    </div>
                  </div>

                  {filteredCustomIcons.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mb-4 pb-4 border-b">
                    {filteredCustomIcons.map((icon) => (
                    <button
                    key={icon.id}
                    type="button"
                    onClick={() => setPageIcon(icon.name)}
                    className={`flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-muted ${
                    pageIcon === icon.name ? "bg-primary/10 border border-primary" : "border border-transparent"
                    }`}
                    title={icon.name}
                    >
                    <DynamicIcon name={icon.name} customIcons={customIcons} className="h-5 w-5 text-foreground" />
                    </button>
                    ))}
                  </div>
                  )}

                  {/* --- SECTION 2: LIBRARY ICONS (BOTTOM) --- */}
                  <p className="text-[9px] text-muted-foreground mb-2 uppercase font-medium">
                    Library Icons (Showing {filteredIcons.length})
                  </p>

                  <div className="grid grid-cols-5 gap-2">
                    {filteredIcons.length > 0 ? (
                    filteredIcons.map((iconKey) => (
                    <button
                    key={iconKey}
                    type="button"
                    onClick={() => setPageIcon(iconKey)}
                    className={`flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-muted ${
                    pageIcon === iconKey ? "bg-primary/10 border border-primary" : "border border-transparent"
                    }`}
                    title={iconKey}
                    >
                    <DynamicIcon name={iconKey} customIcons={customIcons} className="h-5 w-5 text-foreground" />
                    </button>
                    ))
                    ) : (
                    /* Only show this "No results" if BOTH sections are empty */
                    filteredCustomIcons.length === 0 && (
                    <div className="col-span-5 py-8 text-center">
                      <p className="text-xs text-muted-foreground">No icons found for "{searchTerm}"</p>
                    </div>
                    )
                    )}
                  </div>
  
                  {/* Load More Button - Only for Standard Library */}
                  {filteredIcons.length < (searchTerm ? AVAILABLE_ICONS.filter(i => i.toLowerCase().includes(searchTerm.toLowerCase())).length : AVAILABLE_ICONS.length) && (
                  <div className="mt-4 pb-2">
                    <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-[10px] h-8 border-dashed hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => setVisibleIconsCount(prev => prev + 100)}
                    >
                    Load More Icons (+100)
                    </Button>
                  </div>
                  )}
                </ScrollArea>
                </PopoverContent>
              </Popover>
              </div>
              <CustomButton variant="outline" size="sm" icon={<Eye className="h-4 w-4" />} className="border-border text-foreground hover:bg-muted">
                Preview
              </CustomButton>
              <select
                id="role"
                className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground"
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
              <CustomButton variant="default" size="sm" onClick={handleSavePage} disabled={isSaving} loading={isSaving} icon={!isSaving ? <Save className="h-4 w-4" /> : undefined}>
                Save
              </CustomButton>
            </div>
          </div>
        </header>

        {/* Builder Content (Sidebar + Canvas) - Now wrapped */}
        <div className="flex-1 flex">
          {/* Left Sidebar - Components & Settings */}
          <div className="w-[300px] border-r border-border flex flex-col bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-border">
                <TabsList className="w-full rounded-none h-12 bg-muted/50 p-0 gap-0">
                  <TabsTrigger value="components" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground font-medium text-sm">
                    Components
                  </TabsTrigger>
                  <TabsTrigger value="layers" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground font-medium text-sm">
                    Layers
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground font-medium text-sm">
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="components" className="m-0 p-0 h-full">
                  <div className="p-4 space-y-4">
                    {/* Layout Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Layout Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="container"
                          label="Container"
                          icon={<Layout className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="split"
                          label="Split View"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="collapseCard"
                          label="Collapse Card"
                          icon={<ChevronDown className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadCarousel"
                          label="Lead Carousel"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="ticketCarousel"
                          label="Ticket Carousel"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="ticketBarGraph"
                          label="Ticket Bar Graph"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="progressBar"
                          label="Progress Bar"
                          icon={<AlignCenter className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadProgressBar"
                          label="Lead Progress Bar"
                          icon={<Target className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="cseProgressBar"
                          label="CSE Progress Bar"
                          icon={<Target className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadAssignment"
                          label="Lead Groups"
                          icon={<Target className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="callAttemptMatrix"
                          label="Call Attempt Matrix"
                          icon={<Settings className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="temporaryLogout"
                          label="Temporary Logout"
                          icon={<LogOut className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Data Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Data Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="form"
                          label="Form"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="table"
                          label="Table"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="dataCard"
                          label="Data Card"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="leadTable"
                          label="Lead Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="inventoryTable"
                          label="Records Table (API)"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="procurementTable"
                          label="Procurement Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="myRequestTable"
                          label="My Request Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="pendingApprovalTable"
                          label="Pending Approval Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="rejectedTable"
                          label="Rejected Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="vendorIdentifiedTable"
                          label="Vendor Identified Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="procurementDashboard"
                          label="Procurement Dashboard"
                          icon={<LayoutDashboard className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="dispatchCardList"
                          label="Dispatch Card List"
                          icon={<Truck className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="dispatchDashboard"
                          label="Dispatch Dashboard"
                          icon={<LayoutDashboard className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="inventoryRequestForm"
                          label="Inventory Request Form"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="procurementRequestForm"
                          label="Procurement Request Form"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="oeLeadsTable"
                          label="OE Leads Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="ticketTable"
                          label="Ticket Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="addUser"
                          label="Add User"
                          icon={<User className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="openModalButton"
                          label="Modal Button"
                          icon={<MousePointer className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="jobManager"
                          label="Job Manager"
                          icon={<Briefcase className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="jobsPage"
                          label="Jobs Board"
                          icon={<Users className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="applicantTable"
                          label="Applicant Table"
                          icon={<Table className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="fileUpload"
                          label="File Upload"
                          icon={<Upload className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="dynamicScoring"
                          label="Dynamic Scoring"
                          icon={<Calculator className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="whatsappTemplate"
                          label="WhatsApp Template"
                          icon={<MessageSquare className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>
                    <Separator />
                    {/* Analytical Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Analytical Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="stackedBarChart"
                          label="Stacked Bar Chart"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="lineChart"
                          label="Line Chart"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="barGraph"
                          label="Bar Graph"
                          icon={<Grid3X3 className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Basic Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Basic Components</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="text"
                          label="Text"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="button"
                          label="Button"
                          icon={<Layers className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="image"
                          label="Image"
                          icon={<ImageIcon className="h-8 w-8 mb-1 text-foreground" />}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Analytics Components */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-foreground">Analytics</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <DraggableSidebarItem
                          id="barGraph"
                          label="Bar Graph"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="lineChart"
                          label="Line Chart"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="stackedBarChart"
                          label="Stacked Bar"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="teamDashboard"
                          label="Team Dashboard"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="analyticsBoard"
                          label="Analytics Board"
                          icon={<TrendingUp className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="operationsPrograms"
                          label="Operations & Programs"
                          icon={<Database className="h-8 w-8 mb-1 text-foreground" />}
                        />
                        <DraggableSidebarItem
                          id="userHierarchy"
                          label="User Hierarchy"
                          icon={<Users className="h-8 w-8 mb-1 text-primary" />}
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
            className={`flex-1 bg-muted/30 overflow-visible border-2 border-border ${
              isOver ? 'border-foreground border-dashed' : 'border-dashed'
            } flex-1 flex flex-col bg-background shadow-sm ${
              activeDragId ? 'ring-2 ring-foreground/20' : ''
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
              className={`flex-1 flex flex-col ${
                isOver ? 'bg-muted/50 transition-colors duration-150' : ''
              }`}
            >
              {/* Render dropped components OR placeholder */}
              {canvasComponents.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground flex-1">
                  <Grid3X3 className="h-12 w-12 mb-4" />
                  <p className="text-body-lg-medium">
                    Drop components here
                  </p>
                  <p className="text-body-sm mt-1">
                    Drag from the sidebar onto this area
                  </p>
                  <div className="mt-6">
                    <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                      Choose a Template
                    </Button>
                  </div>
                </div>
              ) : (
                // Render the actual components from state, wrapped in DroppableCanvasItem to enable selection/deletion
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
                      <ComponentToRender {...component.props} config={component.config} pageId={pageId} />
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

      {/* Add the configuration panel */}
      {selectedComponentId && (
        <ConfigurationPanel
          key={selectedComponentId}
          selectedComponent={canvasComponents.find(c => c.id === selectedComponentId) || {} as CanvasComponentData}
          setCanvasComponents={setCanvasComponents}
          onClose={() => setSelectedComponentId(null)}
        />
      )}
    </DndContext>
  );
};

export default PageBuilder;
