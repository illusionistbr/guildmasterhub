
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc } from '@/lib/firebase';
import type { Guild, CustomRole, GuildPermission as PermissionEnum } from '@/types/guildmaster';
import { GuildPermission, AuditActionType } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, ShieldAlert, PlusCircle, Save, Trash2, ListChecks } from 'lucide-react';
import { useHeader } from '@/contexts/HeaderContext';
import { logGuildActivity } from '@/lib/auditLogService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { hasPermission } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const permissionDescriptions: Record<PermissionEnum, { title: string; description: string }> = {
  [GuildPermission.MANAGE_MEMBERS_VIEW]: { title: "Ver Lista de Membros e Perfis Básicos", description: "Permite visualizar a lista completa de membros da guilda e seus perfis detalhados." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_ROLE]: { title: "Alterar Cargos de Membros", description: "Permite modificar o cargo atribuído a outros membros da guilda." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_STATUS]: { title: "Modificar Status de Membros", description: "Permite alterar o status de atividade de outros membros (ex: Ativo, Inativo, Licença)." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_NOTES]: { title: "Adicionar ou Editar Notas Administrativas sobre Membros", description: "Permite criar ou modificar notas internas visíveis apenas para cargos com permissão." },
  [GuildPermission.MANAGE_MEMBERS_KICK]: { title: "Expulsar Membros da Guilda", description: "Permite remover permanentemente membros da guilda." },
  [GuildPermission.MANAGE_EVENTS_CREATE]: { title: "Criar Novos Eventos e Atividades no Calendário", description: "Permite adicionar novos eventos, raides, ou outras atividades ao calendário da guilda." },
  [GuildPermission.MANAGE_EVENTS_EDIT]: { title: "Editar Eventos Existentes no Calendário", description: "Permite modificar detalhes de eventos já criados, como data, hora e descrição." },
  [GuildPermission.MANAGE_EVENTS_DELETE]: { title: "Excluir Eventos do Calendário", description: "Permite remover eventos do calendário da guilda." },
  [GuildPermission.MANAGE_EVENTS_VIEW_PIN]: { title: "Visualizar Códigos PIN de Eventos (se aplicável)", description: "Permite ver os códigos PIN gerados para eventos, geralmente para confirmação de presença ou DKP." },
  [GuildPermission.MANAGE_GUILD_SETTINGS_GENERAL]: { title: "Alterar Configurações Gerais da Guilda (nome, senha)", description: "Permite modificar o nome da guilda, sua senha de acesso e outras configurações básicas." },
  [GuildPermission.MANAGE_GUILD_SETTINGS_APPEARANCE]: { title: "Modificar a Aparência da Guilda (logo, banner)", description: "Permite alterar o logo e o banner da guilda, personalizando sua identidade visual." },
  [GuildPermission.MANAGE_ROLES_PERMISSIONS]: { title: "Gerenciar Cargos e Suas Permissões (acesso a esta tela)", description: "Permite criar, editar e excluir cargos, bem como definir as permissões de cada um." },
  [GuildPermission.MANAGE_GROUPS_CREATE]: { title: "Criar Novos Grupos/Parties para Membros", description: "Permite formar e nomear grupos (parties) de membros para atividades específicas." },
  [GuildPermission.MANAGE_GROUPS_EDIT]: { title: "Editar Grupos/Parties Existentes", description: "Permite modificar a composição e detalhes de grupos já formados." },
  [GuildPermission.MANAGE_GROUPS_DELETE]: { title: "Excluir Grupos/Parties", description: "Permite dissolver grupos (parties) que não são mais necessários." },
  [GuildPermission.VIEW_AUDIT_LOG]: { title: "Acessar o Log de Auditoria da Guilda", description: "Permite visualizar o histórico de todas as ações administrativas importantes realizadas na guilda." },
  [GuildPermission.MANAGE_RECRUITMENT_VIEW_APPLICATIONS]: { title: "Visualizar Candidaturas Enviadas à Guilda", description: "Permite ver a lista de jogadores que se candidataram para entrar na guilda." },
  [GuildPermission.MANAGE_RECRUITMENT_PROCESS_APPLICATIONS]: { title: "Aprovar ou Rejeitar Candidaturas", description: "Permite aceitar ou recusar candidaturas de novos membros." }
};


function PermissionsPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [customRoles, setCustomRoles] = useState<Record<string, CustomRole>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const guildId = searchParams.get('guildId');

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canManagePermissionsPage = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_ROLES_PERMISSIONS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);


  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", variant: "destructive" });
      router.push('/guild-selection');
      return;
    }

    const fetchGuildData = async () => {
      setLoadingData(true);
      setAccessDenied(false);
      try {
        const guildDocRef = doc(db, "guilds", guildId);
        const guildSnap = await getDoc(guildDocRef);

        if (!guildSnap.exists()) {
          toast({ title: "Guilda não encontrada", variant: "destructive" });
          router.push('/guild-selection');
          return;
        }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
        setGuild(guildData);
        setHeaderTitle(`Permissões: ${guildData.name}`);
        setCustomRoles(guildData.customRoles || {});

        const userRoleInfo = guildData.roles?.[currentUser.uid];
        if (!userRoleInfo || !hasPermission(userRoleInfo.roleName, guildData.customRoles, GuildPermission.MANAGE_ROLES_PERMISSIONS)) {
          setAccessDenied(true);
        }

      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    };
    fetchGuildData();
    
    return () => {
      setHeaderTitle(null);
    };
  }, [guildId, currentUser, authLoading, router, toast, setHeaderTitle]);

  const handlePermissionChange = (roleName: string, permission: PermissionEnum, checked: boolean) => {
    setCustomRoles(prevRoles => {
      const role = prevRoles[roleName];
      if (!role) return prevRoles;

      const newPermissions = checked
        ? [...new Set([...role.permissions, permission])] 
        : role.permissions.filter(p => p !== permission); 

      return {
        ...prevRoles,
        [roleName]: { ...role, permissions: newPermissions },
      };
    });
  };
  
  const handleCreateNewRole = () => {
    if (!canManagePermissionsPage) {
        toast({ title: "Permissão Negada", description: "Você não tem permissão para criar cargos.", variant: "destructive"});
        return;
    }
    const trimmedRoleName = newRoleName.trim();
    if (!trimmedRoleName) {
      toast({ title: "Nome Inválido", description: "O nome do cargo não pode estar vazio.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedRoleName)) {
      toast({ title: "Nome Inválido", description: "O nome do cargo deve conter apenas letras (sem acentos ou ç), números e underscores (_).", variant: "destructive" });
      return;
    }
    if (trimmedRoleName.length > 30) {
      toast({ title: "Nome Muito Longo", description: "O nome do cargo não pode exceder 30 caracteres.", variant: "destructive" });
      return;
    }
    if (customRoles[trimmedRoleName] || trimmedRoleName === "Lider" || trimmedRoleName === "Membro") {
      toast({ title: "Cargo Já Existe", description: `O cargo "${trimmedRoleName}" já existe ou é reservado.`, variant: "destructive" });
      return;
    }

    setCustomRoles(prevRoles => ({
      ...prevRoles,
      [trimmedRoleName]: { permissions: [], description: `Cargo personalizado: ${trimmedRoleName}` },
    }));
    setNewRoleName("");
    toast({ title: "Cargo Criado", description: `Cargo "${trimmedRoleName}" adicionado. Configure suas permissões e salve as alterações.` });
  };
  
  const handleDeleteRole = async () => {
    if (!roleToDelete || !guildId || !currentUser || !canManagePermissionsPage) {
        toast({ title: "Permissão Negada", description: "Você não tem permissão para excluir cargos.", variant: "destructive"});
        setRoleToDelete(null);
        return;
    }
    if (roleToDelete === "Lider" || roleToDelete === "Membro") {
      toast({ title: "Ação Não Permitida", description: "Os cargos 'Lider' e 'Membro' não podem ser excluídos.", variant: "destructive" });
      setRoleToDelete(null);
      return;
    }

    const updatedRoles = { ...customRoles };
    delete updatedRoles[roleToDelete];

    setIsSaving(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      await updateDoc(guildRef, { customRoles: updatedRoles });
      
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "Usuario", AuditActionType.CUSTOM_ROLE_DELETED, {
        roleName: roleToDelete
      });

      setCustomRoles(updatedRoles);
      toast({ title: "Cargo Excluído!", description: `O cargo "${roleToDelete}" foi excluído.` });
    } catch (error) {
      console.error("Erro ao excluir cargo:", error);
      toast({ title: "Erro ao Excluir Cargo", variant: "destructive" });
      setCustomRoles(customRoles); 
    } finally {
      setIsSaving(false);
      setRoleToDelete(null);
    }
  };

  const handleSaveChanges = async () => {
    if (!guildId || !currentUser || !canManagePermissionsPage) {
        toast({title: "Permissão Negada", description: "Você não tem permissão para salvar estas alterações.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      await updateDoc(guildRef, { customRoles });

      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "Usuario", AuditActionType.PERMISSIONS_UPDATED_FOR_ROLE, {
         details: { changedField: 'customRoles' } as any, 
      });

      toast({ title: "Permissões Salvas!", description: "As permissões dos cargos foram atualizadas com sucesso." });
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  if (authLoading || loadingData) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <PageTitle title="Gerenciar Permissões de Cargos" icon={<ListChecks className="h-8 w-8 text-primary" />} />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
        <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />
        <h2 className="text-3xl font-headline text-destructive">Acesso Negado</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Você não tem permissão para gerenciar os cargos e permissões desta guilda.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }

  if (!guild) {
    return <div className="p-6 text-center">Guilda não carregada ou não encontrada.</div>;
  }
  
  const allPermissions = Object.values(GuildPermission);
  const sortedRoleNames = Object.keys(customRoles).sort((roleA, roleB) => {
    if (roleA === "Lider") return -1;
    if (roleB === "Lider") return 1;
    if (roleA === "Membro") return -1;
    if (roleB === "Membro") return 1;
    return roleA.localeCompare(roleB);
  });


  return (
    <div className="space-y-8">
      <PageTitle
        title={`Gerenciar Permissões: ${guild.name}`}
        description="Crie cargos personalizados e defina quais permissões cada cargo terá na guilda."
        icon={<ListChecks className="h-8 w-8 text-primary" />}
      />

      <Card className="card-bg">
        <CardHeader>
          <CardTitle>Criar Novo Cargo</CardTitle>
          <CardDescription>Defina um nome para o novo cargo (sem acentos ou ç, apenas letras, números e underscore). As permissões podem ser configuradas abaixo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-grow">
            <Label htmlFor="newRoleName">Nome do Cargo</Label>
            <Input
              id="newRoleName"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Ex: Veterano, RecrutaChefe"
              className="form-input mt-1"
              disabled={!canManagePermissionsPage || isSaving}
            />
          </div>
          <Button 
            onClick={handleCreateNewRole} 
            className="w-full sm:w-auto btn-gradient btn-style-secondary" 
            disabled={!canManagePermissionsPage || isSaving}
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Criar Cargo
          </Button>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full space-y-6">
        {sortedRoleNames.map((roleName) => {
          const roleData = customRoles[roleName];
          if (!roleData) return null;
          return (
            <AccordionItem value={roleName} key={roleName} className="border-none">
              <Card className="card-bg overflow-hidden">
                <AccordionTrigger className="w-full hover:no-underline">
                  <CardHeader className="flex flex-row justify-between items-center w-full p-4 sm:p-6">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">{roleName}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{roleData.description || `Permissões para o cargo ${roleName}.`}</CardDescription>
                    </div>
                    {(roleName !== "Lider" && roleName !== "Membro") && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10 shrink-0 ml-auto" 
                            disabled={isSaving || !canManagePermissionsPage}
                            onClick={(e) => e.stopPropagation()} // Prevent accordion from toggling
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tem certeza que deseja excluir o cargo "{roleName}"? Esta ação não pode ser desfeita.
                                    Membros com este cargo serão revertidos para "Membro".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => { 
                                    setRoleToDelete(roleName); 
                                    // We need to await this or handle it carefully if it's async
                                    // For now, directly calling. Consider a wrapper if it becomes complex.
                                    handleDeleteRole(); 
                                  }} 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Excluir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6 pt-0">
                    {allPermissions.map(permission => {
                      const permInfo = permissionDescriptions[permission];
                      return (
                        <div key={permission} className="flex items-start space-x-3 p-3 bg-background/50 dark:bg-input/30 rounded-md border border-border">
                          <Checkbox
                            id={`${roleName}-${permission}`}
                            checked={roleData.permissions.includes(permission)}
                            onCheckedChange={(checked) => handlePermissionChange(roleName, permission, Boolean(checked))}
                            disabled={isSaving || !canManagePermissionsPage || (roleName === "Lider" && permission === GuildPermission.MANAGE_ROLES_PERMISSIONS)}
                            aria-label={`${permInfo.title} para ${roleName}`}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={`${roleName}-${permission}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                            >
                              {permInfo.title}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {permInfo.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>
      
      <div className="flex justify-end mt-8">
        <Button onClick={handleSaveChanges} className="btn-gradient btn-style-primary" disabled={isSaving || !canManagePermissionsPage}>
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <PermissionsPageContent />
    </Suspense>
  );
}

