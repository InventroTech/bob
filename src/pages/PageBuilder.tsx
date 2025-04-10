
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

const PageBuilder = () => {
  const [pageName, setPageName] = useState("Untitled Page");
  const [activeTab, setActiveTab] = useState("components");

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
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button size="sm">
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
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Layout Components</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="draggable-component cursor-grab border-dashed">
                        <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                          <Layout className="h-8 w-8 mb-1 text-primary" />
                          <p className="text-sm font-medium">Container</p>
                        </CardContent>
                      </Card>
                      <Card className="draggable-component cursor-grab border-dashed">
                        <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                          <AlignCenter className="h-8 w-8 mb-1 text-primary" />
                          <p className="text-sm font-medium">Split View</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Data Components</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="draggable-component cursor-grab border-dashed">
                        <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                          <Layers className="h-8 w-8 mb-1 text-primary" />
                          <p className="text-sm font-medium">Form</p>
                        </CardContent>
                      </Card>
                      <Card className="draggable-component cursor-grab border-dashed">
                        <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                          <Layers className="h-8 w-8 mb-1 text-primary" />
                          <p className="text-sm font-medium">Table</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Basic Components</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="draggable-component cursor-grab border-dashed">
                        <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                          <Layers className="h-8 w-8 mb-1 text-primary" />
                          <p className="text-sm font-medium">Text</p>
                        </CardContent>
                      </Card>
                      <Card className="draggable-component cursor-grab border-dashed">
                        <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                          <Layers className="h-8 w-8 mb-1 text-primary" />
                          <p className="text-sm font-medium">Button</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="layers" className="m-0 p-4 h-full">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Drag to reorder layers</p>
                  <div className="space-y-2">
                    {["Container", "Header", "Form", "Button Group"].map((layer, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-background border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          <span>{layer}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
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
                    <p className="text-sm text-muted-foreground">Select a component to edit its properties</p>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 bg-muted/30 overflow-auto">
          <div className="min-h-full p-8 flex flex-col items-center justify-center">
            <Card className="w-full max-w-4xl border-2 border-dashed">
              <CardHeader className="border-b bg-muted/40">
                <CardTitle className="text-center text-muted-foreground">
                  Drop components here to build your page
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="drop-target flex flex-col items-center justify-center p-8 text-center">
                  <Grid3X3 className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Drag components from the sidebar
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Or select a template to get started quickly
                  </p>
                  <div className="mt-6">
                    <Button variant="outline">
                      Choose a Template
                    </Button>
                  </div>
                </div>
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
    </div>
  );
};

export default PageBuilder;
