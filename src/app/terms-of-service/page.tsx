
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/shared/PageTitle";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-landing-gradient text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <PageTitle
          title="Termos de Serviço"
          description="Regras e diretrizes para o uso do GuildMasterHub."
          icon={<FileText className="h-8 w-8 text-primary" />}
          action={
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para a Página Inicial
              </Link>
            </Button>
          }
        />

        <div className="prose prose-invert prose-lg max-w-none bg-card p-8 rounded-xl shadow-lg border border-border">
          <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <h2>1. Introdução</h2>
          <p>
            Bem-vindo ao GuildMasterHub! O GuildMasterHub é uma aplicação web projetada para ajudar você a gerenciar guildas em jogos online. Ao usar o GuildMasterHub, você concorda em seguir estes Termos de Serviço (os "Termos") que governam seu uso do nosso serviço. Por favor, leia-os com atenção.
          </p>

          <h2>2. Aceitação dos Termos</h2>
          <p>
            Ao acessar ou usar o GuildMasterHub, você concorda em estar legalmente vinculado a estes Termos, tendo ou não criado uma conta. Se você não concordar com qualquer um destes Termos, não use o GuildMasterHub.
          </p>

          <h2>3. Contas de Usuário</h2>
          <p>
            Para usar o GuildMasterHub, você deve se registrar e criar uma conta. Você é responsável por manter a segurança e a confidencialidade de suas credenciais de login. Notifique-nos imediatamente se suspeitar de qualquer acesso não autorizado à sua conta. Não somos responsáveis por qualquer perda ou dano decorrente de sua falha em manter a segurança de sua conta.
          </p>

          <h2>4. Gestão de Permissões e Responsabilidade sobre os Dados</h2>
          <p>
            Proprietários e administradores de guildas são os únicos responsáveis por gerenciar as permissões dos membros dentro de suas guildas. Isso inclui atribuir, monitorar e revogar cuidadosamente os direitos de acesso aos recursos e dados da guilda. Quaisquer alterações feitas nos dados da guilda (incluindo, mas não se limitando a, ajustes de DKP, gerenciamento de membros, atribuições de itens e registros de atividades) por usuários com as permissões apropriadas são consideradas ações autorizadas.
          </p>
          <p>
            O GuildMasterHub não mantém backups de ações individuais da guilda e não pode restaurar dados modificados ou excluídos por usuários com permissões válidas. Recomendamos veementemente revisar regularmente as permissões dos membros, revogar o acesso de membros que saem imediatamente e limitar o acesso administrativo a indivíduos de confiança. O GuildMasterHub não se responsabiliza por qualquer perda, dano ou interrupção causada pelo uso indevido de permissões por usuários autorizados ou pela falha dos administradores da guilda em gerenciar adequadamente os direitos de acesso.
          </p>

          <h2>5. Diretrizes de Uso</h2>
          <p>
            Para garantir um ambiente seguro e produtivo, siga estas regras ao usar o GuildMasterHub:
          </p>
          <ul>
            <li><strong>Uso Aceitável:</strong> Você concorda em usar o GuildMasterHub apenas para gerenciar as atividades de sua guilda.</li>
            <li><strong>Comportamentos Proibidos:</strong> Não se envolva em atividades que incluam, mas não se limitem a, hacking, assédio, spamming ou acesso não autorizado.</li>
          </ul>

          <h2>6. Modificações no Serviço</h2>
          <p>
            O GuildMasterHub está em constante evolução, e podemos alterar ou descontinuar certos recursos a qualquer momento. Forneceremos aviso sobre mudanças significativas que possam impactar seu uso do serviço.
          </p>
          
          <h2>7. Limitação de Responsabilidade</h2>
          <p>
             O GuildMasterHub é fornecido "como está", sem garantias de qualquer tipo, sejam expressas ou implícitas. Não somos responsáveis por danos indiretos, incidentais ou consequenciais decorrentes de ou em conexão com seu uso do GuildMasterHub.
          </p>
          
          <h2>8. Propriedade dos Dados e Privacidade</h2>
          <p>
             Embora você mantenha a propriedade de seu conteúdo gerado pelo usuário, você concede ao GuildMasterHub uma licença mundial e não exclusiva para usar, armazenar e exibir seu conteúdo com o propósito de fornecer e melhorar nossos serviços.
          </p>
          
          <h2>9. Disponibilidade do Serviço e Suporte</h2>
          <p>
             Embora nos esforcemos para ter alta disponibilidade, não garantimos 100% de tempo de atividade. Manutenções programadas serão anunciadas com antecedência. O suporte técnico é fornecido através de nossos canais oficiais, mas os tempos de resposta não são garantidos.
          </p>
          
          <h2>10. Informações de Contato</h2>
          <p>
            Se você tiver alguma dúvida ou precisar de mais esclarecimentos sobre estes Termos, entre em contato conosco em <a href="mailto:suporte@guildmasterhub.com" className="text-primary hover:underline">suporte@guildmasterhub.com</a>.
          </p>

        </div>
      </div>
    </div>
  );
}
