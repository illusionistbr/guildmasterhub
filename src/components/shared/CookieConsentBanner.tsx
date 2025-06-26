"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import Link from 'next/link';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    const consent = localStorage.getItem('cookie_consent');
    if (consent === null) {
      // No consent decision has been made yet.
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-card/95 backdrop-blur-sm border-t border-border p-4 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <p className="text-sm text-card-foreground">
            Nosso site utiliza cookies essenciais para garantir o funcionamento adequado e cookies de análise para entender como você interage com ele. Nenhum dado de rastreamento é coletado sem o seu consentimento.{" "}
            <Link href="/privacy-policy" className="underline hover:text-primary">Leia mais em nossa Política de Privacidade</Link>.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto">
          <Button variant="outline" onClick={handleDecline} className="flex-1 sm:flex-auto">Recusar</Button>
          <Button onClick={handleAccept} className="btn-gradient btn-style-secondary flex-1 sm:flex-auto">Aceitar</Button>
        </div>
      </div>
    </div>
  );
}
