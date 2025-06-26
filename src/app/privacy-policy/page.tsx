import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/shared/PageTitle";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-landing-gradient text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <PageTitle
          title="Política de Privacidade"
          description="Sua privacidade é importante para nós."
          icon={<ShieldCheck className="h-8 w-8 text-primary" />}
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
            Bem-vindo ao GuildMasterHub. Nós respeitamos sua privacidade e estamos comprometidos em proteger seus dados pessoais. Esta política de privacidade informará como cuidamos dos seus dados pessoais quando você visita nosso site (independentemente de onde você o visita) e informará sobre seus direitos de privacidade e como a lei o protege.
          </p>

          <h2>2. Dados que Coletamos Sobre Você</h2>
          <p>Podemos coletar, usar, armazenar e transferir diferentes tipos de dados pessoais sobre você, que agrupamos da seguinte forma:</p>
          <ul>
            <li><strong>Dados de Identidade:</strong> Inclui seu endereço de e-mail e nickname (nome de usuário).</li>
            <li><strong>Dados de Contato:</strong> Inclui seu endereço de e-mail.</li>
            <li><strong>Dados do Perfil:</strong> Inclui seu nome de usuário, senha (armazenada de forma segura e criptografada), foto de perfil (URL) e configurações específicas da guilda.</li>
            <li><strong>Dados da Guilda:</strong> Inclui informações que você fornece sobre sua guilda, como nome, descrição, regras, eventos, membros, logs de auditoria e outros dados relacionados à gestão da guilda.</li>
            <li><strong>Dados de Uso:</strong> Inclui informações sobre como você usa nosso site, produtos e serviços.</li>
            <li><strong>Dados de Marketing e Comunicações:</strong> Inclui suas preferências em receber marketing de nós e de terceiros e suas preferências de comunicação.</li>
          </ul>

          <h2>3. Como Seus Dados Pessoais São Coletados?</h2>
          <p>Usamos métodos diferentes para coletar dados de e sobre você, incluindo:</p>
          <ul>
            <li><strong>Interações diretas:</strong> Você pode nos fornecer sua identidade, contato e dados financeiros preenchendo formulários ou correspondendo-se conosco por correio, telefone, e-mail ou outro meio. Isso inclui dados pessoais que você fornece quando cria uma conta, cria ou gerencia uma guilda, ou se inscreve em nossos serviços.</li>
            <li><strong>Tecnologias ou interações automatizadas:</strong> À medida que você interage com nosso site, podemos coletar automaticamente Dados Técnicos sobre seu equipamento, ações de navegação e padrões. Coletamos esses dados pessoais usando cookies e outras tecnologias semelhantes.</li>
          </ul>

          <h2>4. Como Usamos Seus Dados Pessoais</h2>
          <p>Usaremos seus dados pessoais apenas quando a lei nos permitir. Mais comumente, usaremos seus dados pessoais nas seguintes circunstâncias:</p>
          <ul>
            <li>Onde precisamos executar o contrato que estamos prestes a celebrar ou celebramos com você (fornecer os serviços do GuildMasterHub).</li>
            <li>Onde for necessário para nossos interesses legítimos (ou de terceiros) e seus interesses e direitos fundamentais não se sobreponham a esses interesses.</li>
            <li>Onde precisamos cumprir uma obrigação legal ou regulatória.</li>
          </ul>
          <p>Especificamente, usamos seus dados para operar, manter e fornecer a você os recursos e a funcionalidade do GuildMasterHub, como autenticação de usuário, gerenciamento de guildas e comunicação dentro da plataforma.</p>

          <h2>5. Cookies</h2>
          <p>
            Nosso site utiliza cookies essenciais para garantir seu funcionamento adequado, como manter sua sessão de login. Também podemos usar cookies de análise para entender como você interage com o site, mas apenas com seu consentimento explícito. Você pode configurar seu navegador para recusar todos ou alguns cookies do navegador, ou para alertá-lo quando sites definirem ou acessarem cookies. Se você desativar ou recusar cookies, observe que algumas partes deste site podem se tornar inacessíveis ou não funcionar corretamente.
          </p>
          
          <h2>6. Segurança dos Dados</h2>
          <p>
            Implementamos medidas de segurança apropriadas para evitar que seus dados pessoais sejam acidentalmente perdidos, usados ou acessados de forma não autorizada, alterados ou divulgados. Usamos o Firebase Authentication, que fornece mecanismos de segurança robustos para proteger as credenciais do usuário.
          </p>

          <h2>7. Seus Direitos Legais</h2>
          <p>
            Você tem o direito de acessar, corrigir ou excluir seus dados pessoais. Você pode visualizar e atualizar as informações do seu perfil e da sua guilda diretamente no dashboard. Para exclusão de conta ou outras solicitações, entre em contato conosco.
          </p>
          
          <h2>8. Contato</h2>
          <p>
            Se você tiver alguma dúvida sobre esta política de privacidade, entre em contato conosco em: <a href="mailto:suporte@guildmasterhub.com" className="text-primary hover:underline">suporte@guildmasterhub.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
