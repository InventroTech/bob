import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Layout, Sparkles, UserPlus, Database, Users, Bell } from "lucide-react";
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
import { useLeadFollowupsWithUnread } from "@/hooks/useLeadFollowups";

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
    title: "Operations & Programs",
    path: "/operations-programs",
    icon: Database,
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
];

const Sidebar = () => {
  const { unread, unreadCount, markAsRead } = useLeadFollowupsWithUnread();
  const [showPanel, setShowPanel] = React.useState(false);

  return (
    <SidebarComponent collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-2 transition-all duration-200 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
          <Sparkles className="h-6 w-6 flex-shrink-0 text-crm-primary" />
          <span className="text-lg font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            BOB by Pyro
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPanel((v) => !v)}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-primary"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <SidebarTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-primary" />
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
        {showPanel && (
          <SidebarGroup>
            <SidebarGroupLabel>Follow-up notifications</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-1 pb-2">
                {unread.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No pending follow-ups.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {unread.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="w-full rounded-md bg-sidebar-accent px-2 py-1 text-left text-xs hover:bg-sidebar-accent/80"
                      >
                        <div className="font-medium">{n.name || `Lead #${n.id}`}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {n.lead_status || "SNOOZED / NOT_CONNECTED"}{" "}
                          {n.next_call_at ? `• Next call at: ${n.next_call_at}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </SidebarComponent>
  );
};

export default Sidebar;
