"use client";

import React from 'react';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { Shield } from 'lucide-react';

export default function AdminGuildsPage() {
    return <ComingSoon pageName="Gerenciamento de Guildas" icon={<Shield className="h-8 w-8 text-primary"/>} />;
}
