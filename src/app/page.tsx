
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, Rocket, ShieldEllipsis, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="py-6 px-8 md:px-16 flex justify-between items-center relative">
        <Link href="/" className="flex items-center gap-2 text-2xl font-headline font-bold text-primary">
          <ShieldEllipsis className="h-8 w-8" />
          <span>GuildMasterHub</span>
        </Link>
        <nav className="flex items-center space-x-6">
          <Link href="#benefits" className="text-sm text-foreground hover:text-primary transition-colors">
            Benefícios
          </Link>
          <Link href="#testimonials" className="text-sm text-foreground hover:text-primary transition-colors">
            Depoimentos
          </Link>
          <Button asChild className="btn-gradient btn-style-secondary">
            <Link href="/login">Entrar</Link>
          </Button>
        </nav>
        <div className="header-rgb-line"></div>
      </header>

      <main className="flex-grow flex items-center justify-center px-8 md:px-16 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center max-w-6xl w-full">
          {/* Left Column */}
          <div className="space-y-8 text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold text-foreground leading-tight">
              Gerencie sua guilda, <br /> domine os reinos digitais
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto md:mx-0">
              Poupe tempo, administre os membros sem esforço e mantenha a sua guilda próspera com as nossas ferramentas avançadas para jogadores de MMO.
            </p>
            <Button asChild size="lg" className="btn-gradient btn-style-primary px-8 py-3.5 text-lg w-full sm:w-auto">
              <Link href="/signup">Crie ou junte-se a uma guild agora</Link>
            </Button>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
              <div className="flex -space-x-3">
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src="https://placehold.co/40x40.png?text=U1" alt="User 1" data-ai-hint="avatar gaming"/>
                  <AvatarFallback>U1</AvatarFallback>
                </Avatar>
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src="https://placehold.co/40x40.png?text=U2" alt="User 2" data-ai-hint="avatar gaming"/>
                  <AvatarFallback>U2</AvatarFallback>
                </Avatar>
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src="https://placehold.co/40x40.png?text=U3" alt="User 3" data-ai-hint="avatar gaming"/>
                  <AvatarFallback>U3</AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center sm:text-left">
                <div className="flex text-yellow-400 justify-center sm:justify-start">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">aprovado por milhares de jogadores</p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative flex justify-center items-center mt-8 md:mt-0">
            <Image
              src="https://placehold.co/600x412.png"
              alt="Guild Management Preview"
              width={600}
              height={412}
              className="rounded-xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-300"
              data-ai-hint="app screenshot interface"
              priority
            />
          </div>
        </div>
      </main>
      {/* Footer removed as per new design */}
    </div>
  );
}
