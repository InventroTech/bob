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
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Camera, Mail, User, Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setupDatabase } from "@/lib/supabaseSetup";
import { toast } from "sonner";

const ProfileSettings = () => {
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleDatabaseSetup = async () => {
    setIsSettingUp(true);
    toast.info("Attempting database setup... Check console for details.");
    try {
      const success = await setupDatabase();
      if (success) {
        toast.success("Database setup script finished (check console for specifics).");
      } else {
        toast.error("Database setup script failed. Check console and run SQL manually.");
      }
    } catch (error: any) {
      toast.error(`Error during setup: ${error.message}`);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and settings
          </p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="w-full border-b rounded-none p-0 h-auto">
            <TabsTrigger
              value="profile"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Appearance
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Admin
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-2xl">JD</AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="font-medium text-lg">Jane Doe</h3>
                    <p className="text-sm text-muted-foreground">
                      Product Manager
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Member since April 2025
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Jane Doe" defaultValue="Jane Doe" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane.doe@example.com"
                      defaultValue="jane.doe@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      placeholder="Product Manager"
                      defaultValue="Product Manager"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Acme Inc."
                      defaultValue="Acme Inc."
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>
                  Update your password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="outline">Cancel</Button>
                <Button>Update Password</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Task Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates when tasks are created or modified
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Lead Activity</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications about lead status changes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">System Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Important system announcements and updates
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">In-App Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Task Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive reminders for upcoming and due tasks
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Mentions</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications when you're mentioned in comments
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                  Customize how the application looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-4 rounded-full bg-white border"></div>
                        <div className="h-8 w-8 rounded-md bg-slate-950"></div>
                      </div>
                      <p className="font-medium text-center">Light</p>
                    </div>
                    <div className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-4 rounded-full bg-slate-950 border"></div>
                        <div className="h-8 w-8 rounded-md bg-white"></div>
                      </div>
                      <p className="font-medium text-center">Dark</p>
                    </div>
                    <div className="border border-primary rounded-md p-4 cursor-pointer">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-4 rounded-full bg-gradient-to-r from-white to-slate-950 border"></div>
                        <div className="h-8 w-8 rounded-md bg-gradient-to-r from-slate-950 to-white"></div>
                      </div>
                      <p className="font-medium text-center">System</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Density</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex flex-col gap-1 mb-4">
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                      </div>
                      <p className="font-medium text-center">Compact</p>
                    </div>
                    <div className="border border-primary rounded-md p-4 cursor-pointer">
                      <div className="flex flex-col gap-2 mb-4">
                        <div className="h-2 w-full rounded-sm bg-muted"></div>
                        <div className="h-2 w-full rounded-sm bg-muted"></div>
                        <div className="h-2 w-full rounded-sm bg-muted"></div>
                      </div>
                      <p className="font-medium text-center">Default</p>
                    </div>
                    <div className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex flex-col gap-3 mb-4">
                        <div className="h-3 w-full rounded-sm bg-muted"></div>
                        <div className="h-3 w-full rounded-sm bg-muted"></div>
                      </div>
                      <p className="font-medium text-center">Comfortable</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
                <CardDescription>
                  Perform administrative setup tasks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive mb-4">
                  Warning: Running setup actions might modify your database schema.
                  Ensure you have backups or understand the implications.
                </p>
                <Button 
                  onClick={handleDatabaseSetup} 
                  disabled={isSettingUp}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {isSettingUp ? 'Setting Up Database...' : 'Run Initial DB Setup'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Attempts to create the 'pages' table and necessary RLS policies.
                  This may fail due to permissions. Check console output.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
