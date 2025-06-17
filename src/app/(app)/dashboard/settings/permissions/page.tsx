
"use client";

// This file is no longer needed as its content is integrated into settings/page.tsx
// It will be effectively deleted by not being included in the output.
// Add a placeholder comment to ensure the file is processed if it's not fully empty.
// Placeholder: This page has been deprecated and its functionality moved to Guild Settings tabs.

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function DeprecatedPermissionsPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">
        Esta página foi movida. Redirecionando...
      </p>
      {/* You could add a client-side redirect here if needed, or rely on sidebar links being updated */}
    </div>
  );
}
