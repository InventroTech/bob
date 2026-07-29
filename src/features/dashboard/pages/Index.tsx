
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layout, Grid3X3, Users, BookOpen, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const actionCards = [
    {
      title: "Components Library",
      description: "Browse and select from our collection of reusable SaaS components",
      icon: Grid3X3,
      link: "/components",
      color: "bg-blue-50 text-blue-500 dark:bg-blue-900 dark:text-blue-300",
    },
    {
      title: "Create New Page",
      description: "Build a custom page using our drag-and-drop builder",
      icon: Plus,
      link: "/builder/new",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    {
      title: "Templates",
      description: "Start with a pre-built template designed for common CRM needs",
      icon: BookOpen,
      link: "/templates",
      color: "bg-amber-50 text-amber-500 dark:bg-amber-900 dark:text-amber-300",
    },
    {
      title: "Manage Leads",
      description: "View and manage your leads database",
      icon: Users,
      link: "/leads",
      color: "bg-emerald-50 text-emerald-500 dark:bg-emerald-900 dark:text-emerald-300",
    },
  ];

  const recentPages = [
    {
      id: 1,
      title: "Active Task View",
      type: "Task Page",
      updatedAt: "2 hours ago",
    },
    {
      id: 2,
      title: "All Leads",
      type: "Leads List",
      updatedAt: "Yesterday",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3>Welcome to BOB by Pyro</h3>
            <p className="text-muted-foreground mt-1">
              Build, customize, and manage your CRM pages
            </p>
          </div>
          <Button asChild>
            <Link to="/builder/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Page
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {actionCards.map((card) => (
            <Card key={card.title} className="border border-border">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <Link to={card.link}>Get Started</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Pages</CardTitle>
              <CardDescription>
                Your recently edited custom pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-crm-light dark:bg-crm-dark p-2 rounded-md">
                        <Layout className="h-5 w-5 text-crm-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {page.type} • Updated {page.updatedAt}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/pages/${page.id}`}>Open</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link to="/pages">View All Pages</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Quick tips to help you build your CRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 text-blue-500 p-1 rounded-md mt-0.5">
                    <Grid3X3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Browse Components</p>
                    <p className="text-sm text-muted-foreground">
                      Explore our library of components to build your pages
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-gray-100 text-gray-700 p-1 rounded-md mt-0.5">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Create Custom Pages</p>
                    <p className="text-sm text-muted-foreground">
                      Build pages from scratch using drag-and-drop
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-amber-50 text-amber-500 p-1 rounded-md mt-0.5">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Use Templates</p>
                    <p className="text-sm text-muted-foreground">
                      Start with ready-made templates for common use cases
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View Tutorial
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
