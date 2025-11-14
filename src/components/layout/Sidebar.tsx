import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Layout, Sparkles, UserPlus } from "lucide-react";
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

const sidebarItems = [
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
    title: "Add User",
    path: "/add-user",
    icon: UserPlus,
  },
];

const Sidebar = () => {
  return (
    <SidebarComponent collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-2 transition-all duration-200 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
          <Sparkles className="h-6 w-6 flex-shrink-0 text-crm-primary" />
          <span className="text-lg font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            CRM Builder
          </span>
        </div>
        <SidebarTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-primary" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
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
