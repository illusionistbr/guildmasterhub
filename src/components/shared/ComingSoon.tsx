
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";
import Link from "next/link";
import { PageTitle } from "./PageTitle";
import type { ReactNode } from "react";

interface ComingSoonProps {
  pageName: string;
  icon?: ReactNode; // Changed from React.ElementType to ReactNode
}

export function ComingSoon({ pageName, icon: Icon }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl">
      <PageTitle title={pageName} icon={Icon || Construction} />
      <Construction className="h-24 w-24 text-primary animate-pulse" />
      <h2 className="text-3xl font-headline text-foreground">Em Construção!</h2>
      <p className="text-lg text-muted-foreground max-w-md">
        Esta página está atualmente em desenvolvimento. Volte em breve para conferir as novidades!
      </p>
      <Button asChild className="btn-gradient btn-style-secondary">
        <Link href="/dashboard">Voltar para o Dashboard</Link>
      </Button>
    </div>
  );
}
