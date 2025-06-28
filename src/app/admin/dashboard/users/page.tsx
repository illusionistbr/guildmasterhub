"use client";

import React from 'react';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
    return <ComingSoon pageName="Gerenciamento de Usuários" icon={<Users className="h-8 w-8 text-primary"/>} />;
}
