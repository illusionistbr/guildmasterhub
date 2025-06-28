"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarProvider, SidebarRail, SidebarInset } from "@/components/ui/sidebar";
import { Loader2 } from 'lucide-react';
import { HeaderProvider } from '@/contexts/HeaderContext';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || !user.isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <HeaderProvider>
      <SidebarProvider defaultOpen={true}>
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-h-screen">
          <AppHeader showSidebarTrigger={true} />
          <SidebarRail />
          <SidebarInset>{children}</SidebarInset>
        </div>
      </SidebarProvider>
    </HeaderProvider>
  );
}
