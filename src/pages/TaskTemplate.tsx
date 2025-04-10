
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
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Edit2,
  MoreHorizontal,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

const TaskTemplate = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link to="/leads">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Follow Up with John Smith</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Contact
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
                <CardDescription>Information about this follow-up task</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-full">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">April 15, 2025 at 3:00 PM</p>
                    </div>
                  </div>
                  <Badge className="w-fit" variant="outline">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      Medium Priority
                    </div>
                  </Badge>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">
                    Follow up with John regarding the proposal we sent last week. Discuss pricing options and timeline considerations.
                    Be prepared to address questions about implementation and support.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Notes</h3>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">Initial Contact</p>
                        <p className="text-xs text-muted-foreground">April 5, 2025</p>
                      </div>
                      <p className="text-sm">John expressed interest in our premium plan but had concerns about the implementation timeline.</p>
                    </div>
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">Proposal Sent</p>
                        <p className="text-xs text-muted-foreground">April 8, 2025</p>
                      </div>
                      <p className="text-sm">Sent comprehensive proposal with three pricing tiers and implementation options.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button variant="outline">Add Note</Button>
                <Button>
                  <Check className="mr-2 h-4 w-4" />
                  Mark as Complete
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l">
                  {[
                    {
                      date: "April 10, 2025",
                      title: "Email Sent",
                      description: "Follow-up email sent with additional information"
                    },
                    {
                      date: "April 8, 2025",
                      title: "Proposal Sent",
                      description: "Sent initial proposal with pricing details"
                    },
                    {
                      date: "April 5, 2025",
                      title: "Discovery Call",
                      description: "30-minute call to discuss requirements"
                    }
                  ].map((activity, i) => (
                    <div key={i} className="mb-6 relative">
                      <div className="absolute -left-[23px] w-4 h-4 rounded-full bg-primary"></div>
                      <p className="text-xs text-muted-foreground mb-1">{activity.date}</p>
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-lg">JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-lg">John Smith</h3>
                    <p className="text-sm text-muted-foreground">Technology Director at Acme Inc.</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>john.smith@acme.example.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>(555) 123-4567</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  View Full Profile
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Related Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tasks">
                  <TabsList className="w-full">
                    <TabsTrigger value="tasks" className="flex-1">Tasks</TabsTrigger>
                    <TabsTrigger value="deals" className="flex-1">Deals</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tasks" className="mt-4 space-y-2">
                    <div className="p-3 border rounded-md">
                      <p className="font-medium">Product Demo</p>
                      <p className="text-xs text-muted-foreground">Due April 20, 2025</p>
                    </div>
                    <div className="p-3 border rounded-md">
                      <p className="font-medium">Contract Review</p>
                      <p className="text-xs text-muted-foreground">Due April 25, 2025</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="deals" className="mt-4 space-y-2">
                    <div className="p-3 border rounded-md">
                      <p className="font-medium">Enterprise Subscription</p>
                      <p className="text-xs text-muted-foreground">$24,000 - Negotiation</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TaskTemplate;
