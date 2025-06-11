
"use client";

import Link from 'next/link';
import { ShieldEllipsis } from 'lucide-react';
import React, { useEffect } from 'react';
import { initializeAppCheck, ReCaptchaV2Provider } from 'firebase/app-check';
import { app as firebaseApp } from '@/lib/firebase'; // Ensure 'app' is exported from firebase.ts

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (typeof window !== 'undefined' && siteKey && firebaseApp) {
      try {
        // Initialize App Check with the reCAPTCHA v2 provider and a specific container ID
        initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaV2Provider(siteKey, 'recaptcha-auth-container'),
          isTokenAutoRefreshEnabled: true,
        });
        console.log("Firebase App Check initialized in AuthLayout for visible reCAPTCHA.");
      } catch (e: any) {
        // It's okay if it's already initialized, but log other errors.
        if (e.name !== 'FirebaseError' || e.code !== 'appCheck/already-initialized') {
          console.error("Error initializing Firebase App Check in AuthLayout:", e);
        } else {
          // This warning helps if debugging multiple initializations.
          console.warn("Firebase App Check already initialized (AuthLayout).");
        }
      }
    } else if (!siteKey) {
      console.error("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. App Check will not be initialized with reCAPTCHA.");
    } else if (!firebaseApp) {
      console.error("Firebase app instance is not available. App Check initialization skipped.");
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-landing-gradient">
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
        {/* This div will host the visible reCAPTCHA v2 widget */}
        <div id="recaptcha-auth-container" className="my-6 flex justify-center"></div>
      </div>

      <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        <p>&copy; {new Date().getFullYear()} GuildMasterHub. Junte-se à aventura!</p>
      </footer>
    </div>
  );
}
