import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  AlignCenter,
  Calendar,
  ChevronDown,
  Grid,
  Image as ImageIcon,
  Layout,
  LayoutGrid,
  List,
  ListChecks,
  PanelLeft,
  Pencil,
  Table,
  Type,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ContainerComponent,
  SplitViewComponent,
  FormComponent,
  TableComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
} from "@/components/page-builder"; // Import placeholder components
import LeadCardTemplate from "@/builder/templates/lead-card";
import { LeadCardComponent } from "@/components/page-builder/LeadCardComponent";
import { DataCardComponent } from "@/components/page-builder/DataCardComponent";
// Map component IDs to actual components
const componentMap: Record<string, React.FC<any>> = {
  container: ContainerComponent,
  split: SplitViewComponent,
  leadCard: LeadCardComponent,
  dataCard: DataCardComponent,
  // card: CardComponent, // Assuming Card is a layout variation or uses Container
  // grid: GridComponent, // Assuming Grid is a layout variation or uses Container
  table: TableComponent,
  // list: ListComponent, // Placeholder, implement if needed
  // kanban: KanbanComponent, // Placeholder, implement if needed
  // calendar: CalendarComponent, // Placeholder, implement if needed
  "text-input": (props: any) => <Input {...props} placeholder="Text Input" />, // Use ShadCN Input for preview
  form: FormComponent,
  // datepicker: DatePickerComponent, // Placeholder, implement if needed
  alert: (props: any) => (
    <div className="border border-dashed border-red-400 p-4">
      <p className="text-xs text-red-500 mb-1">Alert</p>
      <div className="flex items-center gap-2 bg-yellow-100 p-2 rounded border border-yellow-300 text-yellow-800">
        <AlertTriangle className="h-5 w-5" />
        <span>Alert Message Placeholder</span>
      </div>
    </div>
  ), // Placeholder preview for Alert
  text: TextComponent,
  image: ImageComponent,
  // avatar: AvatarComponent, // Placeholder, implement if needed
  button: ButtonComponent, // Need to map button id if different
};

// Define the structure for a component definition
interface ComponentDefinition {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

const ComponentsLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewComponent, setPreviewComponent] = useState<ComponentDefinition | null>(null);

  const componentCategories = [
    {
      id: "layout",
      name: "Layout",
      icon: LayoutGrid,
      components: [
        {
          id: "container",
          name: "Container",
          icon: Layout,
          description: "A centered container with responsive padding",
        },
        {
          id: "card",
          name: "Card",
          icon: PanelLeft,
          description: "A container for content with header, body, and footer sections",
        },
        {
          id: "split",
          name: "Split View",
          icon: AlignCenter,
          description: "A two-column layout with customizable widths",
        },
        {
          id: "grid",
          name: "Grid Layout",
          icon: Grid,
          description: "A responsive grid system for organizing content",
        },
        {
          id: "leadCard",
          name: "Lead Card",
          icon: User,
          description: "A card for displaying lead information",
        }
      ],
    },
    {
      id: "data",
      name: "Data",
      icon: Table,
      components: [
        {
          id: "table",
          name: "Data Table",
          icon: Table,
          description: "Display data in rows and columns with sorting and filtering",
        },
        {
          id: "list",
          name: "List View",
          icon: List,
          description: "Display data in a vertical list format",
        },
        {
          id: "kanban",
          name: "Kanban Board",
          icon: ListChecks,
          description: "Organize tasks or items in a Kanban-style board",
        },
        {
          id: "calendar",
          name: "Calendar View",
          icon: Calendar,
          description: "Display events or tasks in a calendar format",
        },
        {
          id: "dataCard",
          name: "Data Card",
          icon: Table,
          description: "A card for displaying data",
        },
        {
          id: "leadTable",
          name: "Lead Table",
          icon: Table,
          description: "A table for displaying lead information",
        }
      ],
    },
    {
      id: "input",
      name: "Input",
      icon: Pencil,
      components: [
        {
          id: "text-input",
          name: "Text Input",
          icon: Type,
          description: "Single-line text input field",
        },
        {
          id: "form",
          name: "Form",
          icon: Pencil,
          description: "A complete form with validation and submission handling",
        },
        {
          id: "datepicker",
          name: "Date Picker",
          icon: Calendar,
          description: "Input for selecting dates with a calendar interface",
        },
        {
          id: "alert",
          name: "Alert",
          icon: AlertTriangle,
          description: "Display important messages to users",
        },
      ],
    },
    {
      id: "display",
      name: "Display",
      icon: Type,
      components: [
        {
          id: "text",
          name: "Text",
          icon: Type,
          description: "Display formatted text content",
        },
        {
          id: "image",
          name: "Image",
          icon: ImageIcon,
          description: "Display and format images with optional captions",
        },
        {
          id: "avatar",
          name: "Avatar",
          icon: ImageIcon,
          description: "Display user images or initials in a circular format",
        },
        {
          id: "collapseCard",
          name: "Collapse Card",
          icon: ChevronDown,
          description: "A collapsible card with a header and content",
        }
      ],
    },
    {
      id: "action", // Add an Action category if needed, or put Button here
      name: "Action",
      icon: Grid, // Example icon
      components: [
        {
          id: "button",
          name: "Button",
          icon: Grid, // Placeholder icon, replace if needed
          description: "Trigger actions or navigation",
        },
      ]
    }
  ];

  const filteredCategories = componentCategories.map((category) => ({
    ...category,
    components: category.components.filter((component) =>
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.components.length > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Components Library</h1>
            <p className="text-muted-foreground mt-1">
              Browse and use components to build your CRM pages
            </p>
          </div>
          <div className="w-full md:w-auto">
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-[300px]"
            />
          </div>
        </div>

        <Tabs defaultValue="layout" className="w-full">
          <div className="border-b">
            <TabsList className="rounded-none bg-transparent border-b border-transparent gap-4 h-auto">
              {componentCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className={cn(
                    "pb-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "border-b-2 border-transparent data-[state=active]:border-primary"
                  )}
                >
                  <category.icon className="h-4 w-4 mr-2" />
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {componentCategories.map((category) => (
            <TabsContent
              key={category.id}
              value={category.id}
              className="mt-6 space-y-4"
            >
              <div className="component-grid">
                {(searchQuery ? filteredCategories.find(c => c.id === category.id)?.components : category.components)?.map((component) => (
                  <Card
                    key={component.id}
                    className="border border-border hover:border-primary/50 transition-colors draggable-component"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-md bg-crm-light dark:bg-crm-dark">
                          <component.icon className="h-5 w-5 text-crm-primary" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="sr-only">Drag to add to page</span>
                          <Grid className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardTitle className="text-lg mt-2">{component.name}</CardTitle>
                      <CardDescription>{component.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setPreviewComponent(component)}
                      >
                        Preview
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              {searchQuery && filteredCategories.find(c => c.id === category.id)?.components.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No components match your search.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewComponent} onOpenChange={(open) => !open && setPreviewComponent(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{previewComponent?.name} Preview</DialogTitle>
            <DialogDescription>
              This is a basic preview of the {previewComponent?.name} component.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {previewComponent && componentMap[previewComponent.id] ? (
              React.createElement(componentMap[previewComponent.id])
            ) : (
              <p className="text-muted-foreground text-center">Preview not available for this component yet.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default ComponentsLibrary;
