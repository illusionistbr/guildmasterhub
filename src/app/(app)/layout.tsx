
"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import type { ReactNode } from 'react';
import { HeaderProvider } from '@/contexts/HeaderContext';

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const shouldShowSidebar = () => {
    const noSidebarExactPaths = [
      "/create-guild",
      "/guild-selection",
      "/guilds",
    ];
    // Exact paths that should NOT show the main app sidebar
    if (noSidebarExactPaths.includes(pathname)) {
      return false;
    }

    // Paths that SHOULD show the main app sidebar
    // Includes /dashboard and any sub-route of /dashboard/ (e.g., /dashboard/members, /dashboard/audit-log, /dashboard/settings)
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      return true;
    }
    
    // Default to false for other top-level routes
    return false; 
  };

  const displaySidebar = shouldShowSidebar();

  const layoutContent = (
    <>
      {displaySidebar ? (
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-screen">
            <AppHeader showSidebarTrigger={true} />
            <SidebarRail />
            <SidebarInset>{children}</SidebarInset>
          </div>
        </SidebarProvider>
      ) : (
        <div className="flex flex-col flex-1 min-h-screen">
          <AppHeader showSidebarTrigger={false} /> 
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </div>
      )}
    </>
  );

  return <HeaderProvider>{layoutContent}</HeaderProvider>;
}
