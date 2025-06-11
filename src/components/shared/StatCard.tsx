"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  actionHref: string;
  actionLabel: string;
}

export function StatCard({ title, value, icon, actionHref, actionLabel }: StatCardProps) {
  return (
    <Card className="card-bg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold font-headline">{value}</div>
        <Button variant="link" asChild className="p-0 text-sm text-primary hover:text-accent">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
