
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
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
  Gem,
  Trophy,
  Zap,
  Hourglass
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, doc, onSnapshot } from "@/lib/firebase";
import type { Guild } from "@/types/guildmaster";
import { cn } from "@/lib/utils";

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
    isPro: true,
    subItems: [
      { baseHref: "/dashboard/calendar/settings", label: "PIN Codes", icon: KeyRound },
      { baseHref: "/dashboard/calendar/manual-confirmation-approval", label: "Aprovar Confirmações", icon: Edit },
    ]
  },
  {
    label: "Loot",
    icon: Gem,
    baseHref: "/dashboard/loot",
    isPro: true,
  },
  {
    label: "Conquistas",
    icon: Trophy,
    baseHref: "/dashboard/achievements",
    isPro: true,
  },
  {
    label: "Recrutamento",
    icon: UserPlus,
    baseHref: "/dashboard/recruitment",
  },
  { baseHref: "/dashboard/audit-log", label: "Auditoria", icon: ClipboardList, isPro: true },
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

  const [dkpBalance, setDkpBalance] = React.useState<number | null>(null);
  const [characterNickname, setCharacterNickname] = React.useState<string | null>(null);
  const [guildPlan, setGuildPlan] = React.useState<'free' | 'pro'>('free');
  const [trialTimeRemaining, setTrialTimeRemaining] = React.useState<string | null>(null);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (user && guildId) {
      const guildRef = doc(db, "guilds", guildId);
      const unsubscribe = onSnapshot(guildRef, (docSnap) => {
        if (docSnap.exists()) {
          const guildData = docSnap.data() as Guild;
          let currentPlan = guildData.plan || 'free';

          if (guildData.plan === 'pro' && guildData.trialEndsAt) {
            const trialEndDate = guildData.trialEndsAt.toDate();
            if (new Date() > trialEndDate) {
              currentPlan = 'free'; // Downgrade for UI if trial expired
              setTrialTimeRemaining("Expirado");
            } else {
              // Set up the countdown interval
              if (intervalId) clearInterval(intervalId);
              const updateCountdown = () => {
                const now = new Date();
                const distance = trialEndDate.getTime() - now.getTime();
                if (distance < 0) {
                  setTrialTimeRemaining("Expirado");
                  setGuildPlan('free');
                  if (intervalId) clearInterval(intervalId);
                } else {
                  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                  setTrialTimeRemaining(`${days}d ${hours}h ${minutes}m`);
                }
              };
              updateCountdown(); // Initial call
              intervalId = setInterval(updateCountdown, 60000); // Update every minute
            }
          } else {
             setTrialTimeRemaining(null);
          }

          setGuildPlan(currentPlan);

          const userRoleInfo = guildData.roles?.[user.uid];
          if (userRoleInfo) {
            setDkpBalance(userRoleInfo.dkpBalance ?? 0);
            setCharacterNickname(userRoleInfo.characterNickname || user.displayName);
          } else {
            setDkpBalance(0);
            setCharacterNickname(user.displayName);
          }
        } else {
          setDkpBalance(null);
          setCharacterNickname(null);
          setGuildPlan('free');
          setTrialTimeRemaining(null);
        }
      }, (error) => {
        console.error("Error fetching guild data for sidebar:", error);
        setDkpBalance(null);
        setCharacterNickname(null);
        setGuildPlan('free');
        setTrialTimeRemaining(null);
      });

      return () => {
        unsubscribe();
        if (intervalId) clearInterval(intervalId);
      };
    } else {
        setDkpBalance(null);
        setCharacterNickname(null);
        setGuildPlan('free');
        setTrialTimeRemaining(null);
        if (intervalId) clearInterval(intervalId);
    }
  }, [user, guildId]);


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
      const isFeatureDisabled = item.isPro && guildPlan === 'free';
      const tooltipContent = isFeatureDisabled ? "Recurso Pro. Faça o upgrade para acessar." : item.label;

      return item.subItems ? (
        <SidebarGroup key={item.label} className="p-0">
          <SidebarMenuButton
            asChild={!!item.baseHref}
            href={item.baseHref ? currentHref : undefined}
            tooltip={{ children: tooltipContent, side: 'right', align: 'center' }}
            isActive={itemIsActive || !!subItemsActive}
            className="w-full justify-start relative"
            disabled={isFeatureDisabled}
          >
            {item.baseHref ? (
               <Link href={isFeatureDisabled ? '#' : currentHref} className={cn("relative", isFeatureDisabled && "pointer-events-none")}>
                <item.icon />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                {isFeatureDisabled && <Zap className="h-3 w-3 text-yellow-400 absolute right-2 top-1/2 -translate-y-1/2 group-data-[collapsible=icon]:hidden" />}
              </Link>
            ) : (
              <>
                <item.icon />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </>
            )}
          </SidebarMenuButton>
          {!isFeatureDisabled && (
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
          )}
        </SidebarGroup>
      ) : (
        <SidebarMenuItem key={item.baseHref}>
          <SidebarMenuButton
            asChild
            tooltip={{ children: tooltipContent, side: 'right', align: 'center' }}
            isActive={isActive(currentHref)}
            disabled={isFeatureDisabled}
          >
            <Link href={isFeatureDisabled ? '#' : currentHref} className={cn("relative", isFeatureDisabled && "pointer-events-none")}>
              <item.icon />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              {isFeatureDisabled && <Zap className="h-3 w-3 text-yellow-400 absolute right-2 top-1/2 -translate-y-1/2 group-data-[collapsible=icon]:hidden" />}
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

          {guildId && guildPlan === 'pro' && trialTimeRemaining && trialTimeRemaining !== "Expirado" && (
            <div className="mt-4 px-2 group-data-[collapsible=icon]:hidden animate-in fade-in duration-300">
                <div className="p-3 rounded-md bg-card/50 border border-yellow-400/30 text-center space-y-1">
                    <p className="font-semibold text-sm text-yellow-400 flex items-center justify-center gap-1.5"><Hourglass className="h-4 w-4"/>Teste Pro</p>
                    <p className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{trialTimeRemaining}</span> restantes
                    </p>
                </div>
            </div>
          )}

          {guildId && characterNickname !== null && (
            <div className="mt-4 px-2 group-data-[collapsible=icon]:hidden animate-in fade-in duration-300">
                <div className="p-3 rounded-md bg-card/50 border border-primary/30 shadow-[0_0_8px_hsla(var(--primary),0.5)] text-center space-y-1">
                    <p className="font-semibold text-sm text-foreground truncate" title={characterNickname || ""}>{characterNickname}</p>
                    <div className="flex items-center justify-center gap-1">
                        <Gem className="h-3 w-3 text-primary"/>
                        <p className="text-xs text-muted-foreground"><span className="font-bold text-primary">{dkpBalance ?? 0}</span> DKP</p>
                    </div>
                </div>
            </div>
           )}

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
    