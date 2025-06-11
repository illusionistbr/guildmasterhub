import Image from 'next/image';
import Link from 'next/link';
import { ShieldEllipsis } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://placehold.co/1920x1080.png"
          alt="Fantasy background"
          layout="fill"
          objectFit="cover"
          className="opacity-20 blur-sm"
          data-ai-hint="fantasy landscape"
        />
        <div className="absolute inset-0 bg-background opacity-70"></div>
      </div>
      
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
