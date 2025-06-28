"use client";

import React from 'react';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { Settings } from 'lucide-react';

export default function AdminSettingsPage() {
    return <ComingSoon pageName="Configurações do Site" icon={<Settings className="h-8 w-8 text-primary"/>} />;
}
