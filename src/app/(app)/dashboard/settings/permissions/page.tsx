
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
  [GuildPermission.MANAGE_MEMBERS_VIEW]: { title: "Ver Membros", description: "Permite visualizar a lista de membros e seus perfis básicos." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_ROLE]: { title: "Gerenciar Cargos de Membros", description: "Permite modificar o cargo de outros membros." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_STATUS]: { title: "Gerenciar Status de Membros", description: "Permite alterar o status de atividade dos membros (Ativo, Inativo, etc.)." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_NOTES]: { title: "Gerenciar Notas de Membros", description: "Permite adicionar ou editar notas administrativas sobre membros." },
  [GuildPermission.MANAGE_MEMBERS_KICK]: { title: "Expulsar Membros", description: "Permite remover membros da guilda." },
  [GuildPermission.MANAGE_EVENTS_CREATE]: { title: "Criar Eventos/Atividades", description: "Permite adicionar novos eventos ao calendário da guilda." },
  [GuildPermission.MANAGE_EVENTS_EDIT]: { title: "Editar Eventos/Atividades", description: "Permite modificar detalhes de eventos existentes." },
  [GuildPermission.MANAGE_EVENTS_DELETE]: { title: "Excluir Eventos/Atividades", description: "Permite remover eventos do calendário." },
  [GuildPermission.MANAGE_EVENTS_VIEW_PIN]: { title: "Visualizar PIN de Eventos", description: "Permite ver os códigos PIN gerados para eventos." },
  [GuildPermission.MANAGE_GUILD_SETTINGS_GENERAL]: { title: "Gerenciar Configurações Gerais da Guilda", description: "Permite modificar nome, senha e outras configurações básicas da guilda." },
  [GuildPermission.MANAGE_GUILD_SETTINGS_APPEARANCE]: { title: "Gerenciar Aparência da Guilda", description: "Permite alterar logo e banner da guilda." },
  [GuildPermission.MANAGE_ROLES_PERMISSIONS]: { title: "Gerenciar Cargos e Permissões", description: "Permite criar, editar, excluir cargos e definir suas permissões (acesso a esta tela)." },
  [GuildPermission.MANAGE_GROUPS_CREATE]: { title: "Criar Grupos/Parties", description: "Permite formar e nomear grupos (parties) de membros." },
  [GuildPermission.MANAGE_GROUPS_EDIT]: { title: "Editar Grupos/Parties", description: "Permite modificar a composição e detalhes de grupos existentes." },
  [GuildPermission.MANAGE_GROUPS_DELETE]: { title: "Excluir Grupos/Parties", description: "Permite dissolver grupos (parties)." },
  [GuildPermission.VIEW_AUDIT_LOG]: { title: "Ver Log de Auditoria", description: "Permite visualizar o histórico de ações administrativas na guilda." },
  [GuildPermission.MANAGE_RECRUITMENT_VIEW_APPLICATIONS]: { title: "Ver Candidaturas", description: "Permite visualizar candidaturas enviadas à guilda." },
  [GuildPermission.MANAGE_RECRUITMENT_PROCESS_APPLICATIONS]: { title: "Processar Candidaturas", description: "Permite aprovar ou rejeitar candidaturas de novos membros." }
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
        const currentCustomRoles = guildData.customRoles || {};
        if (!userRoleInfo || !hasPermission(userRoleInfo.roleName, currentCustomRoles, GuildPermission.MANAGE_ROLES_PERMISSIONS)) {
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
    toast({ title: "Cargo Criado Localmente", description: `Cargo "${trimmedRoleName}" adicionado. Configure suas permissões e clique em "Salvar Alterações" no final da página para persistir.` });
  };
  
  const handleDeleteRole = async (roleName: string) => {
    if (!roleName || !guildId || !currentUser || !canManagePermissionsPage) {
        toast({ title: "Permissão Negada", description: "Você não tem permissão para excluir cargos.", variant: "destructive"});
        setRoleToDelete(null);
        return;
    }
    if (roleName === "Lider" || roleName === "Membro") {
      toast({ title: "Ação Não Permitida", description: "Os cargos 'Lider' e 'Membro' não podem ser excluídos.", variant: "destructive" });
      setRoleToDelete(null);
      return;
    }

    const rolesBeforeDelete = { ...customRoles };
    const updatedRolesLocal = { ...customRoles };
    delete updatedRolesLocal[roleName];
    setCustomRoles(updatedRolesLocal);

    toast({ title: "Cargo Marcado para Exclusão", description: `O cargo "${roleName}" será removido ao salvar as alterações.` });
    setRoleToDelete(null); 
  };


  const handleSaveChanges = async () => {
    if (!guildId || !currentUser || !canManagePermissionsPage) {
        toast({title: "Permissão Negada", description: "Você não tem permissão para salvar estas alterações.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const rolesToSave = { ...customRoles };
      if (!rolesToSave["Lider"]) {
        rolesToSave["Lider"] = { permissions: Object.values(GuildPermission), description: "Fundador e administrador principal da guilda."};
      } else {
         rolesToSave["Lider"].permissions = [...new Set([...rolesToSave["Lider"].permissions, GuildPermission.MANAGE_ROLES_PERMISSIONS, ...Object.values(GuildPermission)])];
      }
      if (!rolesToSave["Membro"]) {
        rolesToSave["Membro"] = { permissions: [GuildPermission.MANAGE_MEMBERS_VIEW], description: "Membro padrão da guilda."};
      }


      await updateDoc(guildRef, { customRoles: rolesToSave });
      setCustomRoles(rolesToSave); 

      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "Usuario", AuditActionType.PERMISSIONS_UPDATED_FOR_ROLE, {
         details: { changedField: 'customRoles' } as any, 
         roleName: "Todos os Cargos", 
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
    if (roleA === "Membro") return -1; // Changed to ensure Membro comes after Lider but before others
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
            disabled={!canManagePermissionsPage || isSaving || !newRoleName.trim()}
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Criar Cargo
          </Button>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["Lider", "Membro"]} className="w-full space-y-6">
        {sortedRoleNames.map((roleName) => {
          const roleData = customRoles[roleName];
          if (!roleData) return null;
          return (
            <AccordionItem value={roleName} key={roleName} className="border-none bg-card card-bg rounded-xl overflow-hidden">
              <AccordionTrigger className="flex w-full items-center justify-between p-4 sm:p-6 hover:no-underline">
                <div className="text-left">
                  <CardTitle className="text-xl sm:text-2xl">{roleName}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {roleData.description || `Permissões para o cargo ${roleName}.`}
                  </CardDescription>
                </div>
                {(roleName !== "Lider" && roleName !== "Membro") && (
                  <AlertDialog onOpenChange={(open) => { if (open) { setRoleToDelete(roleName); } else if (!isSaving) { setRoleToDelete(null); } }}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 shrink-0 ml-auto" // Added ml-auto for spacing if chevron is also present
                        disabled={isSaving || !canManagePermissionsPage}
                        onClick={(e) => {
                           e.stopPropagation(); // Prevent accordion from toggling
                           // Actual opening of AlertDialog is handled by its trigger
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o cargo "{roleName}"? Esta ação não pode ser desfeita.
                          Membros com este cargo serão revertidos para "Membro" ao salvar as alterações.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteRole(roleName) }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Marcar para Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </AccordionTrigger>
              <AccordionContent className="p-4 sm:p-6 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPermissions.map(permission => {
                    const permInfo = permissionDescriptions[permission];
                    const isLiderManagingOwnPermissions = roleName === "Lider" && permission === GuildPermission.MANAGE_ROLES_PERMISSIONS;
                    return (
                        <div key={permission} className="flex items-start space-x-3 p-3 bg-background/50 dark:bg-input/30 rounded-md border border-border">
                        <Checkbox
                            id={`${roleName}-${permission}`}
                            checked={roleData.permissions.includes(permission)}
                            onCheckedChange={(checked) => handlePermissionChange(roleName, permission, Boolean(checked))}
                            disabled={isSaving || !canManagePermissionsPage || isLiderManagingOwnPermissions}
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
                </div>
              </AccordionContent>
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

