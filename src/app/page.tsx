import { Button } from "@/components/ui/button";
import { LogIn, Rocket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 md:px-10 flex justify-between items-center header-bg sticky top-0 z-50">
        <Link href="/" className="text-2xl font-headline font-bold text-primary">
          GuildMasterHub
        </Link>
        <nav>
          <Button asChild variant="ghost">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" /> Entrar
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-headline font-extrabold mb-6">
            <span className="text-gradient">Eleve Sua Guilda</span> ao Próximo Nível
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            GuildMasterHub é a plataforma definitiva para gerenciar membros, eventos, conquistas e recrutamento, tudo em um só lugar com o poder da IA.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="btn-gradient btn-style-primary text-lg w-full sm:w-auto">
              <Link href="/dashboard">
                <Rocket className="mr-2 h-5 w-5" /> Acessar Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg w-full sm:w-auto border-primary text-primary hover:bg-primary/10">
              <Link href="/signup">
                Criar Conta Grátis
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative w-full max-w-5xl aspect-[16/7] mt-12 rounded-xl overflow-hidden shadow-2xl shadow-primary/30">
          <Image
            src="https://placehold.co/1200x525.png"
            alt="GuildMasterHub Dashboard Preview"
            layout="fill"
            objectFit="cover"
            priority
            className="transform hover:scale-105 transition-transform duration-500 ease-in-out"
            data-ai-hint="fantasy guild battle"
          />
           <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-70"></div>
        </div>
      </main>

      <footer className="text-center p-6 text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GuildMasterHub. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
