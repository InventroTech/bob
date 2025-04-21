import React from "react";
import { NavLink } from "react-router-dom";
import { 
  BookOpen,
  Grid3X3,
  Home, 
  Layout, 
  PanelLeft, 
  Settings, 
  Users 
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Table } from "lucide-react";

const sidebarItems = [
  {
    title: "Dashboard",
    path: "/",
    icon: Home,
  },
  {
    title: "Components",
    path: "/components",
    icon: Grid3X3,
  },
  {
    title: "My Pages",
    path: "/pages",
    icon: Layout,
  },
  {
    title: "Team",
    path: "/team/invite",
    icon: Users,
  },
  {
    title: "Tables",
    path: "/tables",
    icon: Table,
  },
  {
    title: "Templates",
    path: "/templates",
    icon: BookOpen,
  }
];

const Sidebar = () => {
  return (
    <SidebarComponent>
      <SidebarHeader className="flex items-center px-4 py-2">
        <div className="flex items-center gap-2">
          <PanelLeft className="h-6 w-6 text-crm-primary" />
          <span className="font-bold text-lg">CRM Builder</span>
        </div>
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
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md",
                    isActive && "bg-sidebar-accent text-primary font-medium"
                  )
                }
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarComponent>
  );
};

export default Sidebar;
