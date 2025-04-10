
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

const LeadsTemplate = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const leads = [
    {
      id: 1,
      name: "John Smith",
      company: "Acme Inc.",
      email: "john.smith@acme.example.com",
      phone: "(555) 123-4567",
      status: "Active",
      source: "Website",
      lastContact: "3 days ago",
      value: "$24,000",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      company: "TechCorp",
      email: "sarah.johnson@techcorp.example.com",
      phone: "(555) 234-5678",
      status: "New",
      source: "Referral",
      lastContact: "1 day ago",
      value: "$12,500",
    },
    {
      id: 3,
      name: "Michael Chen",
      company: "GlobalSoft",
      email: "michael.chen@globalsoft.example.com",
      phone: "(555) 345-6789",
      status: "Cold",
      source: "LinkedIn",
      lastContact: "2 weeks ago",
      value: "$8,000",
    },
    {
      id: 4,
      name: "Emily Davis",
      company: "Innovate Inc.",
      email: "emily.davis@innovate.example.com",
      phone: "(555) 456-7890",
      status: "Active",
      source: "Conference",
      lastContact: "5 days ago",
      value: "$15,000",
    },
    {
      id: 5,
      name: "Robert Wilson",
      company: "DataFlex Solutions",
      email: "robert.wilson@dataflex.example.com",
      phone: "(555) 567-8901",
      status: "Inactive",
      source: "Email Campaign",
      lastContact: "1 month ago",
      value: "$5,000",
    },
  ];

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case "New":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">New</Badge>;
      case "Cold":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cold</Badge>;
      case "Inactive":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your potential customers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Leads</CardTitle>
                <CardDescription>
                  Showing {filteredLeads.length} leads
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search leads..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="cards">Cards</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="table" className="m-0">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Name/Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Last Contact</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src="" />
                                <AvatarFallback className="text-xs">
                                  {lead.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{lead.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {lead.company}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(lead.status)}</TableCell>
                          <TableCell>{lead.source}</TableCell>
                          <TableCell>{lead.lastContact}</TableCell>
                          <TableCell>{lead.value}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={`/task-template`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                                  <DropdownMenuItem>Add Task</DropdownMenuItem>
                                  <DropdownMenuItem>Add Note</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="cards" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLeads.map((lead) => (
                    <Card key={lead.id} className="hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src="" />
                              <AvatarFallback>
                                {lead.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{lead.name}</CardTitle>
                              <CardDescription>{lead.company}</CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(lead.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{lead.email}</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span>{lead.phone}</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last Contact:</span>
                            <span>{lead.lastContact}</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Value:</span>
                            <span className="font-medium">{lead.value}</span>
                          </p>
                        </div>
                      </CardContent>
                      <CardContent className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/task-template`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Task
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LeadsTemplate;
