import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Home, Layout, Sparkles, UserPlus, Database, Users, Receipt, TableProperties, Workflow, Timer } from "lucide-react";
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";
import { JOBS_ADMIN_ROLE_KEYS } from "@/features/jobs/types";

type SidebarItem = {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When set, item is shown only for these role keys (uppercase). */
  roles?: Set<string>;
};

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    path: "/",
    icon: Home,
  },
  {
    title: "My Pages",
    path: "/pages",
    icon: Layout,
  },
  {
    title: "Operations & Programs",
    path: "/operations-programs",
    icon: Database,
  },
  {
    title: "Entity Types",
    path: "/entity-types",
    icon: TableProperties,
  },
  {
    title: "Background Jobs",
    path: "/background-jobs",
    icon: Workflow,
    roles: JOBS_ADMIN_ROLE_KEYS,
  },
  {
    title: "Pyro Jobs",
    path: "/pyro-jobs",
    icon: Timer,
    roles: JOBS_ADMIN_ROLE_KEYS,
  },
  {
    title: "Add User",
    path: "/add-user",
    icon: UserPlus,
  },
  {
    title: "User Hierarchy",
    path: "/user-hierarchy",
    icon: Users,
  },
  {
    title: "Billing",
    path: "/billing",
    icon: Receipt,
  },
];

const Sidebar = () => {
  const { customRole, membershipLoaded } = useTenant();
  const normalizedRole = String(customRole || "").trim().toUpperCase();

  const visibleItems = useMemo(() => {
    if (!membershipLoaded) {
      return sidebarItems.filter((item) => !item.roles);
    }
    return sidebarItems.filter(
      (item) => !item.roles || item.roles.has(normalizedRole),
    );
  }, [membershipLoaded, normalizedRole]);

  return (
    <SidebarComponent collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-2 transition-all duration-200 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
          <Sparkles className="h-6 w-6 flex-shrink-0 text-crm-primary" />
          <span className="text-lg font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            BOB by Pyro
          </span>
        </div>
        <SidebarTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-primary" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-2 py-1 rounded-md",
                          isActive && "bg-sidebar-accent text-primary font-medium"
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </SidebarComponent>
  );
};

export default Sidebar;
