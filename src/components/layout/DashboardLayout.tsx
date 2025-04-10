
import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const DashboardLayout = ({ children, className }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className={cn("flex-1 p-6", className)}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
