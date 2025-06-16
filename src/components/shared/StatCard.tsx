
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removed Button import as it's no longer used for the action link

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  actionHref: string;
  actionLabel: string;
}

export function StatCard({ title, value, icon, actionHref, actionLabel }: StatCardProps) {
  return (
    <Link href={actionHref} passHref className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
      <Card className="card-bg h-full transition-all duration-200 ease-in-out hover:shadow-primary/40 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium text-muted-foreground">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold font-headline">{value}</div>
          <p className="text-sm text-primary mt-1">{actionLabel}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

