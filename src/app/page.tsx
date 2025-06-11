
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, Rocket, ShieldEllipsis, Star, Users, HeartCrack, CalendarDays, Trophy, MessageSquare, Flag, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const benefits = [
    {
      icon: Users,
      title: "Gerenciamento de Membros",
      description: "Organize sua equipe com cargos, funções e status. Saiba quem está pronto para a batalha a qualquer momento.",
    },
    {
      icon: CalendarDays,
      title: "Agenda de Eventos",
      description: "Crie e gerencie raides, dungeons e eventos PvP com um calendário intuitivo e sistema de RSVP integrado.",
    },
    {
      icon: Trophy,
      title: "Registro de Conquistas",
      description: "Imortalize os feitos da sua guilda. Registre bosses derrotados, itens lendários e domine os rankings.",
    },
    {
      icon: MessageSquare,
      title: "Comunicação Integrada",
      description: "Discuta estratégias, compartilhe guias e fortaleça a comunicação com ferramentas integradas.",
    },
    {
      icon: Flag,
      title: "Ferramentas de Recrutamento",
      description: "Atraia os melhores jogadores com uma página de guilda pública e um sistema de aplicação personalizável.",
    },
    {
      icon: Settings,
      title: "Administração Simplificada",
      description: "Controle permissões, personalize sua página e exporte dados com facilidade.",
    },
  ];

  const testimonials = [
    {
      quote: "Organizar as raides era um caos. Com o GuildMasterHub, nossos eventos rodam com precisão militar. Derrotamos o Lich de Gelo na primeira semana de uso!",
      name: "Lord Kael",
      role: "Líder da [Ira dos Dragões]",
      avatarUrl: "https://placehold.co/64x64.png?text=LK",
      avatarFallback: "LK",
      aiHint: "warrior avatar"
    },
    {
      quote: "Nossa página de recrutamento ficou incrível! Recebemos o dobro de aplicações de jogadores de alta qualidade desde que começamos a usar a plataforma.",
      name: "Zyra",
      role: "Oficial de [Sentinelas de Aço]",
      avatarUrl: "https://placehold.co/64x64.png?text=ZY",
      avatarFallback: "ZY",
      aiHint: "mage avatar"
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-landing-gradient text-foreground">
      <header className="sticky top-0 z-50 py-6 px-8 md:px-16 flex justify-between items-center header-bg">
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
                  <AvatarImage src="https://placehold.co/40x40.png?text=U1" alt="Usuário 1" data-ai-hint="avatar gaming"/>
                  <AvatarFallback>U1</AvatarFallback>
                </Avatar>
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src="https://placehold.co/40x40.png?text=U2" alt="Usuário 2" data-ai-hint="avatar gaming"/>
                  <AvatarFallback>U2</AvatarFallback>
                </Avatar>
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src="https://placehold.co/40x40.png?text=U3" alt="Usuário 3" data-ai-hint="avatar gaming"/>
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
              alt="Prévia do Gerenciamento de Guilda"
              width={600}
              height={412}
              className="rounded-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300 shadow-[0px_0px_35px_rgba(127,95,243,0.7)]"
              data-ai-hint="app screenshot interface"
              priority
            />
          </div>
        </div>
      </main>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-foreground mb-6">
            8 em cada 10 guildas enfrentam dificuldades com coordenação e engajamento dos membros
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-12">
            Entre agendas de raides, disponibilidade de membros e planejamento de eventos, gerenciar uma guilda pode se tornar exaustivo. Cada raide perdida ou evento mal coordenado prejudica o moral e o progresso da guilda.
          </p>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="flex flex-col items-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-yellow-400 mb-4">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="15" x2="16" y2="15"></line>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
              <h3 className="text-xl font-semibold text-foreground mb-2">Caos no planejamento de eventos</h3>
            </div>
            <div className="flex flex-col items-center">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Membros perdem o interesse</h3>
            </div>
            <div className="flex flex-col items-center">
              <HeartCrack className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Guilda se desfaz lentamente</h3>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-foreground mb-4">
            Um Arsenal Completo de Ferramentas
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Tudo o que você precisa para levar sua guilda ao próximo nível.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div key={index} className="card-bg p-6 rounded-xl text-left flex flex-col">
                  <IconComponent className="h-10 w-10 text-primary mb-6" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground flex-grow">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-foreground mb-4">
            A Lenda Contada Pelos Heróis
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Veja o que os líderes de guildas estão dizendo.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card-bg p-8 rounded-xl text-left flex flex-col">
                <blockquote className="text-base italic text-foreground/90 mb-6 flex-grow">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary">
                    <AvatarImage src={testimonial.avatarUrl} alt={testimonial.name} data-ai-hint={testimonial.aiHint} />
                    <AvatarFallback>{testimonial.avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-headline font-bold text-foreground mb-6">
            Pronto para elevar o nível da gestão da sua guilda?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Junte-se a milhares de líderes de guildas que estão otimizando suas operações com rastreamento DKP automatizado, gerenciamento de eventos e integração com Discord.
          </p>
          <Button asChild size="lg" className="btn-gradient btn-style-primary px-10 py-4 text-lg">
            <Link href="/signup">Comece a Gerenciar Sua Guilda</Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Não é necessário cartão de crédito para começar
          </p>
        </div>
      </section>
      {/* Footer removed as per new design */}
    </div>
  );
}
