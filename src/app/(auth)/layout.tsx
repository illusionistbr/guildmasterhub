import Link from 'next/link';
import { ShieldEllipsis } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-landing-gradient">
      {/* The old background image and overlay div have been removed */}
      
      <div className="text-center mb-8 z-10">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <ShieldEllipsis className="h-12 w-12 text-primary transition-transform duration-300 group-hover:rotate-[15deg] group-hover:scale-110" />
          <h1 className="text-4xl font-headline font-bold text-primary">
            GuildMasterHub
          </h1>
        </Link>
      </div>
      
      <div className="w-full max-w-md z-10 bg-card p-8 rounded-xl shadow-2xl shadow-primary/20 border border-border">
        {children}
      </div>

      <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        <p>&copy; {new Date().getFullYear()} GuildMasterHub. Junte-se à aventura!</p>
      </footer>
    </div>
  );
}
