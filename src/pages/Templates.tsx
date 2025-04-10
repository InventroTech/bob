
import React from "react";
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
import { Link } from "react-router-dom";
import { List, Eye, Copy, Grid, User, Calendar, CheckSquare } from "lucide-react";

const Templates = () => {
  const templates = [
    {
      id: "task",
      title: "Active Task Page",
      description: "A detailed view of a single lead or task with related information and actions.",
      icon: CheckSquare,
      color: "bg-purple-50 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
      path: "/task-template",
    },
    {
      id: "leads",
      title: "Leads List Page",
      description: "A comprehensive view of all leads with filtering, sorting, and quick actions.",
      icon: List,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
      path: "/leads-template",
    },
    {
      id: "profile",
      title: "Contact Profile",
      description: "Detailed contact information with history, notes, and related tasks.",
      icon: User,
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900 dark:text-amber-300",
      path: "/",
    },
    {
      id: "dashboard",
      title: "Sales Dashboard",
      description: "Overview of key metrics, recent activities, and upcoming tasks.",
      icon: Grid,
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300",
      path: "/",
    },
    {
      id: "calendar",
      title: "Calendar View",
      description: "Schedule and manage appointments, deadlines, and follow-ups.",
      icon: Calendar,
      color: "bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-300",
      path: "/",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Pre-built page templates to jumpstart your CRM setup
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${template.color}`}>
                  <template.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to={template.path}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to={`/builder/templates/${template.id}`}>
                    <Copy className="mr-2 h-4 w-4" />
                    Use Template
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Templates;
