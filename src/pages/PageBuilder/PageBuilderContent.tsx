
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { Link } from "react-router-dom";
import BuilderHeader from "./components/BuilderHeader";
import ComponentsSidebar from "./components/ComponentsSidebar";
import BuilderCanvas from "./components/BuilderCanvas";
import TemplateDialog from "./components/TemplateDialog";
import { usePageBuilder } from "./hooks/usePageBuilder";
import { ComponentItem, PageTemplate } from "./types";

const PageBuilderContent = () => {
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
  
  const { templates, componentCategories } = usePageBuilder();

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
  }, [template, id, templates]);

  // Handle component drag events
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, componentType: string, category: string) => {
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Builder Header */}
      <BuilderHeader 
        pageName={pageName}
        setPageName={setPageName}
        onSave={handleSavePage}
        onPreview={handlePreviewPage}
      />

      {/* Builder Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Components & Settings */}
        <ComponentsSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          components={components}
          selectedComponent={selectedComponent}
          handleComponentSelect={handleComponentSelect}
          handleComponentRemove={handleComponentRemove}
          handleDragStart={handleDragStart}
          pageName={pageName}
          setPageName={setPageName}
          componentCategories={componentCategories}
        />

        {/* Main Canvas */}
        <BuilderCanvas
          components={components}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleComponentSelect={handleComponentSelect}
          handleComponentRemove={handleComponentRemove}
          selectedComponent={selectedComponent}
          canvasRef={canvasRef}
          pageName={pageName}
          setIsTemplateDialogOpen={setIsTemplateDialogOpen}
        />
      </div>

      {/* Template Selection Dialog */}
      <TemplateDialog
        isOpen={isTemplateDialogOpen}
        setIsOpen={setIsTemplateDialogOpen}
        templates={templates}
        setPageName={setPageName}
        setComponents={setComponents}
      />
    </div>
  );
};

export default PageBuilderContent;
