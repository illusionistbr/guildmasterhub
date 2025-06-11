import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  icon?: LucideIcon | ReactNode; // Allow direct SVG or Lucide icon
  action?: ReactNode;
}

export function PageTitle({ title, description, icon: IconComponent, action }: PageTitleProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {IconComponent && (typeof IconComponent === 'function' ? <IconComponent className="h-8 w-8 text-primary" /> : IconComponent)}
          <h1 className="text-3xl md:text-4xl font-headline text-primary">{title}</h1>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {description && <p className="mt-2 text-lg text-muted-foreground">{description}</p>}
    </div>
  );
}
