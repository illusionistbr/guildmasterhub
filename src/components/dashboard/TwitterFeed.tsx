
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Twitter as LucideTwitterIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react'; // Import AlertTriangle

interface TwitterFeedProps {
  profileUrl: string;
  widgetHeight?: string;
}

const TwitterFeed: React.FC<TwitterFeedProps> = ({ profileUrl, widgetHeight = "500" }) => {
  // The Twitter widget script and dynamic loading have been removed
  // to address potential Content Security Policy (CSP) issues
  // related to external script execution and eval-like behavior.

  // To re-enable the live Twitter feed, you may need to adjust your CSP
  // to allow scripts from platform.twitter.com and potentially 'unsafe-eval'
  // if Twitter's widget script requires it.

  // Extract screenName for fallback link
  const screenNameMatch = profileUrl.match(/x\.com\/([a-zA-Z0-9_]+)/) || profileUrl.match(/twitter\.com\/([a-zA-Z0-9_]+)/);
  const screenName = screenNameMatch ? screenNameMatch[1] : profileUrl.substring(profileUrl.lastIndexOf('/') + 1);


  return (
    <Card className="card-bg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <LucideTwitterIcon className="mr-3 h-7 w-7 text-primary" />
          Atualizações do X
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-muted-foreground">
          O feed do Twitter está temporariamente desabilitado para cumprir as políticas de segurança de conteúdo.
        </p>
        {profileUrl && screenName && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-sm text-primary hover:underline"
          >
            Ver @{screenName} no X (Twitter)
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default TwitterFeed;
