import React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

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
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="bg-background">
        <Navbar user={user} />
        <main className={cn("flex-1 overflow-auto p-6", className)}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
