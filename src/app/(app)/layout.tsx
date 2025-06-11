
"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import type { ReactNode } from 'react';

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // Determina se a sidebar deve ser exibida
  const shouldShowSidebar = () => {
    // Caminhos exatos onde a sidebar NÃO deve ser mostrada
    const noSidebarExactPaths = [
      "/create-guild",
      "/guild-selection",
    ];
    if (noSidebarExactPaths.includes(pathname)) {
      return false;
    }

    // Caminhos que começam com /dashboard/settings onde a sidebar NÃO deve ser mostrada
    if (pathname.startsWith("/dashboard/settings")) {
      return false;
    }

    // Caminhos onde a sidebar DEVE ser mostrada
    if (pathname === "/dashboard" || 
        (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/settings")) || 
        pathname === "/welcome-tool") {
      return true;
    }

    // Padrão: não mostrar a sidebar se não corresponder a nenhuma regra de exibição explícita
    return false; 
  };

  const displaySidebar = shouldShowSidebar();

  if (displaySidebar) {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <div className="flex flex-col flex-1 min-h-screen">
          <AppHeader />
          <SidebarRail />
          <SidebarInset> {/* SidebarInset já é um <main> e aplica bg-background */}
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  } else {
    // Layout sem sidebar, mas com AppHeader
    return (
      <div className="flex flex-col flex-1 min-h-screen">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </div>
    );
  }
}
