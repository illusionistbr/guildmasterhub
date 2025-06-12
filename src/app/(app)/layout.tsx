
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
    // Includes /dashboard and any sub-route of /dashboard/ (e.g., /dashboard/members, /dashboard/audit-log)
    // Excludes /dashboard/settings as it has its own layout (no main sidebar)
    if (pathname === "/dashboard" || (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/settings"))) {
      return true;
    }
    
    // The welcome tool, if it were part of the app layout, would also show sidebar.
    // if (pathname === "/welcome-tool") return true; // Example if it were kept

    // Default to false for other top-level routes like /dashboard/settings
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
          {/* Show trigger on settings page if it was to have its own sub-sidebar, or keep false. Set to false to fix useSidebar error. */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </div>
      )}
    </>
  );

  return <HeaderProvider>{layoutContent}</HeaderProvider>;
}
