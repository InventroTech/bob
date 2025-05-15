import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
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
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar user={user} />
          <main className={cn("flex-1 p-6", className)}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
