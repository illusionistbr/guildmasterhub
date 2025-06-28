

"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, deleteDoc, collection, getDocs as getFirestoreDocs, writeBatch, Timestamp, increment, deleteField, arrayUnion, arrayRemove } from '@/lib/firebase'; 
import type { Guild, GuildMemberRoleInfo, CustomRole, GuildPermission as PermissionEnum, DkpDecayLogEntry } from '@/types/guildmaster';
import { AuditActionType, GuildPermission } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as ShadCnAlertDialogDescription, 
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, ShieldAlert, Loader2, Trash2, Save, KeyRound, VenetianMask, ListChecks, PlusCircle, Coins, TrendingDown, Percent, CalendarDays as CalendarIcon, AlertCircle, Crosshair, MinusCircle, PlusCircle as PlusCircleIconLucide, Gem, Zap, CheckCircle, Lock, UsersRound } from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { useHeader } from '@/contexts/HeaderContext';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { TL_EVENT_CATEGORIES } from '@/components/dashboard/calendar/ThroneAndLibertyCalendarView';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const guildNameSchema = z.object({
  name: z.string().min(3, "Nome da guilda deve ter pelo menos 3 caracteres.").max(50, "Nome da guilda deve ter no máximo 50 caracteres."),
});
type GuildNameFormValues = z.infer<typeof guildNameSchema>;

const guildPasswordSchema = z.object({
  password: z.string().max(50, "Senha deve ter no máximo 50 caracteres.").optional().transform(val => val === "" ? undefined : val),
});
type GuildPasswordFormValues = z.infer<typeof guildPasswordSchema>;

const dkpSettingsSchema = z.object({
  dkpSystemEnabled: z.boolean(),
  dkpRedemptionWindowValue: z.coerce.number().min(1, "Deve ser pelo menos 1").optional(),
  dkpRedemptionWindowUnit: z.enum(['minutes', 'hours', 'days']).optional(),
  dkpDefaultsPerCategory: z.record(z.coerce.number().min(0).optional()).optional(),
}).refine(data => {
    if (data.dkpSystemEnabled) {
        return data.dkpRedemptionWindowValue !== undefined && data.dkpRedemptionWindowUnit !== undefined;
    }
    return true;
}, {
    message: "Janela de Resgate é obrigatória quando o sistema DKP está habilitado.",
    path: ["dkpRedemptionWindowValue"],
});
type DkpSettingsFormValues = z.infer<typeof dkpSettingsSchema>;

const dkpDecaySettingsSchema = z.object({
  dkpDecayEnabled: z.boolean(),
  dkpDecayPercentage: z.coerce.number().min(0, "Deve ser entre 0 e 100.").max(100, "Deve ser entre 0 e 100.").optional(),
  dkpDecayIntervalDays: z.coerce.number().min(1, "Deve ser pelo menos 1 dia.").optional(),
  dkpDecayInitialDate: z.date().optional(),
}).refine(data => {
  if (data.dkpDecayEnabled) {
    return data.dkpDecayPercentage !== undefined &&
           data.dkpDecayIntervalDays !== undefined &&
           data.dkpDecayInitialDate !== undefined;
  }
  return true;
}, {
  message: "Porcentagem, Intervalo e Data Inicial são obrigatórios quando o Decaimento DKP está habilitado.",
  path: ["dkpDecayPercentage"], 
});
type DkpDecaySettingsFormValues = z.infer<typeof dkpDecaySettingsSchema>;

const tlGuildFocusOptions = [
  { id: "pve", label: "PvE" },
  { id: "pvp_semi_hardcore", label: "PvP Semi-Hardcore" },
  { id: "pvp_hardcore", label: "PvP Hardcore" },
  { id: "pvpve_semi_hardcore", label: "PvPvE Semi-Hardcore" },
  { id: "pvpve_hardcore", label: "PvPvE Hardcore" },
];

const guildFocusSchema = z.object({
  tlGuildFocus: z.array(z.string()).min(1, "Selecione pelo menos um foco para a guilda."),
});
type GuildFocusFormValues = z.infer<typeof guildFocusSchema>;


const permissionDescriptions: Record<string, { title: string; description: string }> = {
  [GuildPermission.MANAGE_MEMBERS_VIEW]: { title: "Ver Membros", description: "Permite visualizar a lista de membros e seus perfis básicos." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_ROLE]: { title: "Gerenciar Cargos de Membros", description: "Permite modificar o cargo de outros membros." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_STATUS]: { title: "Gerenciar Status de Membros", description: "Permite alterar o status de atividade dos membros (Ativo, Inativo, Licença)." },
  [GuildPermission.MANAGE_MEMBERS_EDIT_NOTES]: { title: "Gerenciar Notas de Membros", description: "Permite adicionar ou editar notas administrativas sobre membros." },
  [GuildPermission.MANAGE_MEMBERS_KICK]: { title: "Expulsar Membros", description: "Permite remover membros da guilda." },
  [GuildPermission.MANAGE_MEMBERS_ASSIGN_SUB_GUILD]: { title: "Atribuir Membros a Sub-Guildas", description: "Permite mover membros entre as sub-guildas criadas." },
  [GuildPermission.MANAGE_EVENTS_CREATE]: { title: "Criar Eventos/Atividades", description: "Permite adicionar novos eventos ao calendário da guilda." },
  [GuildPermission.MANAGE_EVENTS_EDIT]: { title: "Editar Eventos/Atividades", description: "Permite modificar detalhes de eventos existentes." },
  [GuildPermission.MANAGE_EVENTS_DELETE]: { title: "Excluir Eventos/Atividades", description: "Permite remover eventos do calendário." },
  [GuildPermission.MANAGE_EVENTS_VIEW_PIN]: { title: "Visualizar PIN de Eventos", description: "Permite ver os códigos PIN gerados para eventos." },
  [GuildPermission.MANAGE_GUILD_SETTINGS_GENERAL]: { title: "Gerenciar Config. Gerais da Guilda", description: "Permite modificar nome, senha e outras configurações básicas da guilda." },
  [GuildPermission.MANAGE_GUILD_SETTINGS_APPEARANCE]: { title: "Gerenciar Aparência da Guilda", description: "Permite alterar logo e banner da guilda." },
  [GuildPermission.MANAGE_ROLES_PERMISSIONS]: { title: "Gerenciar Cargos e Permissões", description: "Permite criar, editar, excluir cargos e definir suas permissões (acesso a esta aba)." },
  [GuildPermission.MANAGE_SUB_GUILDS]: { title: "Gerenciar Sub-Guildas", description: "Permite habilitar, criar, editar e excluir sub-guildas." },
  [GuildPermission.MANAGE_GROUPS_CREATE]: { title: "Criar Grupos/Parties", description: "Permite formar e nomear grupos (parties) de membros." },
  [GuildPermission.MANAGE_GROUPS_EDIT]: { title: "Editar Grupos/Parties", description: "Permite modificar a composição e detalhes de grupos existentes." },
  [GuildPermission.MANAGE_GROUPS_DELETE]: { title: "Excluir Grupos/Parties", description: "Permite dissolver grupos (parties)." },
  [GuildPermission.VIEW_AUDIT_LOG]: { title: "Ver Log de Auditoria", description: "Permite visualizar o histórico de ações administrativas na guilda." },
  [GuildPermission.MANAGE_RECRUITMENT_VIEW_APPLICATIONS]: { title: "Ver Candidaturas", description: "Permite visualizar candidaturas enviadas à guilda." },
  [GuildPermission.MANAGE_RECRUITMENT_PROCESS_APPLICATIONS]: { title: "Processar Candidaturas", description: "Permite aprovar ou rejeitar candidaturas de novos membros." },
  [GuildPermission.VIEW_MEMBER_DETAILED_INFO]: { title: "Ver Informações Detalhadas de Membros", description: "Permite visualizar gearscore, links de build e outras informações detalhadas dos membros." },
  [GuildPermission.MANAGE_DKP_SETTINGS]: { title: "Gerenciar Configurações DKP", description: "Permite habilitar/desabilitar o sistema DKP, definir janela de resgate e valores padrão por evento." },
  [GuildPermission.MANAGE_DKP_DECAY_SETTINGS]: { title: "Gerenciar Decaimento DKP", description: "Permite configurar o decaimento automático de DKP, incluindo porcentagem, intervalo e data inicial." },
  [GuildPermission.MANAGE_MANUAL_CONFIRMATIONS_APPROVE]: { title: "Aprovar Confirmações Manuais", description: "Permite aprovar ou rejeitar submissões manuais de participação em eventos." },
  [GuildPermission.MANAGE_MEMBER_DKP_BALANCE]: { title: "Gerenciar Saldo DKP de Membros", description: "Permite adicionar ou remover DKP do saldo de membros individualmente." },
  [GuildPermission.MANAGE_LOOT_BANK_ADD]: { title: "Adicionar Item ao Banco", description: "Permite adicionar novos itens ao banco da guilda." },
  [GuildPermission.MANAGE_LOOT_BANK_MANAGE]: { title: "Gerenciar Itens do Banco", description: "Permite editar, excluir e alterar o status de itens no banco." },
  [GuildPermission.MANAGE_LOOT_AUCTIONS_CREATE]: { title: "Criar Leilões de Loot", description: "Permite iniciar leilões de itens do banco." },
  [GuildPermission.MANAGE_LOOT_AUCTIONS_EDIT]: { title: "Editar Leilões de Loot", description: "Permite editar detalhes de leilões em andamento (ex: data de término)." },
  [GuildPermission.MANAGE_LOOT_AUCTIONS_DELETE]: { title: "Excluir/Cancelar Leilões", description: "Permite cancelar leilões ativos ou excluir leilões do histórico." },
  [GuildPermission.MANAGE_LOOT_ROLLS_CREATE]: { title: "Criar Rolagens de Loot", description: "Permite iniciar rolagens de dados para itens do banco." },
  [GuildPermission.MANAGE_LOOT_ROLLS_MANAGE]: { title: "Gerenciar Rolagens de Loot", description: "Permite gerenciar, fechar e resolver rolagens de dados em andamento." },
  [GuildPermission.MANAGE_LOOT_SETTINGS]: { title: "Gerenciar Configurações de Loot", description: "Permite acessar e modificar as configurações do módulo de loot." },
  [GuildPermission.MANAGE_BILLING]: { title: "Gerenciar Plano e Cobrança", description: "Permite visualizar e alterar o plano de assinatura da guilda." },
  [GuildPermission.MANAGE_GEAR_SCREENSHOT_REQUESTS]: { title: "Solicitar Atualização de Screenshot de Gear", description: "Permite solicitar que um membro atualize seu screenshot de gearscore." },
  [GuildPermission.MANAGE_VOD_REVIEWS]: { title: "Analisar VODs", description: "Permite visualizar e dar feedback em VODs enviados por membros." },
};
const allPermissionsList = Object.values(GuildPermission);


function GuildSettingsPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingFocus, setIsSubmittingFocus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [customRoles, setCustomRoles] = useState<Record<string, CustomRole>>({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [isSubmittingDkp, setIsSubmittingDkp] = useState(false);
  const [isSubmittingDkpDecay, setIsSubmittingDkpDecay] = useState(false);
  const [showOnDemandDecayDialog, setShowOnDemandDecayDialog] = useState(false);
  const [isProcessingOnDemandDecay, setIsProcessingOnDemandDecay] = useState(false);
  const [dkpDecayLogs, setDkpDecayLogs] = useState<DkpDecayLogEntry[]>([]); 

  const [isSubmittingSubGuilds, setIsSubmittingSubGuilds] = useState(false);
  const [subGuilds, setSubGuilds] = useState<{ id: string; name: string }[]>([]);
  const [newSubGuildName, setNewSubGuildName] = useState('');

  const guildId = searchParams.get('guildId');

  const nameForm = useForm<GuildNameFormValues>({
    resolver: zodResolver(guildNameSchema),
    defaultValues: { name: "" },
  });

  const passwordForm = useForm<GuildPasswordFormValues>({
    resolver: zodResolver(guildPasswordSchema),
    defaultValues: { password: "" },
  });

  const focusForm = useForm<GuildFocusFormValues>({
    resolver: zodResolver(guildFocusSchema),
    defaultValues: { tlGuildFocus: [] },
  });

  const dkpForm = useForm<DkpSettingsFormValues>({
    resolver: zodResolver(dkpSettingsSchema),
    defaultValues: {
      dkpSystemEnabled: false,
      dkpRedemptionWindowValue: 24,
      dkpRedemptionWindowUnit: 'hours',
      dkpDefaultsPerCategory: {},
    },
  });

  const dkpDecayForm = useForm<DkpDecaySettingsFormValues>({
    resolver: zodResolver(dkpDecaySettingsSchema),
    defaultValues: {
      dkpDecayEnabled: false,
      dkpDecayPercentage: 10,
      dkpDecayIntervalDays: 30,
      dkpDecayInitialDate: undefined,
    }
  });


  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canManageGeneralSettings = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_GUILD_SETTINGS_GENERAL
    );
  }, [currentUserRoleInfo, guild?.customRoles]);

  const canManageSubGuilds = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(currentUserRoleInfo.roleName, guild.customRoles, GuildPermission.MANAGE_SUB_GUILDS);
  }, [currentUserRoleInfo, guild?.customRoles]);


  const canManageRolesAndPermissionsPage = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_ROLES_PERMISSIONS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);
  
  const canManageDkpSettings = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
        currentUserRoleInfo.roleName,
        guild.customRoles,
        GuildPermission.MANAGE_DKP_SETTINGS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);

  const canManageDkpDecaySettings = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
        currentUserRoleInfo.roleName,
        guild.customRoles,
        GuildPermission.MANAGE_DKP_DECAY_SETTINGS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);


  const canDeleteGuild = useMemo(() => currentUser?.uid === guild?.ownerId, [currentUser, guild]);

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

    const fetchData = async () => {
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
        setHeaderTitle(`Configurações: ${guildData.name}`);

        if (!guildData.memberIds?.includes(currentUser.uid)) {
            toast({title: "Acesso Negado", description: "Você não é membro desta guilda.", variant: "destructive"});
            setAccessDenied(true);
            setLoadingData(false);
            return;
        }

        nameForm.reset({ name: guildData.name });
        passwordForm.reset({ password: guildData.password || "" });
        focusForm.reset({ tlGuildFocus: guildData.tlGuildFocus || [] });
        setSubGuilds(guildData.subGuilds || []);
        dkpForm.reset({
          dkpSystemEnabled: guildData.dkpSystemEnabled || false,
          dkpRedemptionWindowValue: guildData.dkpRedemptionWindow?.value || 24,
          dkpRedemptionWindowUnit: guildData.dkpRedemptionWindow?.unit || 'hours',
          dkpDefaultsPerCategory: guildData.dkpDefaultsPerCategory || {},
        });
        dkpDecayForm.reset({
          dkpDecayEnabled: guildData.dkpDecayEnabled || false,
          dkpDecayPercentage: guildData.dkpDecayPercentage ?? 10,
          dkpDecayIntervalDays: guildData.dkpDecayIntervalDays ?? 30,
          dkpDecayInitialDate: guildData.dkpDecayInitialDate ? (guildData.dkpDecayInitialDate as Timestamp).toDate() : undefined,
        });


        const initialRoles = guildData.customRoles || {};
        const allCurrentPermissions = Object.values(GuildPermission);
        // Ensure Lider has all permissions, including new ones
        const liderPermissions = [...new Set([...allCurrentPermissions])];


        if (!initialRoles["Lider"]) {
          initialRoles["Lider"] = { permissions: liderPermissions, description: "Fundador e administrador principal da guilda."};
        } else {
           initialRoles["Lider"].permissions = [...new Set([...initialRoles["Lider"].permissions, ...liderPermissions])];
        }
        if (!initialRoles["Membro"]) {
          initialRoles["Membro"] = { permissions: [GuildPermission.MANAGE_MEMBERS_VIEW, GuildPermission.VIEW_MEMBER_DETAILED_INFO], description: "Membro padrão da guilda."};
        }
        setCustomRoles(initialRoles);


      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();

    return () => {
      setHeaderTitle(null);
    };
  }, [guildId, currentUser, authLoading, router, toast, nameForm, passwordForm, focusForm, dkpForm, dkpDecayForm, setHeaderTitle]);

  const handleNameSubmit: SubmitHandler<GuildNameFormValues> = async (data) => {
    if (!guild || !currentUser || !canManageGeneralSettings) {
      toast({ title: "Permissão Negada", description: "Você não tem permissão para alterar o nome da guilda.", variant: "destructive"});
      return;
    }
    setIsSubmittingName(true);
    const oldName = guild.name;
    try {
      const guildRef = doc(db, "guilds", guild.id);
      await updateDoc(guildRef, { name: data.name });

      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.GUILD_NAME_UPDATED, {
        oldValue: oldName,
        newValue: data.name,
        changedField: 'name',
      });

      setGuild(prev => prev ? { ...prev, name: data.name } : null);
      nameForm.reset({ name: data.name });
      setHeaderTitle(`Configurações: ${data.name}`);
      toast({ title: "Nome da Guilda Atualizado!", description: `O nome da guilda foi alterado para ${data.name}.` });
    } catch (error) {
      console.error("Erro ao atualizar nome da guilda:", error);
      toast({ title: "Erro ao Atualizar Nome", variant: "destructive" });
    } finally {
      setIsSubmittingName(false);
    }
  };

  const handleSubGuildSettingsSave = async () => {
    if (!guild || !currentUser || !canManageSubGuilds) {
      toast({ title: "Permissão Negada", description: "Você não tem permissão para gerenciar sub-guildas.", variant: "destructive" });
      return;
    }
    setIsSubmittingSubGuilds(true);
    const enabled = guild?.subGuildsEnabled || false;
    try {
      const guildRef = doc(db, "guilds", guild.id);
      await updateDoc(guildRef, { subGuildsEnabled: enabled });

      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, enabled ? AuditActionType.SUB_GUILDS_ENABLED : AuditActionType.SUB_GUILDS_DISABLED, {
        changedField: 'subGuildsEnabled',
      });

      toast({ title: "Configuração Salva!", description: `O sistema de sub-guildas foi ${enabled ? 'habilitado' : 'desabilitado'}.` });
    } catch (error) {
      console.error("Erro ao salvar configuração de sub-guilda:", error);
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSubmittingSubGuilds(false);
    }
  };

  const handleAddSubGuild = async () => {
    if (!guild || !currentUser || !canManageSubGuilds) return;
    const trimmedName = newSubGuildName.trim();
    if (trimmedName === "") {
        toast({ title: "Nome Inválido", description: "O nome da sub-guilda não pode estar vazio.", variant: "destructive" });
        return;
    }
    if (subGuilds.some(sg => sg.name.toLowerCase() === trimmedName.toLowerCase())) {
        toast({ title: "Nome Duplicado", description: "Já existe uma sub-guilda com este nome.", variant: "destructive" });
        return;
    }

    setIsSubmittingSubGuilds(true);
    const newSubGuild = { id: `sg_${Date.now()}`, name: trimmedName };
    try {
        const guildRef = doc(db, "guilds", guild.id);
        await updateDoc(guildRef, {
            subGuilds: arrayUnion(newSubGuild)
        });
        
        setSubGuilds([...subGuilds, newSubGuild]);

        await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.SUB_GUILD_CREATED, {
            subGuildName: newSubGuild.name
        });
        
        toast({ title: "Sub-Guilda Adicionada!", description: `"${newSubGuild.name}" foi adicionada.` });
        setNewSubGuildName("");
    } catch (error) {
        console.error("Erro ao adicionar sub-guilda:", error);
        toast({ title: "Erro ao Adicionar", variant: "destructive" });
    } finally {
        setIsSubmittingSubGuilds(false);
    }
  };

  const handleDeleteSubGuild = async (id: string) => {
    if (!guild || !currentUser || !canManageSubGuilds) return;

    const subGuildToDelete = subGuilds.find(sg => sg.id === id);
    if (!subGuildToDelete) return;

    setIsSubmittingSubGuilds(true);
    try {
        const guildRef = doc(db, "guilds", guild.id);
        await updateDoc(guildRef, {
            subGuilds: arrayRemove(subGuildToDelete)
        });

        setSubGuilds(subGuilds.filter(sg => sg.id !== id));

        await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.SUB_GUILD_DELETED, {
            subGuildName: subGuildToDelete.name
        });

        toast({ title: "Sub-Guilda Removida!", description: `"${subGuildToDelete.name}" foi removida.` });
    } catch (error) {
        console.error("Erro ao remover sub-guilda:", error);
        toast({ title: "Erro ao Remover", variant: "destructive" });
    } finally {
        setIsSubmittingSubGuilds(false);
    }
  };


  const handlePasswordSubmit: SubmitHandler<GuildPasswordFormValues> = async (data) => {
     if (!guild || !currentUser || !canManageGeneralSettings) {
      toast({ title: "Permissão Negada", description: "Você não tem permissão para alterar a senha da guilda.", variant: "destructive"});
      return;
    }
    setIsSubmittingPassword(true);
    const oldPasswordExists = !!guild.password;
    const newPasswordExists = !!data.password;

    try {
      const guildRef = doc(db, "guilds", guild.id);
      await updateDoc(guildRef, {
        password: data.password || null,
        isOpen: !data.password
      });

      let logMessageToast = "";
      if (oldPasswordExists && newPasswordExists && guild.password !== data.password) {
        logMessageToast = "Senha da guilda alterada.";
      } else if (!oldPasswordExists && newPasswordExists) {
        logMessageToast = "Senha definida para a guilda (agora é privada).";
      } else if (oldPasswordExists && !newPasswordExists) {
        logMessageToast = "Senha da guilda removida (agora é aberta).";
      }

      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.GUILD_PASSWORD_UPDATED, {
        oldValue: oldPasswordExists ? "Senha Definida" : "Sem Senha",
        newValue: newPasswordExists ? "Senha Definida" : "Sem Senha",
        changedField: 'password',
      });
       await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.GUILD_VISIBILITY_CHANGED, {
        oldValue: guild.isOpen,
        newValue: !data.password,
        changedField: 'visibility',
      });

      setGuild(prev => prev ? { ...prev, password: data.password, isOpen: !data.password } : null);
      passwordForm.reset({ password: data.password || "" });
      toast({ title: "Senha da Guilda Atualizada!", description: logMessageToast || "Configuração de senha salva." });
    } catch (error) {
      console.error("Erro ao atualizar senha da guilda:", error);
      toast({ title: "Erro ao Atualizar Senha", variant: "destructive" });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleFocusSubmit: SubmitHandler<GuildFocusFormValues> = async (data) => {
    if (!guild || !currentUser || !canManageGeneralSettings) {
      toast({ title: "Permissão Negada", description: "Você não tem permissão para alterar o foco da guilda.", variant: "destructive" });
      return;
    }
    setIsSubmittingFocus(true);
    const oldFocus = guild.tlGuildFocus;
    try {
      const guildRef = doc(db, "guilds", guild.id);
      await updateDoc(guildRef, { tlGuildFocus: data.tlGuildFocus });

      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.GUILD_SETTINGS_UPDATED, { 
        changedField: 'tlGuildFocus' as any, 
        oldValue: oldFocus?.join(', ') || "Nenhum",
        newValue: data.tlGuildFocus.join(', '),
      });

      setGuild(prev => prev ? { ...prev, tlGuildFocus: data.tlGuildFocus } : null);
      focusForm.reset({ tlGuildFocus: data.tlGuildFocus });
      toast({ title: "Foco da Guilda Atualizado!", description: "O foco da guilda Throne and Liberty foi salvo." });
    } catch (error) {
      console.error("Erro ao atualizar foco da guilda:", error);
      toast({ title: "Erro ao Atualizar Foco", variant: "destructive" });
    } finally {
      setIsSubmittingFocus(false);
    }
  };

  const handleDeleteGuild = async () => {
    if (!guild || !currentUser || !canDeleteGuild) {
        toast({ title: "Ação não permitida", description: "Apenas o fundador original pode excluir esta guilda.", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    console.log(`[GuildDelete] Iniciando exclusão da guilda: ${guild.id} por ${currentUser.uid}`);
    try {
      const subcollections = ['auditLogs', 'applications', 'events', 'groups', 'notifications', 'dkpDecayLogs'];
      for (const subcoll of subcollections) {
        console.log(`[GuildDelete] Verificando subcoleção: ${subcoll}`);
        try {
          const subcollRef = collection(db, `guilds/${guild.id}/${subcoll}`);
          const subcollSnap = await getFirestoreDocs(subcollRef);
          if (!subcollSnap.empty) {
            const subBatch = writeBatch(db);
            subcollSnap.docs.forEach(docToDelete => subBatch.delete(docToDelete.ref));
            console.log(`[GuildDelete] Tentando commitar o batch de exclusão para a subcoleção: ${subcoll} (${subcollSnap.size} documentos)`);
            await subBatch.commit();
            console.log(`[GuildDelete] Documentos da subcoleção ${subcoll} excluídos com sucesso.`);
          } else {
            console.log(`[GuildDelete] Subcoleção ${subcoll} está vazia. Pulando exclusão.`);
          }
        } catch (subError: any) {
          console.error(`[GuildDelete] Erro ao excluir documentos da subcoleção ${subcoll}:`, subError);
          toast({
            title: `Erro de Permissão ao Excluir "${subcoll}"`,
            description: `Falha ao excluir a subcoleção "${subcoll}". Detalhes: ${subError.message}. Verifique suas REGRAS DE SEGURANÇA DO FIRESTORE para o caminho "guilds/${guild.id}/${subcoll}". O proprietário da guilda precisa ter permissão de exclusão explícita para esta subcoleção.`,
            variant: "destructive",
            duration: 20000 
          });
          throw new Error(`Falha ao excluir a subcoleção ${subcoll}: ${subError.message}`);
        }
      }

      console.log(`[GuildDelete] Tentando excluir o documento principal da guilda: ${guild.id}`);
      const guildRef = doc(db, "guilds", guild.id);
      await deleteDoc(guildRef);
      console.log(`[GuildDelete] Documento principal da guilda ${guild.id} excluído com sucesso.`);

      toast({ title: "Guilda Excluída!", description: `A guilda ${guild.name} foi permanentemente excluída.` });
      setHeaderTitle(null);
      router.push('/guild-selection');
    } catch (error: any) { 
      console.error("[GuildDelete] Erro durante o processo de exclusão da guilda:", error);
      if (!error.message.startsWith("Falha ao excluir a subcoleção")) {
        toast({ title: "Erro ao Excluir Guilda", description: `Não foi possível excluir a guilda. Detalhes: ${error.message}. Verifique o console para mais informações e suas regras do Firestore.`, variant: "destructive", duration: 10000 });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDkpSettingsSubmit: SubmitHandler<DkpSettingsFormValues> = async (data) => {
    if (!guild || !currentUser || !canManageDkpSettings) {
        toast({title: "Permissão Negada", description: "Você não tem permissão para alterar as configurações de DKP.", variant: "destructive"});
        return;
    }
    setIsSubmittingDkp(true);
    try {
        const guildRef = doc(db, "guilds", guild.id);
        const updatePayload: Partial<Guild> = {
            dkpSystemEnabled: data.dkpSystemEnabled,
        };

        if (data.dkpSystemEnabled) {
            updatePayload.dkpRedemptionWindow = {
                value: data.dkpRedemptionWindowValue || 24,
                unit: data.dkpRedemptionWindowUnit || 'hours',
            };
            updatePayload.dkpDefaultsPerCategory = data.dkpDefaultsPerCategory || {};
        } else {
            updatePayload.dkpRedemptionWindow = deleteField() as any; 
            updatePayload.dkpDefaultsPerCategory = deleteField() as any; 
        }

        await updateDoc(guildRef, updatePayload as { [key: string]: any });
        setGuild(prev => prev ? { ...prev, ...updatePayload } : null);
        dkpForm.reset(data);

        await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.DKP_SETTINGS_UPDATED, {
            changedField: 'dkpSystemEnabled', 
            newValue: data.dkpSystemEnabled.toString(),
        });

        toast({title: "Configurações de DKP Salvas!", description: "As configurações do sistema DKP foram atualizadas."});
    } catch (error) {
        console.error("Erro ao salvar configurações de DKP:", error);
        toast({title: "Erro ao Salvar DKP", variant: "destructive"});
    } finally {
      setIsSubmittingDkp(false);
    }
  };

  const handleDkpDecaySettingsSubmit: SubmitHandler<DkpDecaySettingsFormValues> = async (data) => {
    if (!guild || !currentUser || !canManageDkpDecaySettings) {
      toast({ title: "Permissão Negada", description: "Você não tem permissão para alterar as configurações de decaimento de DKP.", variant: "destructive" });
      return;
    }
    setIsSubmittingDkpDecay(true);
    try {
      const guildRef = doc(db, "guilds", guild.id);
      const updatePayload: { [key: string]: any } = { 
        dkpDecayEnabled: data.dkpDecayEnabled,
      };

      if (data.dkpDecayEnabled) {
        updatePayload.dkpDecayPercentage = data.dkpDecayPercentage;
        updatePayload.dkpDecayIntervalDays = data.dkpDecayIntervalDays;
        updatePayload.dkpDecayInitialDate = data.dkpDecayInitialDate ? Timestamp.fromDate(data.dkpDecayInitialDate) : deleteField();
      } else {
        updatePayload.dkpDecayPercentage = deleteField();
        updatePayload.dkpDecayIntervalDays = deleteField();
        updatePayload.dkpDecayInitialDate = deleteField();
      }

      await updateDoc(guildRef, updatePayload);
      setGuild(prev => {
        if (!prev) return null;
        const newGuildState = { ...prev, ...updatePayload };
        if (!data.dkpDecayEnabled) {
            delete newGuildState.dkpDecayPercentage;
            delete newGuildState.dkpDecayIntervalDays;
            delete newGuildState.dkpDecayInitialDate;
        }
        return newGuildState;
      });
      
      dkpDecayForm.reset({
          ...data,
          dkpDecayInitialDate: data.dkpDecayInitialDate ? data.dkpDecayInitialDate : undefined,
      });


      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.DKP_DECAY_SETTINGS_UPDATED, {
        changedField: 'dkpDecayEnabled', 
        newValue: data.dkpDecayEnabled.toString(),
      });

      toast({ title: "Configurações de Decaimento DKP Salvas!", description: "As configurações do sistema de decaimento de DKP foram atualizadas." });
    } catch (error) {
      console.error("Erro ao salvar configurações de decaimento de DKP:", error);
      toast({ title: "Erro ao Salvar Decaimento DKP", variant: "destructive" });
    } finally {
      setIsSubmittingDkpDecay(false);
    }
  };

  const handleInitiateOnDemandDecay = async () => {
    if (!guild || !currentUser || !canManageDkpDecaySettings || !guild.dkpDecayEnabled || guild.dkpDecayPercentage === undefined || guild.dkpDecayPercentage <= 0 || !guildId) {
      toast({ title: "Ação Inválida", description: "O decaimento DKP não está habilitado, a porcentagem é zero ou você não tem permissão.", variant: "destructive" });
      setShowOnDemandDecayDialog(false);
      return;
    }
    setIsProcessingOnDemandDecay(true);
    try {
      const decayPercentage = guild.dkpDecayPercentage / 100;
      const guildRef = doc(db, 'guilds', guildId);
      const guildSnapshot = await getDoc(guildRef); 
      if (!guildSnapshot.exists()) {
        throw new Error("Guilda não encontrada para o decaimento.");
      }
      const currentGuildData = guildSnapshot.data() as Guild;
      const rolesToUpdate = currentGuildData.roles || {};
      let affectedCount = 0;

      const batch = writeBatch(db);
      for (const memberId in rolesToUpdate) {
        const memberRoleInfo = rolesToUpdate[memberId];
        if (memberRoleInfo.dkpBalance && memberRoleInfo.dkpBalance > 0) {
          const currentDkp = memberRoleInfo.dkpBalance;
          const amountToDecay = Math.floor(currentDkp * decayPercentage);
          const newDkp = currentDkp - amountToDecay;
          
          batch.update(guildRef, { [`roles.${memberId}.dkpBalance`]: newDkp });
          affectedCount++;
        }
      }
      await batch.commit();

      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.DKP_ON_DEMAND_DECAY_TRIGGERED, {
        decayPercentage: guild.dkpDecayPercentage,
        affectedMembersCount: affectedCount,
        details: { decayType: 'on_demand' }
      });
      
      toast({ title: "Decaimento Sob Demanda Iniciado!", description: `DKP de ${affectedCount} membro(s) foi reduzido em ${guild.dkpDecayPercentage}%.` });
      
    } catch (error) {
      console.error("Erro ao iniciar decaimento sob demanda:", error);
      toast({ title: "Erro no Decaimento", description: "Não foi possível processar o decaimento sob demanda.", variant: "destructive" });
    } finally {
      setIsProcessingOnDemandDecay(false);
      setShowOnDemandDecayDialog(false);
    }
  };


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
    if (!canManageRolesAndPermissionsPage) {
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
    toast({ title: "Cargo Criado Localmente", description: `Cargo "${trimmedRoleName}" adicionado. Configure suas permissões e clique em "Salvar Alterações" para persistir.` });
  };

  const handleDeleteRole = async (roleName: string) => {
    if (!roleName || !guildId || !currentUser || !canManageRolesAndPermissionsPage) {
        toast({ title: "Permissão Negada", description: "Você não tem permissão para excluir cargos.", variant: "destructive"});
        setRoleToDelete(null);
        return;
    }
    if (roleName === "Lider" || roleName === "Membro") {
      toast({ title: "Ação Não Permitida", description: "Os cargos 'Líder' e 'Membro' não podem ser excluídos.", variant: "destructive" });
      setRoleToDelete(null);
      return;
    }

    setCustomRoles(prevRoles => {
        const updatedRoles = { ...prevRoles };
        delete updatedRoles[roleName];
        return updatedRoles;
    });

    toast({ title: "Cargo Marcado para Exclusão", description: `O cargo "${roleName}" será removido ao salvar as alterações.` });
    setRoleToDelete(null);
  };

  const handleSaveChangesPermissions = async () => {
    if (!guildId || !currentUser || !canManageRolesAndPermissionsPage || !guild) {
        toast({title: "Permissão Negada", description: "Você não tem permissão para salvar estas alterações.", variant: "destructive"});
        return;
    }
    setIsSavingPermissions(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const rolesToSave = { ...customRoles };

      const allCurrentPermissions = Object.values(GuildPermission);
      const defaultLiderPermissions = [...new Set([...allCurrentPermissions])];
      const defaultMembroPermissions = [GuildPermission.MANAGE_MEMBERS_VIEW, GuildPermission.VIEW_MEMBER_DETAILED_INFO];

      if (!rolesToSave["Lider"]) {
        rolesToSave["Lider"] = { permissions: defaultLiderPermissions, description: "Fundador e administrador principal da guilda."};
      } else {
         rolesToSave["Lider"].permissions = [...new Set([...rolesToSave["Lider"].permissions, ...defaultLiderPermissions])];
      }

      if (!rolesToSave["Membro"]) {
        rolesToSave["Membro"] = { permissions: defaultMembroPermissions, description: "Membro padrão da guilda."};
      } else {
        rolesToSave["Membro"].permissions = [...new Set([...rolesToSave["Membro"].permissions, ...defaultMembroPermissions])];
      }


      await updateDoc(guildRef, { customRoles: rolesToSave });
      setGuild(prev => prev ? { ...prev, customRoles: rolesToSave } : null);
      setCustomRoles(rolesToSave);

      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "Usuario", AuditActionType.PERMISSIONS_UPDATED_FOR_ROLE, {
         details: { changedField: 'customRoles' },
         roleName: "Todos os Cargos",
      });

      toast({ title: "Permissões Salvas!", description: "As permissões dos cargos foram atualizadas com sucesso." });
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const sortedRoleNames = useMemo(() => Object.keys(customRoles).sort((roleA, roleB) => {
    if (roleA === "Lider") return -1;
    if (roleB === "Lider") return 1;
    if (roleA === "Membro") return -1;
    if (roleB === "Membro") return 1;
    return roleA.localeCompare(roleB);
  }), [customRoles]);


  if (loadingData || authLoading) {
    return (
      <div className="space-y-8 p-4 md:p-6">
        <PageTitle title="Configurações da Guilda" icon={<SettingsIcon className="h-8 w-8 text-primary" />} />
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4"> 
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="permissions" disabled>Cargos e Permissões</TabsTrigger>
            <TabsTrigger value="dkp" disabled>DKP</TabsTrigger>
            <TabsTrigger value="dkpDecay" disabled>Decaimento DKP</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-6">
            <Skeleton className="h-48 w-full mb-6" />
            <Skeleton className="h-48 w-full mb-6" />
            <Skeleton className="h-48 w-full" />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
        <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />
        <h2 className="text-3xl font-headline text-destructive">Acesso Negado</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Você não tem permissão para acessar as configurações desta guilda.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }

  if (!guild) {
     return (
        <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
            <VenetianMask className="h-24 w-24 text-primary" />
            <h2 className="text-3xl font-headline">Guilda Não Encontrada</h2>
            <p className="text-lg text-muted-foreground max-w-md">
            Não foi possível carregar os dados da guilda.
            </p>
            <Button onClick={() => router.push('/guild-selection')} variant="outline">Selecionar Guilda</Button>
        </div>
    );
  }

  const presetPercentages = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const presetIntervals = [7, 14, 30, 60, 90];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageTitle
        title={`Configurações de ${guild.name}`}
        description="Gerencie as informações e permissões da sua guilda."
        icon={<SettingsIcon className="h-8 w-8 text-primary" />}
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4"> 
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="permissions" disabled={!canManageRolesAndPermissionsPage}>Cargos e Permissões</TabsTrigger>
          <TabsTrigger value="dkp" disabled={!canManageDkpSettings}>DKP</TabsTrigger>
          <TabsTrigger value="dkpDecay" disabled={!canManageDkpDecaySettings}>Decaimento DKP</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-8">
          
          <Card className="static-card-container">
            <CardHeader>
              <CardTitle>Alterar Nome da Guilda</CardTitle>
            </CardHeader>
            <Form {...nameForm}>
              <form onSubmit={nameForm.handleSubmit(handleNameSubmit)}>
                <CardContent>
                  <FormField
                    control={nameForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="guildName">Nome da Guilda</FormLabel>
                        <FormControl>
                          <Input id="guildName" {...field} className="form-input" disabled={!canManageGeneralSettings || isSubmittingName}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="btn-gradient btn-style-secondary" disabled={!canManageGeneralSettings || isSubmittingName || nameForm.getValues("name") === guild.name}>
                    {isSubmittingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Nome
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          <Card className="static-card-container">
            <CardHeader><CardTitle className="flex items-center"><UsersRound className="mr-2 h-5 w-5 text-primary" />Sub-Guildas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="subguild-switch" className="text-base">Habilitar Sistema de Sub-Guildas</Label>
                  <p className="text-sm text-muted-foreground">Permite dividir membros em diferentes sub-guildas dentro da guilda principal.</p>
                </div>
                <Switch
                  id="subguild-switch"
                  checked={guild?.subGuildsEnabled || false}
                  onCheckedChange={(checked) => setGuild(prev => prev ? { ...prev, subGuildsEnabled: checked } : null)}
                  disabled={!canManageSubGuilds || isSubmittingSubGuilds}
                />
              </div>
              {guild.subGuildsEnabled && (
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="newSubGuildName">Nova Sub-Guilda</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="newSubGuildName"
                        value={newSubGuildName}
                        onChange={(e) => setNewSubGuildName(e.target.value)}
                        placeholder="Nome da Sub-Guilda"
                        className="form-input"
                        disabled={!canManageSubGuilds || isSubmittingSubGuilds}
                      />
                      <Button onClick={handleAddSubGuild} disabled={!canManageSubGuilds || isSubmittingSubGuilds}><PlusCircle className="h-4 w-4 mr-2"/> Adicionar</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub-Guildas Atuais:</Label>
                    {subGuilds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma sub-guilda criada.</p>
                    ) : (
                      subGuilds.map((sg) => (
                        <div key={sg.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                          <p>{sg.name}</p>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSubGuild(sg.id)} disabled={!canManageSubGuilds || isSubmittingSubGuilds}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSubGuildSettingsSave} className="btn-gradient btn-style-secondary ml-auto" disabled={!canManageSubGuilds || isSubmittingSubGuilds}>
                {isSubmittingSubGuilds ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Salvar Configuração
              </Button>
            </CardFooter>
          </Card>

          <Card className="static-card-container">
            <CardHeader>
              <CardTitle>Alterar Senha da Guilda</CardTitle>
              <CardDescription>Deixe em branco para tornar a guilda aberta (sem senha para entrar).</CardDescription>
            </CardHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
                <CardContent>
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="guildPassword">Nova Senha (Opcional)</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                            <Input id="guildPassword" type="password" {...field} placeholder="Deixe em branco para guilda aberta" className="form-input pl-10" disabled={!canManageGeneralSettings || isSubmittingPassword} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="btn-gradient btn-style-secondary" disabled={!canManageGeneralSettings || isSubmittingPassword || passwordForm.getValues("password") === guild.password}>
                    {isSubmittingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Senha
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          {guild.game === "Throne and Liberty" && (
            <Card className="static-card-container">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crosshair className="mr-2 h-5 w-5 text-primary" />
                  Foco da Guilda (Throne and Liberty)
                </CardTitle>
                <CardDescription>Defina os principais focos de atividade para sua guilda de Throne and Liberty.</CardDescription>
              </CardHeader>
              <Form {...focusForm}>
                <form onSubmit={focusForm.handleSubmit(handleFocusSubmit)}>
                  <CardContent>
                    <FormField
                      control={focusForm.control}
                      name="tlGuildFocus"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Selecione um ou mais focos:</FormLabel>
                          </div>
                          {tlGuildFocusOptions.map((option) => (
                            <FormField
                              key={option.id}
                              control={focusForm.control}
                              name="tlGuildFocus"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    className="flex flex-row items-start space-x-3 space-y-0 mb-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), option.id])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                  (value: string) => value !== option.id
                                                )
                                              );
                                        }}
                                        disabled={!canManageGeneralSettings || isSubmittingFocus}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {option.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="btn-gradient btn-style-secondary" disabled={!canManageGeneralSettings || isSubmittingFocus}>
                      {isSubmittingFocus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salvar Foco da Guilda
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          )}

          <Card className="static-card-container border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                A exclusão da guilda é uma ação permanente e não pode ser desfeita.
                Todos os dados associados, incluindo membros (de suas listas na guilda, não contas de usuário), eventos e logs, serão perdidos. Apenas o fundador original pode excluir a guilda.
              </CardDescription>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!canDeleteGuild || isDeleting}
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Excluir Guilda Permanentemente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Tem certeza absoluta?</AlertDialogTitle>
                    <ShadCnAlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente a guilda "{guild.name}"
                      e todos os seus dados associados.
                    </ShadCnAlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {}} disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteGuild}
                      className={cn(buttonVariants({ variant: "destructive" }))}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sim, excluir esta guilda
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6 space-y-6">
           
            {!canManageRolesAndPermissionsPage ? (
            <Card className="static-card-container">
              <CardHeader>
                <CardTitle className="text-destructive">Acesso Negado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Você não tem permissão para gerenciar cargos e permissões.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="static-card-container">
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
                      disabled={!canManageRolesAndPermissionsPage || isSavingPermissions}
                    />
                  </div>
                  <Button
                    onClick={handleCreateNewRole}
                    className="w-full sm:w-auto btn-gradient btn-style-secondary"
                    disabled={!canManageRolesAndPermissionsPage || isSavingPermissions || !newRoleName.trim()}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" /> Criar Cargo
                  </Button>
                </CardContent>
              </Card>

              <Accordion type="multiple" defaultValue={["Lider", "Membro"]} className="w-full space-y-2">
                {sortedRoleNames.map((roleName) => {
                  const roleData = customRoles[roleName];
                  if (!roleData) return null;
                  return (
                    <AccordionItem value={roleName} key={roleName} className="static-card-container rounded-lg overflow-hidden border">
                       <AccordionPrimitive.Header className="flex">
                        <AccordionTrigger className="flex w-full items-center justify-between p-3 sm:px-4 sm:py-3 hover:no-underline text-left">
                           <div className="flex-grow space-y-1">
                            <h3 className="text-lg font-semibold text-foreground">{roleName}</h3>
                            <p className="text-xs text-muted-foreground">
                                {roleData.description || `Permissões para o cargo ${roleName}.`}
                            </p>
                            </div>
                            {(roleName !== "Lider" && roleName !== "Membro") && (
                            <AlertDialog onOpenChange={(open) => { if (open) { setRoleToDelete(roleName); } else if (!isSavingPermissions) { setRoleToDelete(null); } }}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0 ml-2"
                                    disabled={isSavingPermissions || !canManageRolesAndPermissionsPage}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>
                                      <Trash2 className="h-4 w-4" />
                                    </span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <ShadCnAlertDialogDescription>
                                    Tem certeza que deseja excluir o cargo "{roleName}"? Esta ação não pode ser desfeita.
                                    Membros com este cargo serão revertidos para "Membro" ao salvar as alterações.
                                    </ShadCnAlertDialogDescription>
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
                        </AccordionPrimitive.Header>
                        <AccordionContent className="p-3 sm:px-4 sm:pb-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allPermissionsList.map(permission => {
                              const permInfo = permissionDescriptions[permission as keyof typeof permissionDescriptions];
                              if (!permInfo) return null; // Skip if description is missing
                              const isLiderManagingCriticalPermissions = roleName === "Lider";
                              return (
                                <div key={permission} className="flex items-start space-x-3 p-3 bg-background/50 dark:bg-input/30 rounded-md border border-border">
                                  <Checkbox
                                    id={`${roleName}-${permission}`}
                                    checked={roleData.permissions.includes(permission as PermissionEnum)}
                                    onCheckedChange={(checked) => handlePermissionChange(roleName, permission as PermissionEnum, Boolean(checked))}
                                    disabled={isSavingPermissions || !canManageRolesAndPermissionsPage || isLiderManagingCriticalPermissions}
                                    aria-label={`${permInfo.title} para ${roleName}`}
                                  />
                                  <div className="grid gap-1.5 leading-none">
                                    <label
                                      htmlFor={`${roleName}-${permission}`}
                                      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed cursor-pointer", isLiderManagingCriticalPermissions ? "peer-disabled:opacity-70" : "")}
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
                <Button onClick={handleSaveChangesPermissions} className="btn-gradient btn-style-primary" disabled={isSavingPermissions || !canManageRolesAndPermissionsPage}>
                  {isSavingPermissions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Salvar Alterações de Permissão
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="dkp" className="mt-6 space-y-6">
          
           {!canManageDkpSettings ? (
             <Card className="static-card-container">
              <CardHeader>
                <CardTitle className="text-destructive">Acesso Negado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Você não tem permissão para gerenciar as configurações de DKP.</p>
              </CardContent>
            </Card>
          ) : (
            <Form {...dkpForm}>
                <form onSubmit={dkpForm.handleSubmit(handleDkpSettingsSubmit)}>
                    <Card className="static-card-container">
                        <CardHeader>
                            <CardTitle className="flex items-center"><Coins className="mr-2 h-5 w-5 text-primary" />Configurações do Sistema DKP</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={dkpForm.control}
                                name="dkpSystemEnabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Habilitar Sistema DKP</FormLabel>
                                            <FormDescription>
                                                Ativa ou desativa o sistema de DKP e PINs para eventos.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isSubmittingDkp}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {dkpForm.watch("dkpSystemEnabled") && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Janela de Resgate de DKP</Label>
                                        <FormDescription>Tempo máximo após o fim de um evento para resgatar DKP com PIN.</FormDescription>
                                        <div className="flex items-center gap-2 pt-1">
                                            <FormField
                                                control={dkpForm.control}
                                                name="dkpRedemptionWindowValue"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl><Input type="number" {...field} className="form-input" disabled={isSubmittingDkp} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={dkpForm.control}
                                                name="dkpRedemptionWindowUnit"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingDkp}>
                                                            <FormControl><SelectTrigger className="form-input"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="minutes">Minutos</SelectItem>
                                                                <SelectItem value="hours">Horas</SelectItem>
                                                                <SelectItem value="days">Dias</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                         {dkpForm.formState.errors.dkpRedemptionWindowValue?.message && !dkpForm.formState.errors.dkpRedemptionWindowValue?.ref?.name && (
                                            <p className="text-sm font-medium text-destructive">{dkpForm.formState.errors.dkpRedemptionWindowValue.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">DKP Padrão por Categoria de Evento</Label>
                                        <FormDescription>Defina o valor DKP padrão para cada tipo de evento ao criá-lo. Pode ser alterado no momento da criação.</FormDescription>
                                        <div className="space-y-3 pt-1 max-h-60 overflow-y-auto pr-2">
                                            {TL_EVENT_CATEGORIES.map(category => (
                                                <FormField
                                                    key={category.id}
                                                    control={dkpForm.control}
                                                    name={`dkpDefaultsPerCategory.${category.id}`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                            <FormLabel className="mb-1 sm:mb-0">{category.label}</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    {...field}
                                                                    onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}
                                                                    value={field.value || 0}
                                                                    className="form-input sm:w-24"
                                                                    disabled={isSubmittingDkp}
                                                                    min="0"
                                                                />
                                                            </FormControl>
                                                            <FormMessage className="sm:ml-2"/>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" className="btn-gradient btn-style-primary ml-auto" disabled={isSubmittingDkp}>
                                {isSubmittingDkp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Configurações DKP
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
          )}
        </TabsContent>
        
        <TabsContent value="dkpDecay" className="mt-6 space-y-6">
            {!canManageDkpDecaySettings ? (
                <Card className="static-card-container">
                  <CardHeader><CardTitle className="text-destructive">Acesso Negado</CardTitle></CardHeader>
                  <CardContent><p className="text-muted-foreground">Você não tem permissão para gerenciar o decaimento de DKP.</p></CardContent>
                </Card>
            ) : (
            <Form {...dkpDecayForm}>
                <form onSubmit={dkpDecayForm.handleSubmit(handleDkpDecaySettingsSubmit)}>
                    <Card className="static-card-container">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center"><TrendingDown className="mr-2 h-5 w-5 text-primary" />Decaimento de DKP</CardTitle>
                                 <FormField
                                    control={dkpDecayForm.control}
                                    name="dkpDecayEnabled"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                            <Switch
                                                id="dkpDecayEnabledSwitch"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isSubmittingDkpDecay}
                                            />
                                            <FormLabel htmlFor="dkpDecayEnabledSwitch" className="mb-0">Decaimento Habilitado</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <CardDescription>Configure as definições de decaimento de DKP para sua guilda.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-1">
                                <h4 className="text-lg font-medium text-foreground">Configuração de Intervalo de Decaimento</h4>
                                <p className="text-sm text-muted-foreground">
                                    Configure como o DKP decai ao longo do tempo. O decaimento ajuda a prevenir o acúmulo de DKP e encoraja a participação ativa. O sistema reduzirá automaticamente o DKP de cada membro pela porcentagem especificada após cada período de intervalo.
                                </p>
                            </div>

                            <FormField
                                control={dkpDecayForm.control}
                                name="dkpDecayPercentage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center"><Percent className="mr-2 h-4 w-4"/>Porcentagem de Decaimento (%)</FormLabel>
                                        <FormDescription>A porcentagem de DKP que será removida de cada membro após cada período de intervalo. Introduza um valor personalizado (0-100) ou selecione uma das opções predefinidas abaixo.</FormDescription>
                                        <FormControl><Input type="number" {...field} placeholder="Ex: 10" className="form-input mt-1" disabled={!dkpDecayForm.watch("dkpDecayEnabled") || isSubmittingDkpDecay} min="0" max="100" /></FormControl>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {presetPercentages.map(p => (
                                                <Button key={p} type="button" variant="outline" size="sm" onClick={() => dkpDecayForm.setValue("dkpDecayPercentage", p)} disabled={!dkpDecayForm.watch("dkpDecayEnabled") || isSubmittingDkpDecay}>{p}%</Button>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={dkpDecayForm.control}
                                name="dkpDecayIntervalDays"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Intervalo de Decaimento (dias)</FormLabel>
                                        <FormDescription>O intervalo em dias em que o decaimento será aplicado. Introduza um valor personalizado ou selecione uma das opções predefinidas abaixo.</FormDescription>
                                        <FormControl><Input type="number" {...field} placeholder="Ex: 30" className="form-input mt-1" disabled={!dkpDecayForm.watch("dkpDecayEnabled") || isSubmittingDkpDecay} min="1"/></FormControl>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {presetIntervals.map(i => (
                                                <Button key={i} type="button" variant="outline" size="sm" onClick={() => dkpDecayForm.setValue("dkpDecayIntervalDays", i)} disabled={!dkpDecayForm.watch("dkpDecayEnabled") || isSubmittingDkpDecay}>{i} dias</Button>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={dkpDecayForm.control}
                                name="dkpDecayInitialDate"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Data Inicial de Decaimento</FormLabel>
                                    <FormDescription>Este é o ponto de partida para os cálculos de decaimento. Seu primeiro decaimento ocorrerá após um intervalo completo ter passado a partir desta data.</FormDescription>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full pl-3 text-left font-normal form-input mt-1", !field.value && "text-muted-foreground")}
                                            disabled={!dkpDecayForm.watch("dkpDecayEnabled") || isSubmittingDkpDecay}
                                        >
                                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card" align="start">
                                        <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) || !dkpDecayForm.watch("dkpDecayEnabled") || isSubmittingDkpDecay } 
                                        initialFocus
                                        locale={ptBR}
                                        />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </CardContent>
                         <CardFooter className="border-t pt-6">
                            <Button type="submit" className="btn-gradient btn-style-primary ml-auto" disabled={!dkpDecayForm.watch("dkpDecayEnabled") || isSubmittingDkpDecay}>
                                {isSubmittingDkpDecay ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Alterações
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
            )}

            {canManageDkpDecaySettings && (
            <>
            <Card className="static-card-container">
                <CardHeader>
                    <CardTitle>Logs de Decaimento de DKP</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Porcentagem</TableHead>
                                <TableHead>Acionado Em</TableHead>
                                <TableHead>Acionado Por</TableHead>
                                <TableHead className="text-right">Afetados</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dkpDecayLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Sem resultados. Nenhum log de decaimento de DKP encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                dkpDecayLogs.map((log, index) => (
                                <TableRow key={log.id || index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{log.type === 'on_demand' ? 'Sob Demanda' : 'Agendado'}</TableCell>
                                    <TableCell>{log.percentage}%</TableCell>
                                    <TableCell>{log.timestamp ? format(log.timestamp.toDate(), "dd/MM/yy HH:mm", {locale: ptBR}) : '-'}</TableCell>
                                    <TableCell>{log.triggeredByDisplayName || log.triggeredByUserId || 'Sistema'}</TableCell>
                                    <TableCell className="text-right">{log.affectedMembersCount}</TableCell>
                                    <TableCell>{log.status}</TableCell>
                                </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    
                    <div className="flex items-center justify-end space-x-2 py-4 text-sm text-muted-foreground">
                        0 de 0 linha(s) selecionada(s).  Linhas por página: 10. Página 1 de 0
                    </div>
                </CardContent>
            </Card>

            <Card className="static-card-container">
                <CardHeader>
                    <CardTitle>Decaimento de DKP Sob Demanda</CardTitle>
                    <CardDescription>
                        Iniciar um decaimento de DKP sob demanda é uma ação imediata que reduzirá o DKP de todos os membros de acordo com a porcentagem de decaimento configurada. Esta ação é separada e não afeta quaisquer decaimentos DKP agendados; decaimentos agendados continuarão a ocorrer conforme planejado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog open={showOnDemandDecayDialog} onOpenChange={setShowOnDemandDecayDialog}>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full sm:w-auto" disabled={!guild?.dkpDecayEnabled || guild?.dkpDecayPercentage === undefined || guild?.dkpDecayPercentage <= 0 || isProcessingOnDemandDecay}>
                           {isProcessingOnDemandDecay ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <TrendingDown className="mr-2 h-4 w-4"/>} 
                           Iniciar Decaimento Sob Demanda
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Decaimento Sob Demanda?</AlertDialogTitle>
                            <ShadCnAlertDialogDescription>
                            Tem certeza que deseja aplicar um decaimento de DKP de <strong>{guild?.dkpDecayPercentage || 0}%</strong> a todos os membros da guilda imediatamente? Esta ação não pode ser desfeita.
                            </ShadCnAlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isProcessingOnDemandDecay}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleInitiateOnDemandDecay} disabled={isProcessingOnDemandDecay} className={cn(buttonVariants({variant: "destructive"}))}>
                                {isProcessingOnDemandDecay && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Decaimento
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">
                       Certifique-se de que as configurações de porcentagem de decaimento estão corretas antes de iniciar.
                    </p>
                </CardFooter>
            </Card>
            </>
            )}
        </TabsContent>

      </Tabs>
    </div>
  );
}

export default function GuildSettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <GuildSettingsPageContent />
    </Suspense>
  );
}
