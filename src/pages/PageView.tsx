
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

interface Page {
  id: number;
  title: string;
  description: string;
  lastEdited: string;
  type: string;
  status: string;
  content?: string;
}

// Mock data until we get real data from Supabase
const mockPages = [
  {
    id: 1,
    title: "Active Task View",
    description: "Detailed view of tasks with contact information",
    lastEdited: "2 hours ago",
    type: "Task Page",
    status: "published",
    content: "<h1>Task View Content</h1><p>This is a sample task view page showing all the details of a specific task.</p>",
  },
  {
    id: 2,
    title: "All Leads",
    description: "Overview of all leads with filtering options",
    lastEdited: "Yesterday",
    type: "List View",
    status: "published",
    content: "<h1>Leads List Content</h1><p>This is a sample leads list page with filtering and sorting capabilities.</p>",
  },
  {
    id: 3,
    title: "Sales Pipeline",
    description: "Visual kanban board of sales opportunities",
    lastEdited: "3 days ago",
    type: "Dashboard",
    status: "draft",
    content: "<h1>Sales Pipeline</h1><p>This is a kanban board showing all sales opportunities in different stages.</p>",
  },
  {
    id: 4,
    title: "Client Contact Details",
    description: "Contact information with communication history",
    lastEdited: "1 week ago",
    type: "Profile Page",
    status: "published",
    content: "<h1>Client Profile</h1><p>This page displays detailed client information and communication history.</p>",
  },
  {
    id: 5,
    title: "Meeting Notes",
    description: "Template for recording meeting notes with clients",
    lastEdited: "2 weeks ago",
    type: "Form",
    status: "draft",
    content: "<h1>Meeting Notes Form</h1><p>Use this form to record notes during client meetings.</p>",
  },
];

const fetchPageById = async (id: string) => {
  // In a real implementation, we would fetch from Supabase
  // const { data, error } = await supabase
  //   .from('pages')
  //   .select('*')
  //   .eq('id', id)
  //   .single();
  
  // if (error) throw error;
  // return data;
  
  // For now, use mock data
  const page = mockPages.find((p) => p.id === parseInt(id));
  if (!page) throw new Error("Page not found");
  return page;
};

const PageView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['page', id],
    queryFn: () => fetchPageById(id as string),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !page) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/pages')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pages
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The page you're looking for doesn't exist or has been removed.
                </p>
                <Button asChild>
                  <Link to="/pages">View All Pages</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/pages')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pages
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
              <p className="text-muted-foreground mt-1">
                {page.type} • Last edited {page.lastEdited}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to={`/builder/edit/${page.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Page
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div 
              className="prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content || '<p>No content available</p>' }}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PageView;
