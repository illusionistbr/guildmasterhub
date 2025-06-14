
"use client";

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Twitter as LucideTwitterIcon } from 'lucide-react';

interface TwitterFeedProps {
  profileUrl: string;
  widgetHeight?: string; 
}

const TwitterFeed: React.FC<TwitterFeedProps> = ({ profileUrl, widgetHeight = "500" }) => {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  
  // Extrai o nome de usuário da URL para usar no link de fallback
  const screenNameMatch = profileUrl.match(/x\.com\/([a-zA-Z0-9_]+)/);
  const screenName = screenNameMatch ? screenNameMatch[1] : profileUrl.substring(profileUrl.lastIndexOf('/') + 1);

  useEffect(() => {
    const loadTwitterWidget = () => {
      if (feedContainerRef.current && (window as any).twttr && (window as any).twttr.widgets) {
        // Limpa o conteúdo anterior para evitar duplicatas ao mudar props
        feedContainerRef.current.innerHTML = '';
        
        // Cria a âncora que o script do Twitter transformará na timeline
        const anchor = document.createElement('a');
        anchor.className = 'twitter-timeline';
        anchor.href = profileUrl;
        anchor.setAttribute('data-height', widgetHeight);
        anchor.setAttribute('data-theme', 'dark'); // Tema escuro para combinar com a app
        // Opções para um visual mais limpo, se desejado:
        // anchor.setAttribute('data-chrome', 'noheader nofooter noborders transparent noscrollbar');
        anchor.innerHTML = `Tweets by @${screenName}`;
        
        feedContainerRef.current.appendChild(anchor);
        
        // Instrui o script do Twitter a processar o novo elemento
        (window as any).twttr.widgets.load(feedContainerRef.current);
      }
    };

    // Se o objeto twttr já estiver disponível (script carregado), carrega o widget.
    // Isso também lida com a recriação do widget se profileUrl mudar.
    if ((window as any).twttr) {
      loadTwitterWidget();
    }
    // A prop onLoad do componente Script também tentará carregar, garantindo que funcione
    // mesmo que este useEffect execute antes do script estar totalmente pronto.
  }, [profileUrl, widgetHeight, screenName]);

  return (
    <>
      <Script
        id="twitter-widgets-script" // ID para o Next.js gerenciar o script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload" // Carrega o script após a página ficar interativa
        onLoad={() => {
          // Este onLoad é chamado quando o script é carregado.
          // O useEffect acima já lida com a renderização do widget quando profileUrl muda
          // ou quando o script se torna disponível. Podemos forçar aqui se necessário,
          // mas o useEffect deve ser suficiente.
          if (feedContainerRef.current && (window as any).twttr && (window as any).twttr.widgets && feedContainerRef.current.children.length === 1 && feedContainerRef.current.children[0].tagName === 'A') {
            (window as any).twttr.widgets.load(feedContainerRef.current);
          }
        }}
      />
      <Card className="card-bg h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <LucideTwitterIcon className="mr-3 h-7 w-7 text-primary" />
            Atualizações do X
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          {profileUrl ? (
            <div ref={feedContainerRef} className="w-full h-full min-h-[400px]">
              {/* Conteúdo de fallback caso o JS esteja desabilitado ou o script demore */}
              <a 
                className="twitter-timeline" 
                href={profileUrl} 
                data-height={widgetHeight} 
                data-theme="dark"
              >
                Tweets by @{screenName}
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground">Link do X (Twitter) da guilda não configurado.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TwitterFeed;
