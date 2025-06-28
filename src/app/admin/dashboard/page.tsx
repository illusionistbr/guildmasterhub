"use client";

import React from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { StatCard } from '@/components/shared/StatCard';
import { Users, Shield, Settings, Activity } from 'lucide-react';

export default function AdminDashboardPage() {
  // In a real application, you would fetch these stats from your backend.
  const stats = {
    totalUsers: '1,234',
    totalGuilds: '56',
    activeSessions: '78',
    siteVersion: '1.0.0',
  };

  return (
    <div className="space-y-8">
      <PageTitle
        title="Admin Dashboard"
        description="Visão geral e estatísticas do GuildMasterHub."
        icon={<Settings />}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Usuários"
          value={stats.totalUsers}
          icon={<Users className="h-8 w-8 text-primary" />}
          actionHref="/admin/dashboard/users"
          actionLabel="Gerenciar Usuários"
        />
        <StatCard
          title="Total de Guildas"
          value={stats.totalGuilds}
          icon={<Shield className="h-8 w-8 text-primary" />}
          actionHref="/admin/dashboard/guilds"
          actionLabel="Gerenciar Guildas"
        />
        <StatCard
          title="Sessões Ativas"
          value={stats.activeSessions}
          icon={<Activity className="h-8 w-8 text-primary" />}
          actionHref="#"
          actionLabel="Ver Atividade"
        />
        <StatCard
          title="Versão do Site"
          value={stats.siteVersion}
          icon={<Settings className="h-8 w-8 text-primary" />}
          actionHref="/admin/dashboard/settings"
          actionLabel="Ver Configurações"
        />
      </div>
    </div>
  );
}
