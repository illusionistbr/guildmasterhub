"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  ArrowLeftCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/dashboard/users", label: "Usuários", icon: Users },
  { href: "/admin/dashboard/guilds", label: "Guildas", icon: Shield },
  { href: "/admin/dashboard/settings", label: "Configurações", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/admin/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Settings className="h-8 w-8 text-sidebar-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="font-headline text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">
            Admin
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {adminNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={{ children: item.label, side: 'right', align: 'center' }}
                isActive={isActive(item.href)}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarSeparator className="my-2" />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: "Voltar para App", side: 'right', align: 'center' }}>
              <Link href="/dashboard">
                <ArrowLeftCircle />
                <span className="group-data-[collapsible=icon]:hidden">Voltar para App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
