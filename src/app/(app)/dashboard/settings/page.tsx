
"use client";

import { ComingSoon } from "@/components/shared/ComingSoon";
import { PageTitle } from "@/components/shared/PageTitle";
import { Settings as SettingsIcon } from "lucide-react"; // Renamed to avoid conflict

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageTitle 
        title="Configurações"
        description="Gerencie as configurações da sua conta e preferências do aplicativo."
        icon={<SettingsIcon className="h-8 w-8 text-primary" />}
      />
      <ComingSoon 
        pageName="Configurações da Conta" 
        icon={<SettingsIcon className="h-12 w-12 text-primary" />} 
      />
      {/* Aqui você pode adicionar seções para configurações de perfil, notificações, segurança, etc. no futuro */}
    </div>
  );
}
