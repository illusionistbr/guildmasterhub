
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
  SidebarSeparator
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
  UserCog,
  KeyRound,
  Edit, 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const guildManagementNavItemsBase = [
  { baseHref: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Membros",
    icon: Users,
    baseHref: "/dashboard/members",
  },
  {
    label: "Calendário",
    icon: CalendarDays,
    baseHref: "/dashboard/calendar",
    subItems: [
      { baseHref: "/dashboard/calendar/settings", label: "PIN Codes", icon: KeyRound },
      // Updated link to point to the new approval page
      { baseHref: "/dashboard/calendar/manual-confirmation-approval", label: "Aprovar Confirmações", icon: Edit },
    ]
  },
  {
    label: "Recrutamento",
    icon: UserPlus,
    baseHref: "/dashboard/recruitment",
  },
  { baseHref: "/dashboard/audit-log", label: "Auditoria", icon: ClipboardList },
  {
    baseHref: "/dashboard/settings",
    label: "Config. da Guilda",
    icon: Settings,
  },
];

const userGuildSettingsNavItem = {
  baseHref: "/dashboard/user-guild-settings",
  label: "Minhas Configurações",
  icon: UserCog,
};


export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();

  const guildId = searchParams.get('guildId');

  const isActive = (href: string) => {
    const baseHref = href.split('?')[0]; 
    return pathname === baseHref || (baseHref !== "/dashboard" && pathname.startsWith(baseHref) && baseHref.length > "/dashboard".length);
  };


  const generateHref = (baseHref: string) => {
    return guildId ? `${baseHref}?guildId=${guildId}` : baseHref;
  };

  const renderNavItems = (items: typeof guildManagementNavItemsBase) => {
    return items.map((item) => {
      const currentHref = generateHref(item.baseHref);
      const itemIsActive = isActive(currentHref);
      const subItemsActive = item.subItems?.some(sub => isActive(generateHref(sub.baseHref)));

      return item.subItems ? (
        <SidebarGroup key={item.label} className="p-0">
          <SidebarMenuButton
            asChild={!!item.baseHref}
            href={item.baseHref ? currentHref : undefined}
            tooltip={{ children: item.label, side: 'right', align: 'center' }}
            isActive={itemIsActive || !!subItemsActive}
            className="w-full justify-start"
          >
            {item.baseHref ? (
               <Link href={currentHref}>
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
          <div className="group-data-[collapsible=icon]:hidden ml-4 mt-1 space-y-1">
            {item.subItems.map(subItem => {
              const subItemHref = generateHref(subItem.baseHref);
              const SubIcon = subItem.icon;
              return (
              <SidebarMenuItem key={subItem.baseHref} className="p-0">
                <Link href={subItemHref} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive(subItemHref) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:text-sidebar-accent-foreground'}`}>
                  {SubIcon && <SubIcon className="h-4 w-4"/>}
                  <span>{subItem.label}</span>
                </Link>
              </SidebarMenuItem>
              )
            })}
          </div>
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
    });
  };


  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href={generateHref("/dashboard")} className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <ShieldEllipsis className="h-8 w-8 text-sidebar-primary transition-transform duration-300 group-hover:rotate-[15deg]" />
          <span className="font-headline text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">
            GuildMasterHub
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {renderNavItems(guildManagementNavItemsBase)}

          <SidebarSeparator className="my-2" />

          <SidebarMenuItem key={userGuildSettingsNavItem.baseHref}>
            <SidebarMenuButton
              asChild
              tooltip={{ children: userGuildSettingsNavItem.label, side: 'right', align: 'center' }}
              isActive={isActive(generateHref(userGuildSettingsNavItem.baseHref))}
            >
              <Link href={generateHref(userGuildSettingsNavItem.baseHref)}>
                <userGuildSettingsNavItem.icon />
                <span className="group-data-[collapsible=icon]:hidden">{userGuildSettingsNavItem.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
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
    
