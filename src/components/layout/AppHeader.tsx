"use client";

import Link from "next/link";
import { UserNav } from "./UserNav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ShieldEllipsis } from "lucide-react";


export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b header-bg">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 px-4 md:px-6">
        <div className="flex gap-2 items-center">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <ShieldEllipsis className="h-7 w-7 text-primary" />
            <span className="font-headline text-xl font-bold text-primary hidden sm:inline-block">
              GuildMasterHub
            </span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav />
        </div>
      </div>
      <div className="header-rgb-line"></div>
    </header>
  );
}
