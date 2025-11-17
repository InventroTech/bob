import React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface UserInfo {
  name: string;
  email: string;
  image?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  user?: UserInfo;
}

const DashboardLayout = ({ children, className, user }: DashboardLayoutProps) => {
  const { user: authUser } = useAuth();

  const resolvedUser = React.useMemo(() => {
    if (user) return user;
    if (!authUser) return undefined;

    return {
      name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "User",
      email: authUser.email || "user@example.com",
      image:
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        undefined,
    };
  }, [user, authUser]);

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="bg-background">
        <Navbar user={resolvedUser} />
        <main className={cn("flex-1 overflow-auto p-6", className)}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
