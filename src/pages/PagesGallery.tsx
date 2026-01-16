
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
import {
  Eye,
  File,
  Grid3X3,
  Layout,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const PagesGallery = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const customPages = [
    {
      id: 1,
      title: "Active Task View",
      description: "Detailed view of tasks with contact information",
      lastEdited: "2 hours ago",
      type: "Task Page",
      status: "published",
    },
    {
      id: 2,
      title: "All Leads",
      description: "Overview of all leads with filtering options",
      lastEdited: "Yesterday",
      type: "List View",
      status: "published",
    },
    {
      id: 3,
      title: "Sales Pipeline",
      description: "Visual kanban board of sales opportunities",
      lastEdited: "3 days ago",
      type: "Dashboard",
      status: "draft",
    },
    {
      id: 4,
      title: "Client Contact Details",
      description: "Contact information with communication history",
      lastEdited: "1 week ago",
      type: "Profile Page",
      status: "published",
    },
    {
      id: 5,
      title: "Meeting Notes",
      description: "Template for recording meeting notes with clients",
      lastEdited: "2 weeks ago",
      type: "Form",
      status: "draft",
    },
  ];

  const filteredPages = customPages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === "published") {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Published</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3>My Pages</h3>
            <p className="text-muted-foreground mt-1">
              Manage all of your custom CRM pages
            </p>
          </div>
          <Button asChild>
            <Link to="/builder/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Page
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Pages</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search pages..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((page) => (
            <Card key={page.id} className="border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="bg-muted p-2 rounded-md">
                    <Layout className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <File className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-lg mt-2">{page.title}</CardTitle>
                <CardDescription>{page.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{page.type}</span>
                  </div>
                  {getStatusBadge(page.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last edited {page.lastEdited}
                </p>
              </CardContent>
              <CardFooter className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to={`/pages/${page.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to={`/builder/edit/${page.id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}

          <Card className="border border-dashed border-muted hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-1">Create New Page</h3>
              <p className="text-muted-foreground mb-4">
                Build a custom page from scratch or use a template
              </p>
              <Button asChild>
                <Link to="/builder/new">Get Started</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PagesGallery;
