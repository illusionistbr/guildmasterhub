
"use client";

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is deprecated as its functionality has been moved to a tab
// within the main members page.
export default function DeprecatedGroupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId');

  useEffect(() => {
    if (guildId) {
      router.replace(`/dashboard/members?guildId=${guildId}&tab=groups`);
    } else {
      // Fallback if guildId is missing, though ideally it should always be present
      router.replace('/dashboard/members?tab=groups');
    }
  }, [guildId, router]);

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10 min-h-[calc(100vh-200px)]">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">
        Redirecionando para a nova página de grupos...
      </p>
    </div>
  );
}

    