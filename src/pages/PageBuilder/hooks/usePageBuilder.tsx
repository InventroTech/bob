
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  AlignCenter,
  CheckSquare,
  FileText,
  FormInput,
  Image,
  Layout,
  List,
  Table,
  Type,
} from "lucide-react";
import { ComponentCategory, PageTemplate } from "../types";

export const usePageBuilder = () => {
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
  const componentCategories: ComponentCategory[] = [
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

  return {
    templates,
    componentCategories
  };
};
