
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc } from '@/lib/firebase';
import type { Guild, CustomRole, GuildPermission as PermissionEnum } from '@/types/guildmaster';
import { GuildPermission } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, ShieldAlert, PlusCircle, Save, Trash2, ListChecks } from 'lucide-react';
import { useHeader } from '@/contexts/HeaderContext';
import { logGuildActivity, AuditActionType } from '@/lib/auditLogService';
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

// Helper for permission descriptions
const permissionDescriptions: Record<PermissionEnum, string> = {
  [GuildPermission.MANAGE_MEMBERS_VIEW]: "Ver lista de membros e seus perfis básicos.",
  [GuildPermission.MANAGE_MEMBERS_EDIT_ROLE]: "Alterar o cargo de outros membros.",
  [GuildPermission.MANAGE_MEMBERS_EDIT_STATUS]: "Modificar o status (ativo, inativo, licença) de membros.",
  [GuildPermission.MANAGE_MEMBERS_EDIT_NOTES]: "Adicionar ou editar notas administrativas sobre membros.",
  [GuildPermission.MANAGE_MEMBERS_KICK]: "Expulsar membros da guilda.",
  [GuildPermission.MANAGE_EVENTS_CREATE]: "Criar novos eventos e atividades no calendário.",
  [GuildPermission.MANAGE_EVENTS_EDIT]: "Editar eventos existentes no calendário.",
  [GuildPermission.MANAGE_EVENTS_DELETE]: "Excluir eventos do calendário.",
  [GuildPermission.MANAGE_EVENTS_VIEW_PIN]: "Visualizar códigos PIN de eventos (se aplicável).",
  [GuildPermission.MANAGE_GUILD_SETTINGS_GENERAL]: "Alterar configurações gerais da guilda (nome, senha, jogo).",
  [GuildPermission.MANAGE_GUILD_SETTINGS_APPEARANCE]: "Modificar a aparência da guilda (logo, banner).",
  [GuildPermission.MANAGE_ROLES_PERMISSIONS]: "Gerenciar cargos e suas permissões (acesso a esta tela).",
  [GuildPermission.MANAGE_GROUPS_CREATE]: "Criar novos grupos/parties para membros.",
  [GuildPermission.MANAGE_GROUPS_EDIT]: "Editar grupos/parties existentes.",
  [GuildPermission.MANAGE_GROUPS_DELETE]: "Excluir grupos/parties.",
  [GuildPermission.VIEW_AUDIT_LOG]: "Acessar o log de auditoria da guilda.",
  [GuildPermission.MANAGE_RECRUITMENT_VIEW_APPLICATIONS]: "Visualizar candidaturas enviadas à guilda.",
  [GuildPermission.MANAGE_RECRUITMENT_PROCESS_APPLICATIONS]: "Aprovar ou rejeitar candidaturas."
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
          toast({ title: "Guilda nao encontrada", variant: "destructive" });
          router.push('/guild-selection');
          return;
        }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
        setGuild(guildData);
        setHeaderTitle(`Permissoes: ${guildData.name}`);
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
        ? [...new Set([...role.permissions, permission])] // Add permission, ensure uniqueness
        : role.permissions.filter(p => p !== permission); // Remove permission

      return {
        ...prevRoles,
        [roleName]: { ...role, permissions: newPermissions },
      };
    });
  };
  
  const handleCreateNewRole = () => {
    const trimmedRoleName = newRoleName.trim();
    if (!trimmedRoleName) {
      toast({ title: "Nome Invalido", description: "O nome do cargo nao pode estar vazio.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedRoleName)) {
      toast({ title: "Nome Invalido", description: "O nome do cargo deve conter apenas letras (sem acentos), numeros e underscores.", variant: "destructive" });
      return;
    }
    if (trimmedRoleName.length > 30) {
      toast({ title: "Nome Muito Longo", description: "O nome do cargo nao pode exceder 30 caracteres.", variant: "destructive" });
      return;
    }
    if (customRoles[trimmedRoleName]) {
      toast({ title: "Cargo Ja Existe", description: `O cargo "${trimmedRoleName}" ja existe.`, variant: "destructive" });
      return;
    }

    setCustomRoles(prevRoles => ({
      ...prevRoles,
      [trimmedRoleName]: { permissions: [], description: `Cargo personalizado: ${trimmedRoleName}` },
    }));
    setNewRoleName("");
    toast({ title: "Cargo Criado", description: `Cargo "${trimmedRoleName}" adicionado. Configure suas permissoes.` });
  };
  
  const handleDeleteRole = async () => {
    if (!roleToDelete || !guildId || !currentUser) return;
    if (roleToDelete === "Lider" || roleToDelete === "Membro") {
      toast({ title: "Acao Nao Permitida", description: "Os cargos 'Lider' e 'Membro' nao podem ser excluidos.", variant: "destructive" });
      setRoleToDelete(null);
      return;
    }

    const updatedRoles = { ...customRoles };
    delete updatedRoles[roleToDelete];

    setIsSaving(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      await updateDoc(guildRef, { customRoles: updatedRoles });
      
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.CUSTOM_ROLE_DELETED, {
        roleName: roleToDelete
      });

      setCustomRoles(updatedRoles);
      toast({ title: "Cargo Excluido!", description: `O cargo "${roleToDelete}" foi excluido.` });
    } catch (error) {
      console.error("Erro ao excluir cargo:", error);
      toast({ title: "Erro ao Excluir Cargo", variant: "destructive" });
      // Revert UI change if save fails
      setCustomRoles(prev => ({ ...prev, [roleToDelete]: customRoles[roleToDelete] }));
    } finally {
      setIsSaving(false);
      setRoleToDelete(null);
    }
  };

  const handleSaveChanges = async () => {
    if (!guildId || !currentUser || !canManagePermissionsPage) {
        toast({title: "Permissao Negada", description: "Voce nao tem permissao para salvar estas alteracoes.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      await updateDoc(guildRef, { customRoles });

      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.PERMISSIONS_UPDATED_FOR_ROLE, {
         details: { changedField: 'customRoles' } as any, // General log for permission update
      });

      toast({ title: "Permissoes Salvas!", description: "As permissoes dos cargos foram atualizadas com sucesso." });
    } catch (error) {
      console.error("Erro ao salvar permissoes:", error);
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  if (authLoading || loadingData) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <PageTitle title="Gerenciar Permissoes de Cargos" icon={<ListChecks className="h-8 w-8 text-primary" />} />
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
          Voce nao tem permissao para gerenciar os cargos e permissoes desta guilda.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }

  if (!guild) {
    return <div className="p-6 text-center">Guilda nao carregada ou nao encontrada.</div>;
  }
  
  const allPermissions = Object.values(GuildPermission);

  return (
    <div className="space-y-8">
      <PageTitle
        title={`Gerenciar Permissoes: ${guild.name}`}
        description="Crie cargos personalizados e defina quais permissoes cada cargo tera na guilda."
        icon={<ListChecks className="h-8 w-8 text-primary" />}
      />

      <Card className="card-bg">
        <CardHeader>
          <CardTitle>Criar Novo Cargo</CardTitle>
          <CardDescription>Defina um nome para o novo cargo (sem acentos, apenas letras, numeros e underscore). As permissoes podem ser configuradas abaixo.</CardDescription>
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
            />
          </div>
          <Button onClick={handleCreateNewRole} className="w-full sm:w-auto btn-gradient btn-style-secondary" disabled={isSaving}>
            <PlusCircle className="mr-2 h-5 w-5" /> Criar Cargo
          </Button>
        </CardContent>
      </Card>

      {Object.entries(customRoles).sort(([roleA], [roleB]) => {
        if (roleA === "Lider") return -1;
        if (roleB === "Lider") return 1;
        if (roleA === "Membro") return -1;
        if (roleB === "Membro") return 1;
        return roleA.localeCompare(roleB);
      }).map(([roleName, roleData]) => (
        <Card key={roleName} className="card-bg">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>{roleName}</CardTitle>
              <CardDescription>{roleData.description || "Cargo personalizado."}</CardDescription>
            </div>
            {(roleName !== "Lider" && roleName !== "Membro") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={isSaving}>
                     <Trash2 className="h-5 w-5" />
                   </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusao</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o cargo "{roleName}"? Esta acao nao pode ser desfeita.
                            Membros com este cargo serao revertidos para "Membro" (ou outro cargo padrao se necessario).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setRoleToDelete(roleName); handleDeleteRole(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPermissions.map(permission => (
              <div key={permission} className="flex items-start space-x-3 p-3 bg-input/30 rounded-md">
                <Checkbox
                  id={`${roleName}-${permission}`}
                  checked={roleData.permissions.includes(permission)}
                  onCheckedChange={(checked) => handlePermissionChange(roleName, permission, Boolean(checked))}
                  disabled={isSaving || (roleName === "Lider" && permission === GuildPermission.MANAGE_ROLES_PERMISSIONS)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={`${roleName}-${permission}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                  >
                    {permissionDescriptions[permission].substring(0, permissionDescriptions[permission].indexOf(':') > 0 ? permissionDescriptions[permission].indexOf(':') : permissionDescriptions[permission].length) || permission.replace(/_/g, ' ').toLocaleLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {permissionDescriptions[permission].substring(permissionDescriptions[permission].indexOf(':') + 1).trim() || "Gerencia esta permissao."}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      
      <div className="flex justify-end mt-8">
        <Button onClick={handleSaveChanges} className="btn-gradient btn-style-primary" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Salvar Alteracoes
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
