"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Trophy, 
  UserPlus, 
  Bot, 
  Settings, 
  ShieldEllipsis,
  LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Membros", icon: Users },
  { href: "/dashboard/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/dashboard/timeline", label: "Linha do Tempo", icon: Trophy },
  { 
    label: "Recrutamento", 
    icon: UserPlus,
    subItems: [
      { href: "/dashboard/recruitment", label: "Visão Geral", icon: UserPlus },
      { href: "/dashboard/recruitment/applications", label: "Candidaturas", icon: UserPlus },
      // { href: "/dashboard/recruitment/forms", label: "Formulários", icon: FileText },
    ]
  },
  { href: "/welcome-tool", label: "Boas-Vindas IA", icon: Bot },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings, group: "Geral" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  
  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <ShieldEllipsis className="h-8 w-8 text-sidebar-primary transition-transform duration-300 group-hover:rotate-[15deg]" />
          <span className="font-headline text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">
            GuildMasterHub
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {navItems.filter(item => !item.group).map((item) =>
            item.subItems ? (
              <SidebarGroup key={item.label} className="p-0">
                <SidebarMenuButton
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  isActive={item.subItems.some(sub => isActive(sub.href))}
                  className="w-full justify-start"
                >
                  <item.icon />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
                {/* Sub-items could be rendered here if sidebar supports accordion or nested menus */}
                {/* For now, linking to main recruitment page and applications page separately */}
                {item.subItems.map(subItem => (
                   <SidebarMenuItem key={subItem.href} className="group-data-[collapsible=icon]:hidden ml-4">
                     <Link href={subItem.href} className={`flex items-center gap-2 p-2 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive(subItem.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground'}`}>
                       {/* <subItem.icon className="h-4 w-4" /> */}
                       <span>{subItem.label}</span>
                     </Link>
                   </SidebarMenuItem>
                ))}

              </SidebarGroup>
            ) : (
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
            )
          )}
        </SidebarMenu>
        
        <SidebarGroup className="mt-auto">
           <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Geral</SidebarGroupLabel>
           {navItems.filter(item => item.group === "Geral").map((item) => (
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
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        {user && (
          <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-destructive/20 hover:text-destructive group-data-[collapsible=icon]:justify-center" onClick={logout}>
            <LogOut className="h-5 w-5" />
            <span className="group-data-[collapsible=icon]:hidden">Sair</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
