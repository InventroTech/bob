import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import {
  BellRing,
  Camera,
  Database,
  Palette,
  Settings2,
  Shield,
  User,
  Wrench,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setupDatabase } from "@/lib/supabaseSetup";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { membershipService } from "@/lib/api/services/membership";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function readRoleDepartmentFromMetadata(user: SupabaseUser): { role: string; department: string } {
  const m = user.user_metadata ?? {};
  const roleStr =
    typeof m.role === "string"
      ? m.role
      : typeof m.job_title === "string"
        ? m.job_title
        : typeof m.title === "string"
          ? m.title
          : "";
  const deptStr =
    typeof m.department === "string"
      ? m.department
      : typeof m.company === "string"
        ? m.company
        : "";
  return { role: roleStr, department: deptStr };
}

const ProfileSettings = () => {
  const { user, session } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const [isSettingUp, setIsSettingUp] = useState(false);

  const [profileFullName, setProfileFullName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [roleDeptFromWorkspace, setRoleDeptFromWorkspace] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const resetProfileForm = useCallback(() => {
    if (!user) {
      setProfileFullName("");
      return;
    }
    const m = user.user_metadata ?? {};
    setProfileFullName(
      (typeof m.full_name === "string" && m.full_name) ||
        (typeof m.name === "string" && m.name) ||
        user.email?.split("@")[0] ||
        ""
    );
  }, [user]);

  useEffect(() => {
    resetProfileForm();
  }, [resetProfileForm]);

  const loadMembershipRoleDept = useCallback(async () => {
    const u = userRef.current;
    if (!session?.access_token || !u?.id) {
      if (u) {
        const rd = readRoleDepartmentFromMetadata(u);
        setRole(rd.role);
        setDepartment(rd.department);
      } else {
        setRole("");
        setDepartment("");
      }
      setRoleDeptFromWorkspace(false);
      setMembershipLoading(false);
      return;
    }
    setMembershipLoading(true);
    try {
      const data = await membershipService.getMyMembership();
      if (data?.role_id && data.tenant_id) {
        setRole(data.role_name || data.role_key || "");
        setDepartment(data.department ?? "");
        setRoleDeptFromWorkspace(true);
      } else {
        setRoleDeptFromWorkspace(false);
        const rd = readRoleDepartmentFromMetadata(u);
        setRole(rd.role);
        setDepartment(rd.department);
      }
    } finally {
      setMembershipLoading(false);
    }
  }, [session?.access_token, user?.id]);

  useEffect(() => {
    void loadMembershipRoleDept();
  }, [loadMembershipRoleDept]);

  useEffect(() => {
    if (!user || roleDeptFromWorkspace) return;
    const rd = readRoleDepartmentFromMetadata(user);
    setRole(rd.role);
    setDepartment(rd.department);
  }, [user?.user_metadata, roleDeptFromWorkspace, user]);

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

  const handleUpdatePassword = async () => {
    const email = user?.email?.trim();
    if (!email) {
      toast.error("No email on your session. Try signing in again.");
      return;
    }
    if (!currentPassword) {
      toast.error("Enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        toast.error("Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPasswordSaving(false);
    }
  };

  const clearPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveProfile = async () => {
    if (!user?.email) {
      toast.error("You must be signed in to save your profile.");
      return;
    }
    setProfileSaving(true);
    try {
      const dataPayload: Record<string, string | undefined> = {
        full_name: profileFullName.trim(),
        name: profileFullName.trim(),
      };
      if (!roleDeptFromWorkspace) {
        dataPayload.department = department.trim() || undefined;
      }

      const { error } = await supabase.auth.updateUser({
        data: dataPayload,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(roleDeptFromWorkspace ? "Profile name updated." : "Profile updated.");
    } finally {
      setProfileSaving(false);
    }
  };

  const avatarUrl = useMemo(
    () =>
      (user?.user_metadata?.avatar_url as string | undefined) ||
      (user?.user_metadata?.picture as string | undefined) ||
      "",
    [user?.user_metadata?.avatar_url, user?.user_metadata?.picture]
  );

  const displayName =
    profileFullName.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarInitials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    const c = parts[0]?.[0] || user?.email?.[0];
    return c ? c.toUpperCase() : "U";
  }, [displayName, user?.email]);

  const memberSinceLabel = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <DashboardLayout>
      <div className="animate-fade-in mx-auto max-w-3xl space-y-8 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Settings2 className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                Manage your profile, notifications, appearance, and admin tools from one place.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="flex h-auto w-full flex-wrap gap-1.5 rounded-2xl border border-border/60 bg-muted/40 p-1.5 shadow-sm backdrop-blur-sm">
            <TabsTrigger
              value="profile"
              className="flex-1 gap-2 rounded-xl px-3 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground min-[440px]:flex-none sm:px-4"
            >
              <User className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex-1 gap-2 rounded-xl px-3 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground min-[440px]:flex-none sm:px-4"
            >
              <BellRing className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="flex-1 gap-2 rounded-xl px-3 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground min-[440px]:flex-none sm:px-4"
            >
              <Palette className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Appearance
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className="flex-1 gap-2 rounded-xl px-3 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground min-[440px]:flex-none sm:px-4"
            >
              <Wrench className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Admin
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-0 space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md">
              <CardHeader className="border-b border-border/50 bg-muted/20 pb-6">
                <CardTitle className="text-lg font-semibold tracking-tight">Profile information</CardTitle>
                <CardDescription className="text-muted-foreground max-w-[46rem] leading-relaxed">
                  Your name is stored on your Supabase profile. Role loads from your Pyro tenant when available;
                  department may still be editable when it is not managed by your tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-muted/60 via-background to-muted/30 p-6 sm:p-8">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
                  <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                    <div className="relative shrink-0">
                      <Avatar className="h-28 w-28 border-2 border-background shadow-lg ring-2 ring-border/60">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="text-2xl font-medium">{avatarInitials}</AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full shadow-md"
                        disabled
                        title="Photo comes from your account (e.g. Google). It cannot be changed here yet."
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                      <div>
                        <p className="text-xl font-semibold tracking-tight text-foreground">{displayName}</p>
                        {user?.email ? (
                          <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {membershipLoading ? (
                          <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                            Loading role…
                          </span>
                        ) : role.trim() ? (
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {role.trim()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                            No role assigned
                          </span>
                        )}
                        {!membershipLoading && department.trim() ? (
                          <span className="inline-flex items-center rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs text-muted-foreground">
                            {department.trim()}
                          </span>
                        ) : null}
                      </div>
                      {memberSinceLabel ? (
                        <p className="text-xs text-muted-foreground">Member since {memberSinceLabel}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/60" />

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={profileFullName}
                      onChange={(e) => setProfileFullName(e.target.value)}
                      disabled={profileSaving || !user}
                      autoComplete="name"
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email ?? ""}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email is tied to your sign-in. Changing it requires your provider or an admin.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      placeholder={membershipLoading ? "Loading…" : role ? undefined : "—"}
                      value={role}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      {roleDeptFromWorkspace
                        ? "From your organization (tenant membership). Contact an admin to change it."
                        : "Role isn't editable here. It's shown from your profile or tenant assignment—contact an admin if it should change."}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder={
                        membershipLoading ? "Loading…" : roleDeptFromWorkspace ? "From your organization" : "e.g. Sales"
                      }
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={profileSaving || !user || membershipLoading || roleDeptFromWorkspace}
                    />
                    {roleDeptFromWorkspace && !membershipLoading ? (
                      <p className="text-xs text-muted-foreground">
                        From your tenant membership record. Contact an admin to update.
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t border-border/60 bg-muted/10 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetProfileForm();
                    void loadMembershipRoleDept();
                  }}
                  disabled={profileSaving || !user || membershipLoading}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveProfile} disabled={profileSaving || !user || membershipLoading}>
                  {profileSaving ? "Saving…" : "Save changes"}
                </Button>
              </CardFooter>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md">
              <CardHeader className="border-b border-border/50 bg-muted/20 pb-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Shield className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <CardTitle className="text-lg font-semibold tracking-tight">Account security</CardTitle>
                    <CardDescription className="leading-relaxed text-muted-foreground">
                      Change your password using your current password.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {user?.email ? (
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={passwordSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={passwordSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={passwordSaving}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-border/60 bg-muted/10 px-6 py-4">
                <Button type="button" variant="outline" onClick={clearPasswordForm} disabled={passwordSaving}>
                  Clear
                </Button>
                <Button type="button" onClick={handleUpdatePassword} disabled={passwordSaving}>
                  {passwordSaving ? "Updating…" : "Update password"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg font-semibold tracking-tight">Notification preferences</CardTitle>
                <CardDescription className="leading-relaxed text-neutral-700 dark:text-neutral-400">
                  Manage how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">Email notifications</h3>
                  <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                    <div className="flex items-center justify-between gap-4 px-4 py-4">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Task Updates</Label>
                        <p className="text-body-sm text-neutral-700 dark:text-neutral-400">
                          Receive updates when tasks are created or modified
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-4">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Lead Activity</Label>
                        <p className="text-body-sm text-neutral-700 dark:text-neutral-400">
                          Notifications about lead status changes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-4">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">System Updates</Label>
                        <p className="text-body-sm text-neutral-700 dark:text-neutral-400">
                          Important system announcements and updates
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">In-app notifications</h3>
                  <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                    <div className="flex items-center justify-between gap-4 px-4 py-4">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Task Reminders</Label>
                        <p className="text-body-sm text-neutral-700 dark:text-neutral-400">
                          Receive reminders for upcoming and due tasks
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-4">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">Mentions</Label>
                        <p className="text-body-sm text-neutral-700 dark:text-neutral-400">
                          Notifications when you're mentioned in comments
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t border-border/60 bg-muted/10 px-6 py-4">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance" className="mt-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg font-semibold tracking-tight">Appearance</CardTitle>
                <CardDescription className="leading-relaxed">
                  Customize how the application looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">Theme</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/60 p-5 cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-4 rounded-full bg-white border"></div>
                        <div className="h-8 w-8 rounded-md bg-slate-950"></div>
                      </div>
                      <p className="text-sm font-medium text-center">Light</p>
                    </div>
                    <div className="rounded-xl border border-border/60 p-5 cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-4 rounded-full bg-slate-950 border border-border"></div>
                        <div className="h-8 w-8 rounded-md bg-white border border-border"></div>
                      </div>
                      <p className="text-sm font-medium text-center">Dark</p>
                    </div>
                    <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 cursor-pointer shadow-sm ring-2 ring-primary/15">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-4 rounded-full bg-gradient-to-r from-white to-slate-950 border border-border"></div>
                        <div className="h-8 w-8 rounded-md bg-gradient-to-r from-slate-950 to-white"></div>
                      </div>
                      <p className="text-sm font-medium text-center">System</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">Density</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/60 p-5 cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/30">
                      <div className="flex flex-col gap-1 mb-4">
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                        <div className="h-1.5 w-full rounded-sm bg-muted"></div>
                      </div>
                      <p className="text-sm font-medium text-center">Compact</p>
                    </div>
                    <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 cursor-pointer shadow-sm ring-2 ring-primary/15">
                      <div className="flex flex-col gap-2 mb-4">
                        <div className="h-2 w-full rounded-sm bg-muted"></div>
                        <div className="h-2 w-full rounded-sm bg-muted"></div>
                        <div className="h-2 w-full rounded-sm bg-muted"></div>
                      </div>
                      <p className="text-sm font-medium text-center">Default</p>
                    </div>
                    <div className="rounded-xl border border-border/60 p-5 cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/30">
                      <div className="flex flex-col gap-3 mb-4">
                        <div className="h-3 w-full rounded-sm bg-muted"></div>
                        <div className="h-3 w-full rounded-sm bg-muted"></div>
                      </div>
                      <p className="text-sm font-medium text-center">Comfortable</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t border-border/60 bg-muted/10 px-6 py-4">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="mt-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg font-semibold tracking-tight">Admin actions</CardTitle>
                <CardDescription className="leading-relaxed">
                  Administrative setup tasks for this environment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-body-sm text-destructive">
                  Running setup actions can modify your database schema. Ensure you have backups or understand the
                  implications.
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleDatabaseSetup} disabled={isSettingUp}>
                    <Database className="mr-2 h-4 w-4" />
                    {isSettingUp ? "Setting Up Database..." : "Run Initial DB Setup"}
                  </Button>
                  <p className="text-body-xs text-muted-foreground leading-relaxed">
                    Attempts to create the pages table and necessary RLS policies. This may fail due to permissions —
                    check the console output.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
