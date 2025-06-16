
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  // SidebarGroupLabel, // No longer needed for "Geral"
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  UserPlus, 
  Settings, 
  ShieldEllipsis,
  LogOut,
  ClipboardList,
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Main navigation items (excluding settings which is now a bottom item)
const mainNavItems = [
  { baseHref: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { baseHref: "/dashboard/members", label: "Membros", icon: Users },
  { baseHref: "/dashboard/calendar", label: "Calendário", icon: CalendarDays },
  { 
    label: "Recrutamento", 
    icon: UserPlus,
    baseHref: "/dashboard/recruitment",
    subItems: [
      { baseHref: "/dashboard/recruitment/applications", label: "Candidaturas", icon: FileText },
    ]
  },
  { baseHref: "/dashboard/audit-log", label: "Auditoria", icon: ClipboardList },
];

// Bottom navigation items (like Settings)
const bottomNavItems = [
  { baseHref: "/dashboard/settings", label: "Configurações", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();

  const guildId = searchParams.get('guildId');

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  
  const generateHref = (baseHref: string) => {
    return guildId ? `${baseHref}?guildId=${guildId}` : baseHref;
  };

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
          {mainNavItems.map((item) => {
            const currentHref = generateHref(item.baseHref);
            return item.subItems ? (
              <SidebarGroup key={item.label} className="p-0">
                <SidebarMenuButton
                  asChild={!!item.baseHref}
                  href={item.baseHref ? generateHref(item.baseHref) : undefined}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  isActive={isActive(currentHref) || item.subItems.some(sub => isActive(generateHref(sub.baseHref)))}
                  className="w-full justify-start"
                >
                  {item.baseHref ? (
                     <Link href={generateHref(item.baseHref)}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  ) : (
                    <>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </>
                  )}
                </SidebarMenuButton>
                {item.subItems.map(subItem => {
                  const subItemHref = generateHref(subItem.baseHref);
                  const SubIcon = subItem.icon;
                  return (
                   <SidebarMenuItem key={subItem.baseHref} className="group-data-[collapsible=icon]:hidden ml-4">
                     <Link href={subItemHref} className={`flex items-center gap-2 p-2 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive(subItemHref) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground'}`}>
                       {SubIcon && <SubIcon className="h-4 w-4"/>}
                       <span>{subItem.label}</span>
                     </Link>
                   </SidebarMenuItem>
                  )
                })}
              </SidebarGroup>
            ) : (
              <SidebarMenuItem key={item.baseHref}>
                <SidebarMenuButton
                  asChild
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  isActive={isActive(currentHref)}
                >
                  <Link href={currentHref}>
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
        
        <SidebarGroup className="mt-auto"> {/* This pushes the group to the bottom */}
           {/* No SidebarGroupLabel here for "Geral" */}
           <SidebarMenu>
             {bottomNavItems.map((item) => {
               const currentHref = generateHref(item.baseHref);
               return (
                <SidebarMenuItem key={item.baseHref}>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: item.label, side: 'right', align: 'center' }}
                    isActive={isActive(currentHref)}
                  >
                    <Link href={currentHref}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
               )
             })}
           </SidebarMenu>
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
