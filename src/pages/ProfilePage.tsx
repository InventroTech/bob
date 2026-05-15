import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { membershipService } from "@/lib/api/services/membership";
import { BadgeCheck, Calendar, Hash, LogOut, Mail, Shield, Sparkles, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function readRoleFromMetadata(user: SupabaseUser): string {
  const m = user.user_metadata ?? {};
  if (typeof m.role === "string" && m.role) return m.role;
  if (typeof m.job_title === "string" && m.job_title) return m.job_title;
  if (typeof m.title === "string" && m.title) return m.title;
  const app = user.app_metadata as Record<string, unknown> | undefined;
  if (typeof app?.role === "string" && app.role) return app.role;
  return "Member";
}

const ProfilePage = () => {
  const { user, session, logout } = useAuth();
  const navigate = useNavigate();
  const userRef = useRef(user);
  userRef.current = user;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [tenantRoleLabel, setTenantRoleLabel] = useState<string | null>(null);

  const profileName = useMemo(
    () =>
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "User",
    [user]
  );

  const avatarUrl = useMemo(
    () =>
      (user?.user_metadata?.avatar_url as string | undefined) ||
      (user?.user_metadata?.picture as string | undefined) ||
      "",
    [user?.user_metadata?.avatar_url, user?.user_metadata?.picture]
  );

  const initials = useMemo(() => {
    const parts = profileName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    const c = parts[0]?.[0] || user?.email?.[0];
    return c ? c.toUpperCase() : "U";
  }, [profileName, user?.email]);

  const memberSinceLabel = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const loadTenantRole = useCallback(async () => {
    const u = userRef.current;
    if (!session?.access_token || !u?.id) {
      setTenantRoleLabel(null);
      setMembershipLoading(false);
      return;
    }
    setMembershipLoading(true);
    try {
      const data = await membershipService.getMyMembership();
      if (data?.role_id && data.tenant_id) {
        setTenantRoleLabel(data.role_name || data.role_key || null);
      } else {
        setTenantRoleLabel(null);
      }
    } catch {
      setTenantRoleLabel(null);
    } finally {
      setMembershipLoading(false);
    }
  }, [session?.access_token, user?.id]);

  useEffect(() => {
    void loadTenantRole();
  }, [loadTenantRole]);

  const resolvedRoleLabel = tenantRoleLabel ?? (user ? readRoleFromMetadata(user) : "—");

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      await logout();
      navigate("/auth");
    } catch (err: unknown) {
      console.error("Error logging out:", err);
      setError(err instanceof Error ? err.message : "Failed to log out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in mx-auto max-w-5xl space-y-8 pb-10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <User className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              A read-only overview of your account. Edit your name or password under Settings.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <Card className="overflow-hidden lg:col-span-5 rounded-2xl border-border/60 shadow-md">
            <div className="relative border-b border-border/50 bg-gradient-to-br from-muted/70 via-background to-muted/40 px-6 pb-8 pt-6">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-28 w-28 border-2 border-background shadow-lg ring-2 ring-border/60">
                    <AvatarImage src={avatarUrl || undefined} alt={profileName} />
                    <AvatarFallback className="text-2xl font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm">
                    <BadgeCheck className="h-3 w-3 text-emerald-600" aria-hidden />
                    Active
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{profileName}</h2>
                {user?.email ? (
                  <p className="mt-1.5 truncate text-sm text-muted-foreground">{user.email}</p>
                ) : (
                  <p className="mt-1.5 text-sm text-muted-foreground">No email on file</p>
                )}
              </div>
            </div>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member since</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {memberSinceLabel ?? "Not available"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/60">
                  <Hash className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User ID</p>
                  <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-foreground md:text-xs">
                    {user?.id ?? "Not available"}
                  </p>
                </div>
              </div>
            </CardContent>
            <Separator className="bg-border/60" />
            <CardFooter className="flex flex-col gap-3 bg-muted/10 p-6">
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={loading}
                className="w-full rounded-xl shadow-sm"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden />
                {loading ? "Signing out…" : "Sign out"}
              </Button>
              {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
            </CardFooter>
          </Card>

          <div className="flex flex-col gap-6 lg:col-span-7">
            <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg font-semibold tracking-tight">Personal details</CardTitle>
                <CardDescription className="leading-relaxed text-neutral-700 dark:text-neutral-400">
                  Snapshot from your sign-in identity and tenant membership.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:bg-muted/20">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Full name
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug text-foreground">{profileName}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:bg-muted/20">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    Email
                  </div>
                  <p className="mt-2 break-all text-sm font-medium leading-snug text-foreground">
                    {user?.email || "Not set"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:bg-muted/20 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" aria-hidden />
                    Role
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {membershipLoading ? (
                      <span className="text-sm text-muted-foreground">Loading…</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {resolvedRoleLabel}
                      </span>
                    )}
                    {tenantRoleLabel ? (
                      <span className="text-[11px] text-muted-foreground">From your organization</span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-dashed border-border/70 bg-muted/15 shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Need to update your name or password? That lives in Settings.
                </p>
                <Button className="shrink-0 rounded-xl shadow-sm sm:min-w-[8rem]" asChild>
                  <Link to="/settings">Open Settings</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
