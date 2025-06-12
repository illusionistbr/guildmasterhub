
"use client";

import { ComingSoon } from "@/components/shared/ComingSoon";
import { PageTitle } from "@/components/shared/PageTitle";
import { ClipboardList } from "lucide-react";

export default function AuditLogPage() {
  return (
    <div className="space-y-8">
      <PageTitle 
        title="Auditoria da Guilda"
        description="Visualize os logs de atividades importantes da guilda. Apenas Líderes e Vice-Líderes têm acesso."
        icon={<ClipboardList className="h-8 w-8 text-primary" />}
      />
      <ComingSoon 
        pageName="Logs de Auditoria" 
        icon={<ClipboardList className="h-12 w-12 text-primary" />} 
      />
      {/* Futuramente, aqui serão exibidos os logs da guilda */}
    </div>
  );
}
