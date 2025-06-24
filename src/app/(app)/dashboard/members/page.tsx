

"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, arrayRemove, increment as firebaseIncrement, deleteField as firestoreDeleteField, collection, query as firestoreQuery, where, onSnapshot, addDoc, deleteDoc as firestoreDeleteDoc, serverTimestamp, orderBy, writeBatch, getDocs as getFirestoreDocs } from '@/lib/firebase';
import type { Guild, GuildMember, UserProfile, GuildMemberRoleInfo, MemberStatus, CustomRole, GuildGroup, GuildGroupMember, GroupIconType } from '@/types/guildmaster';
import { AuditActionType, GuildPermission, TLWeapon as TLWeaponEnum, TLRole } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent as NotesDialogContent,
  DialogDescription as NotesDialogDescription,
  DialogFooter as NotesDialogFooter,
  DialogHeader as NotesDialogHeader,
  DialogTitle as NotesDialogTitle,
  DialogContent as MemberDetailsDialogContent,
  DialogHeader as MemberDetailsDialogHeader,
  DialogTitle as MemberDetailsDialogTitle,
  DialogDescription as MemberDetailsDialogDescription,
  DialogFooter as MemberDetailsDialogFooter,
  DialogContent as GroupDialogContent,
  DialogHeader as GroupDialogHeader,
  DialogTitle as GroupDialogTitle,
  DialogDescription as GroupDialogDescription,
  DialogFooter as GroupDialogFooter,
  DialogContent as DkpDialogContent,
  DialogHeader as DkpDialogHeader,
  DialogTitle as DkpDialogTitle,
  DialogDescription as DkpDialogDescription,
  DialogFooter as DkpDialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Users, MoreVertical, UserCog, UserX, Loader2, Crown, Shield as ShieldIconLucide, BadgeCent, User,
  CalendarDays, Clock, Eye, FileText, ArrowUpDown, Search, SlidersHorizontal, Download, UserPlus,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ShieldAlert, Heart, Swords, Wand2, Gamepad2, Filter, UserCheck, UserMinus, Hourglass, Link2 as LinkIcon,
  UsersRound, PlusCircle, Edit2, Trash2, Save, Film, Image as ImageIconLucide, MinusCircle, PlusCircle as PlusCircleIconLucide, Coins
} from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { useHeader } from '@/contexts/HeaderContext';
import { Label } from '@/components/ui/label';
import { hasPermission, isGuildOwner } from '@/lib/permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, type SubmitHandler as GroupSubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ComingSoon } from '@/components/shared/ComingSoon';

// Types for Members List Tab
type MemberManagementAction = "changeRole" | "kick" | "changeStatus";
type GearSortOrder = "default" | "asc" | "desc";
type DkpSortOrder = "default" | "asc" | "desc";


// Constants and Schemas for Groups Tab
const groupMemberSchema = z.object({
  memberId: z.string().min(1, "Membro é obrigatório."),
  note: z.string().max(100, "Nota pode ter no máximo 100 caracteres.").optional(),
});

const groupFormSchema = z.object({
  name: z.string().min(3, "Nome do grupo deve ter pelo menos 3 caracteres.").max(50, "Nome do grupo deve ter no máximo 50 caracteres."),
  icon: z.enum(['shield', 'sword', 'heart'], { required_error: "Ícone é obrigatório." }),
  headerColor: z.string().min(1, "Cor do cabeçalho é obrigatória."),
  members: z.array(groupMemberSchema).min(1, "Adicione pelo menos 1 membro.").max(6, "Máximo de 6 membros por grupo."),
});
type GroupFormValues = z.infer<typeof groupFormSchema>;

const iconMap: Record<GroupIconType, React.ElementType> = {
  shield: ShieldIconLucide,
  sword: Swords,
  heart: Heart,
};
const availableHeaderColors = [
  { label: 'Roxo', value: 'bg-purple-600 text-purple-50' },
  { label: 'Azul', value: 'bg-blue-600 text-blue-50' },
  { label: 'Verde', value: 'bg-green-600 text-green-50' },
  { label: 'Vermelho', value: 'bg-red-600 text-red-50' },
  { label: 'Amarelo', value: 'bg-yellow-500 text-yellow-950' },
  { label: 'Cinza', value: 'bg-gray-600 text-gray-50' },
  { label: 'Laranja', value: 'bg-orange-500 text-orange-50' },
  { label: 'Rosa', value: 'bg-pink-600 text-pink-50' },
];


// --- HELPER FUNCTIONS (SHARED OR SPECIFIC) ---
const getWeaponIconPath = (weapon?: TLWeaponEnum): string => {
  if (!weapon) return "https://placehold.co/32x32.png?text=N/A";
  switch (weapon) {
    case TLWeaponEnum.SwordAndShield: return "https://i.imgur.com/jPEqyNb.png";
    case TLWeaponEnum.Greatsword: return "https://i.imgur.com/Tf1LymG.png";
    case TLWeaponEnum.Daggers: return "https://i.imgur.com/CEM1Oij.png";
    case TLWeaponEnum.Crossbow: return "https://i.imgur.com/u7pqt5H.png";
    case TLWeaponEnum.Longbow: return "https://i.imgur.com/73c5Rl4.png";
    case TLWeaponEnum.Staff: return "https://i.imgur.com/wgjWVvI.png";
    case TLWeaponEnum.WandAndTome: return "https://i.imgur.com/BdYPLee.png";
    case TLWeaponEnum.Spear: return "https://i.imgur.com/l2oHYwY.png";
    default: return "https://placehold.co/32x32.png?text=WPN";
  }
};

const enhanceMemberData = (memberBaseProfile: UserProfile, guildRoleInfo: GuildMemberRoleInfo | undefined, guildData: Guild): GuildMember => {
  const isTLGuild = guildData.game === "Throne and Liberty";
  let specificRoleInfo: GuildMemberRoleInfo = {
    roleName: "Membro", status: 'Ativo', dkpBalance: 0, notes: "",
    characterNickname: memberBaseProfile.displayName || memberBaseProfile.email || memberBaseProfile.uid,
    gearScore: 0,
  };
  if (guildRoleInfo) {
    specificRoleInfo = {
      ...specificRoleInfo, ...guildRoleInfo,
      characterNickname: guildRoleInfo.characterNickname || memberBaseProfile.displayName || memberBaseProfile.email || memberBaseProfile.uid,
      gearScore: guildRoleInfo.gearScore || 0,
      gearScoreScreenshotUrl: guildRoleInfo.gearScoreScreenshotUrl || null,
      gearBuildLink: guildRoleInfo.gearBuildLink || null,
      skillBuildLink: guildRoleInfo.skillBuildLink || null,
      status: guildRoleInfo.status || 'Ativo', dkpBalance: guildRoleInfo.dkpBalance ?? 0,
    };
  } else {
    specificRoleInfo.characterNickname = memberBaseProfile.displayName || memberBaseProfile.email || memberBaseProfile.uid;
  }
  if (isTLGuild && guildRoleInfo) {
    specificRoleInfo.tlRole = guildRoleInfo.tlRole;
    specificRoleInfo.tlPrimaryWeapon = guildRoleInfo.tlPrimaryWeapon;
    specificRoleInfo.tlSecondaryWeapon = guildRoleInfo.tlSecondaryWeapon;
  }
  return {
    ...memberBaseProfile, roleName: specificRoleInfo.roleName, characterNickname: specificRoleInfo.characterNickname,
    gearScore: specificRoleInfo.gearScore, gearScoreScreenshotUrl: specificRoleInfo.gearScoreScreenshotUrl,
    gearBuildLink: specificRoleInfo.gearBuildLink, skillBuildLink: specificRoleInfo.skillBuildLink,
    tlRole: specificRoleInfo.tlRole, tlPrimaryWeapon: specificRoleInfo.tlPrimaryWeapon, tlSecondaryWeapon: specificRoleInfo.tlSecondaryWeapon,
    notes: specificRoleInfo.notes, status: specificRoleInfo.status, dkpBalance: specificRoleInfo.dkpBalance,
    weapons: {
      mainHandIconUrl: specificRoleInfo.tlPrimaryWeapon ? getWeaponIconPath(specificRoleInfo.tlPrimaryWeapon) : undefined,
      offHandIconUrl: specificRoleInfo.tlSecondaryWeapon ? getWeaponIconPath(specificRoleInfo.tlSecondaryWeapon) : undefined
    },
  };
};

const displayMemberStatus = (status?: MemberStatus): string => {
  if (status === 'Licenca') return 'Licença';
  return status || 'Desconhecido';
};


// --- MEMBERS LIST TAB CONTENT ---
function MembersListTabContent(
  { guild, members: initialMembers, currentUser, guildId, currentUserRoleInfo, fetchGuildAndMembers }:
  { guild: Guild; members: GuildMember[]; currentUser: UserProfile; guildId: string; currentUserRoleInfo: GuildMemberRoleInfo | null; fetchGuildAndMembers: () => void;}
) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [members, setMembers] = useState<GuildMember[]>(initialMembers);
  const [actionUser, setActionUser] = useState<GuildMember | null>(null);
  const [actionType, setActionType] = useState<MemberManagementAction | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [selectedNewRoleName, setSelectedNewRoleName] = useState<string>('');
  const [selectedNewStatus, setSelectedNewStatus] = useState<MemberStatus | ''>('');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [usernameFilter, setUsernameFilter] = useState(searchParams.get('usernameFilter') || "");
  const [tlRoleFilter, setTlRoleFilter] = useState<TLRole | "all">( (searchParams.get('tlRoleFilter') as TLRole | "all" | null) || "all");
  const [gearSortOrder, setGearSortOrder] = useState<GearSortOrder>("default");
  const [rankFilter, setRankFilter] = useState<string | "all">(searchParams.get('rankFilter') || "all");
  const [dkpSortOrder, setDkpSortOrder] = useState<DkpSortOrder>("default");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">((searchParams.get('statusFilter') as MemberStatus | "all" | null) || "all");
  const [activityDateRange, setActivityDateRange] = useState<DateRange | undefined>({ from: undefined, to: undefined });
  const [timeFromFilter, setTimeFromFilter] = useState("00:00");
  const [timeToFilter, setTimeToFilter] = useState("23:59");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [memberForNotes, setMemberForNotes] = useState<GuildMember | null>(null);
  const [currentNote, setCurrentNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showMemberDetailsDialog, setShowMemberDetailsDialog] = useState(false);
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<GuildMember | null>(null);

  // State for DKP Adjustment Dialog
  const [isDkpModalOpen, setIsDkpModalOpen] = useState(false);
  const [selectedMemberForDkp, setSelectedMemberForDkp] = useState<GuildMember | null>(null);
  const [dkpAdjustmentType, setDkpAdjustmentType] = useState<'add' | 'remove'>('add');
  const [dkpAdjustmentAmount, setDkpAdjustmentAmount] = useState<number | string>("");
  const [dkpAdjustmentReason, setDkpAdjustmentReason] = useState("");
  const [isProcessingDkp, setIsProcessingDkp] = useState(false);


  useEffect(() => {
    setMembers(initialMembers); 
  }, [initialMembers]);

  // Simplified permission checks - no useMemo
  const isOwner = isGuildOwner(currentUser?.uid, guild);
  const canManageMemberRoles = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_ROLE);
  const canKickMembers = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_KICK);
  const canManageMemberStatus = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_STATUS);
  const canManageMemberNotes = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_NOTES);
  const canViewDetailedMemberInfo = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.VIEW_MEMBER_DETAILED_INFO);
  const canAdjustMemberDkp = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBER_DKP_BALANCE);


  const availableRoleNamesForChange = useMemo(() => {
    if (!guild || !guild.customRoles) return [];
    const defaultRoles = ["Membro"];
    if (guild.customRoles["Lider"]) defaultRoles.unshift("Lider");
    return [...new Set([...defaultRoles, ...Object.keys(guild.customRoles)])]
           .filter(roleName => roleName !== "Lider" || (actionUser?.uid === guild.ownerId))
           .sort();
  }, [guild, actionUser]);

  const openActionDialog = (member: GuildMember, type: MemberManagementAction) => {
    setActionUser(member); setActionType(type); setSelectedNewRoleName(''); setSelectedNewStatus('');
  };
  const closeActionDialog = () => { setActionUser(null); setActionType(null); setIsProcessingAction(false); };

  const handleChangeRole = async () => {
    if (!actionUser || !guild || selectedNewRoleName === '' || !guildId || !currentUser || !canManageMemberRoles) return;
    if (actionUser.uid === guild.ownerId && selectedNewRoleName !== "Lider") {
        toast({ title: "Ação Inválida", description: "O cargo do fundador da guilda (Líder) não pode ser alterado para outro cargo aqui.", variant: "destructive" }); return;
    }
    if (selectedNewRoleName === "Lider" && actionUser.uid !== guild.ownerId) {
        toast({ title: "Ação Inválida", description: "Para transferir a liderança, use uma funcionalidade específica.", variant: "destructive" }); return;
    }
    const oldRoleName = actionUser.roleName;
    setIsProcessingAction(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const existingRoleInfo = guild.roles?.[actionUser.uid] || { roleName: "Membro", status: 'Ativo', dkpBalance: 0 };
      const newRoleInfoPayload: GuildMemberRoleInfo = { ...existingRoleInfo, roleName: selectedNewRoleName };
      await updateDoc(guildRef, { [`roles.${actionUser.uid}`]: newRoleInfoPayload });
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.MEMBER_ROLE_CHANGED, {
        targetUserId: actionUser.uid, targetUserDisplayName: actionUser.characterNickname || actionUser.displayName || "",
        oldValue: oldRoleName, newValue: selectedNewRoleName, changedField: 'roleName'
      });
      toast({ title: "Cargo Atualizado!", description: `${actionUser.characterNickname || actionUser.displayName} agora é ${selectedNewRoleName}.` });
      fetchGuildAndMembers(); closeActionDialog();
    } catch (error) { console.error("Erro ao mudar cargo:", error); toast({ title: "Erro ao Mudar Cargo", variant: "destructive" });
    } finally { setIsProcessingAction(false); }
  };

  const handleChangeStatus = async (memberToUpdate?: GuildMember, newStatus?: MemberStatus) => {
    const targetMember = memberToUpdate || actionUser; const statusToSet = newStatus || selectedNewStatus;
    if (!targetMember || !guild || statusToSet === '' || !guildId || !currentUser || !canManageMemberStatus) return;
    if(targetMember.uid === guild.ownerId && targetMember.roleName === "Lider" && statusToSet === 'Inativo') {
        toast({ title: "Ação Inválida", description: "O Líder da guilda não pode definir seu próprio status como Inativo diretamente aqui.", variant: "destructive" }); closeActionDialog(); return;
    }
    const oldStatus = targetMember.status; setIsProcessingAction(true);
    try {
        const guildRef = doc(db, "guilds", guildId);
        const existingRoleInfo = guild.roles?.[targetMember.uid] || { roleName: targetMember.roleName, status: 'Ativo', dkpBalance: 0 };
        let updatedRoleInfoPayload: GuildMemberRoleInfo = { ...existingRoleInfo, status: statusToSet };
        await updateDoc(guildRef, { [`roles.${targetMember.uid}`]: updatedRoleInfoPayload });
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.MEMBER_STATUS_CHANGED, {
            targetUserId: targetMember.uid, targetUserDisplayName: targetMember.characterNickname || targetMember.displayName || "",
            oldValue: oldStatus, newValue: statusToSet, changedField: 'status'
        });
        toast({ title: "Status Atualizado!", description: `O status de ${targetMember.characterNickname || targetMember.displayName} foi alterado para ${displayMemberStatus(statusToSet)}.` });
        fetchGuildAndMembers(); closeActionDialog();
    } catch (error) { console.error("Erro ao mudar status:", error); toast({ title: "Erro ao Mudar Status", variant: "destructive" });
    } finally { setIsProcessingAction(false); }
  };

  const handleKickMember = async () => {
    if (!actionUser || !guild || !guildId || !currentUser || !canKickMembers) return;
    if (actionUser.uid === guild.ownerId) { toast({ title: "Ação Inválida", description: "O Líder (fundador) não pode ser expulso.", variant: "destructive" }); return; }
    const kickedUserRoleName = actionUser.roleName; setIsProcessingAction(true);
    try {
      const guildRef = doc(db, "guilds", guildId); const batchDB = writeBatch(db);
      batchDB.update(guildRef, { memberIds: arrayRemove(actionUser.uid), memberCount: firebaseIncrement(-1), [`roles.${actionUser.uid}`]: firestoreDeleteField() });
      await batchDB.commit();
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.MEMBER_KICKED, {
        targetUserId: actionUser.uid, targetUserDisplayName: actionUser.characterNickname || actionUser.displayName || "", kickedUserRoleName: kickedUserRoleName
      });
      toast({ title: "Membro Removido", description: `${actionUser.characterNickname || actionUser.displayName} foi removido.` });
      fetchGuildAndMembers(); closeActionDialog();
    } catch (error) { console.error("Erro ao remover membro:", error); toast({ title: "Erro ao Remover Membro", variant: "destructive" });
    } finally { setIsProcessingAction(false); }
  };

  const handleOpenNotesDialog = (member: GuildMember) => {
    if (!canManageMemberNotes) { toast({title: "Permissão Negada", description: "Você não tem permissão para gerenciar notas.", variant: "destructive"}); return; }
    setMemberForNotes(member); setCurrentNote(member.notes || ""); setShowNotesDialog(true);
  };

  const handleSaveNote = async () => {
    if (!memberForNotes || !guild || !guildId || !currentUser || !canManageMemberNotes) return;
    setIsSavingNote(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const existingRoleInfo = guild.roles?.[memberForNotes.uid] || { roleName: memberForNotes.roleName, status: 'Ativo', dkpBalance: 0 };
      let updatedRoleInfoPayload: GuildMemberRoleInfo = { ...existingRoleInfo, notes: currentNote };
      await updateDoc(guildRef, { [`roles.${memberForNotes.uid}`]: updatedRoleInfoPayload });
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.MEMBER_NOTE_UPDATED, {
        targetUserId: memberForNotes.uid, targetUserDisplayName: memberForNotes.characterNickname || memberForNotes.displayName || "",
        noteSummary: currentNote ? "Nota atualizada" : "Nota removida", changedField: 'notes'
      });
      toast({ title: "Nota Salva!", description: `Nota para ${memberForNotes.characterNickname || memberForNotes.displayName} foi salva.` });
      fetchGuildAndMembers(); setShowNotesDialog(false); setMemberForNotes(null);
    } catch (error) { console.error("Erro ao salvar nota:", error); toast({ title: "Erro ao Salvar Nota", variant: "destructive" });
    } finally { setIsSavingNote(false); }
  };

  const handleViewMemberDetails = (member: GuildMember) => {
    if (canViewDetailedMemberInfo) { setSelectedMemberForDetails(member); setShowMemberDetailsDialog(true); }
    else { toast({ title: "Permissão Negada", description: "Você não tem permissão para ver detalhes dos membros.", variant: "destructive" }); }
  };
  
  const handleOpenDkpDialog = (member: GuildMember, type: 'add' | 'remove') => {
    if (!guild?.dkpSystemEnabled || !canAdjustMemberDkp) {
      toast({ title: "Ação não permitida", description: "O sistema DKP está desabilitado ou você não tem permissão.", variant: "destructive" });
      return;
    }
    setSelectedMemberForDkp(member);
    setDkpAdjustmentType(type);
    setDkpAdjustmentAmount("");
    setDkpAdjustmentReason("");
    setIsDkpModalOpen(true);
  };

  const handleDkpAdjustment = async () => {
    if (!selectedMemberForDkp || !guildId || !currentUser || !guild?.dkpSystemEnabled || !canAdjustMemberDkp) return;
    const amount = Number(dkpAdjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor Inválido", description: "Por favor, insira um valor DKP positivo.", variant: "destructive" });
      return;
    }
    const currentBalance = selectedMemberForDkp.dkpBalance || 0;
    if (dkpAdjustmentType === 'remove' && amount > currentBalance) {
      toast({ title: "Valor Inválido", description: "Não é possível remover mais DKP do que o membro possui.", variant: "destructive" });
      return;
    }

    setIsProcessingDkp(true);
    const oldDkpBalance = currentBalance;
    const dkpChange = dkpAdjustmentType === 'add' ? amount : -amount;
    const newDkpBalance = oldDkpBalance + dkpChange;

    try {
      const guildRef = doc(db, "guilds", guildId);
      await updateDoc(guildRef, {
        [`roles.${selectedMemberForDkp.uid}.dkpBalance`]: firebaseIncrement(dkpChange)
      });

      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.MEMBER_DKP_ADJUSTED, {
        targetUserId: selectedMemberForDkp.uid,
        targetUserDisplayName: selectedMemberForDkp.characterNickname || selectedMemberForDkp.displayName || "",
        dkpAmountChanged: dkpChange,
        dkpAdjustmentReason: dkpAdjustmentReason || (dkpAdjustmentType === 'add' ? 'Adição manual' : 'Remoção manual'),
        oldDkpBalance: oldDkpBalance,
        newDkpBalance: newDkpBalance,
      });

      toast({ title: "DKP Ajustado!", description: `O saldo DKP de ${selectedMemberForDkp.characterNickname || selectedMemberForDkp.displayName} foi atualizado para ${newDkpBalance}.` });
      fetchGuildAndMembers();
      setIsDkpModalOpen(false);
    } catch (error) {
      console.error("Erro ao ajustar DKP:", error);
      toast({ title: "Erro ao Ajustar DKP", variant: "destructive" });
    } finally {
      setIsProcessingDkp(false);
    }
  };


  const getRoleIcon = (roleName: string) => {
    if (roleName === "Lider") return <Crown className="h-5 w-5 text-yellow-400" />;
    return <User className="h-5 w-5 text-muted-foreground" />;
  };
  const getTLRoleStyling = (role?: TLRole): string => {
    if (!role) return "";
    switch (role) {
      case TLRole.Tank: return "text-sky-500"; case TLRole.Healer: return "text-emerald-500";
      case TLRole.DPS: return "text-rose-500"; default: return "";
    }
  };
  const getTLRoleIcon = (role?: TLRole) => {
    if (!role) return null;
    switch (role) {
      case TLRole.Tank: return <ShieldIconLucide className={cn("h-4 w-4", getTLRoleStyling(role))} />;
      case TLRole.Healer: return <Heart className={cn("h-4 w-4", getTLRoleStyling(role))} />;
      case TLRole.DPS: return <Swords className={cn("h-4 w-4", getTLRoleStyling(role))} />;
      default: return <Gamepad2 className="h-4 w-4" />;
    }
  };
  const getStatusIcon = (status?: MemberStatus) => {
    switch (status) {
      case 'Ativo': return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'Inativo': return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'Licenca': return <Hourglass className="h-4 w-4 text-orange-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };
  const getStatusBadgeClass = (status?: MemberStatus): string => {
    switch (status) {
      case 'Ativo': return 'border-green-500 text-green-500 bg-green-500/10';
      case 'Inativo': return 'border-red-500 text-red-500 bg-red-500/10';
      case 'Licenca': return 'border-orange-500 text-orange-500 bg-orange-500/10';
      default: return 'border-muted text-muted-foreground';
    }
  };

  const numSelectedRows = Object.values(selectedRows).filter(Boolean).length;
  const handleSelectAllRows = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) { paginatedMembers.forEach(member => newSelectedRows[member.uid] = true); }
    setSelectedRows(newSelectedRows);
  };
  const handleSelectRow = (uid: string, checked: boolean) => { setSelectedRows(prev => ({ ...prev, [uid]: checked })); };

  const filteredAndSortedMembers = useMemo(() => {
    let tempMembers = [...members];
    if (usernameFilter) { tempMembers = tempMembers.filter(member => (member.characterNickname || member.displayName || member.email || "").toLowerCase().includes(usernameFilter.toLowerCase())); }
    if (guild?.game === "Throne and Liberty" && tlRoleFilter !== "all") { tempMembers = tempMembers.filter(member => member.tlRole === tlRoleFilter); }
    if (rankFilter !== "all") { tempMembers = tempMembers.filter(member => member.roleName === rankFilter); }
    if (statusFilter !== "all") { tempMembers = tempMembers.filter(member => member.status === statusFilter); }
    if (gearSortOrder !== "default") { tempMembers.sort((a, b) => { const gearA = a.gearScore || 0; const gearB = b.gearScore || 0; return gearSortOrder === "asc" ? gearA - gearB : gearB - gearA; }); }
    if (dkpSortOrder !== "default") { tempMembers.sort((a, b) => { const dkpA = a.dkpBalance || 0; const dkpB = b.dkpBalance || 0; return dkpSortOrder === "asc" ? dkpA - dkpB : dkpB - dkpA; }); }
    if (activityDateRange?.from) {
    }
    return tempMembers;
  }, [members, usernameFilter, tlRoleFilter, rankFilter, statusFilter, gearSortOrder, dkpSortOrder, guild?.game, activityDateRange, timeFromFilter, timeToFilter]);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedMembers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedMembers, currentPage]);

  const totalFilteredMembers = filteredAndSortedMembers.length;
  const totalPages = Math.ceil(totalFilteredMembers / rowsPerPage);
  const isTLGuild = guild.game === "Throne and Liberty";

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4 bg-card rounded-lg shadow items-end">
        <div className="xl:col-span-2">
          <Label htmlFor="usernameFilter" className="block text-sm font-medium text-muted-foreground mb-1">Usuário</Label>
          <Input id="usernameFilter" placeholder="Filtrar por nome..." value={usernameFilter} onChange={(e) => {setUsernameFilter(e.target.value); setCurrentPage(1);}} className="form-input"/>
        </div>
        {isTLGuild && (
          <div> <Label htmlFor="tlRoleFilter" className="block text-sm font-medium text-muted-foreground mb-1">Função (TL)</Label>
            <Select value={tlRoleFilter} onValueChange={(value) => { setTlRoleFilter(value as TLRole | "all"); setCurrentPage(1); }}>
              <SelectTrigger id="tlRoleFilter" className="form-input"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent> <SelectItem value="all">Todas</SelectItem> {Object.values(TLRole).map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)} </SelectContent>
            </Select>
          </div>
        )}
        <div> <Label htmlFor="gearSortOrder" className="block text-sm font-medium text-muted-foreground mb-1">Gear</Label>
          <Select value={gearSortOrder} onValueChange={(value) => { setGearSortOrder(value as GearSortOrder); setCurrentPage(1); }}>
            <SelectTrigger id="gearSortOrder" className="form-input"><SelectValue placeholder="Padrão" /></SelectTrigger>
            <SelectContent> <SelectItem value="default">Padrão</SelectItem> <SelectItem value="asc">Menor para Maior</SelectItem> <SelectItem value="desc">Maior para Menor</SelectItem> </SelectContent>
          </Select>
        </div>
        <div> <Label htmlFor="rankFilter" className="block text-sm font-medium text-muted-foreground mb-1">Cargo</Label>
          <Select value={rankFilter} onValueChange={(value) => { setRankFilter(value as string | "all"); setCurrentPage(1); }}>
            <SelectTrigger id="rankFilter" className="form-input"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent> <SelectItem value="all">Todos</SelectItem> {guild.customRoles && Object.keys(guild.customRoles).sort().map(roleName => <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>)} </SelectContent>
          </Select>
        </div>
        <div> <Label htmlFor="dkpSortOrder" className="block text-sm font-medium text-muted-foreground mb-1">Balanço DKP</Label>
          <Select value={dkpSortOrder} onValueChange={(value) => { setDkpSortOrder(value as DkpSortOrder); setCurrentPage(1); }}>
            <SelectTrigger id="dkpSortOrder" className="form-input"><SelectValue placeholder="Padrão" /></SelectTrigger>
            <SelectContent> <SelectItem value="default">Padrão</SelectItem> <SelectItem value="asc">Menor para Maior</SelectItem> <SelectItem value="desc">Maior para Menor</SelectItem> </SelectContent>
          </Select>
        </div>
        <div> <Label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Status</Label>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as MemberStatus | "all"); setCurrentPage(1); }}>
            <SelectTrigger id="statusFilter" className="form-input"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent> <SelectItem value="all">Todos</SelectItem> {(['Ativo', 'Inativo', 'Licenca'] as MemberStatus[]).map(statusVal => <SelectItem key={statusVal} value={statusVal}>{displayMemberStatus(statusVal)}</SelectItem>)} </SelectContent>
          </Select>
        </div>
        <div className="xl:col-span-3">
          <Label htmlFor="activityDateRange" className="block text-sm font-medium text-muted-foreground mb-1">Intervalo de Atividade</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="activityDateRange"
                variant="outline"
                className={cn("w-full justify-start text-left font-normal form-input",!activityDateRange?.from && "text-muted-foreground")}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {activityDateRange?.from && activityDateRange.from instanceof Date
                  ? activityDateRange.to && activityDateRange.to instanceof Date
                    ? <>{format(activityDateRange.from, "dd/MM/yy", { locale: ptBR })} - {format(activityDateRange.to, "dd/MM/yy", { locale: ptBR })}</>
                    : format(activityDateRange.from, "dd/MM/yy", { locale: ptBR })
                  : <span>Escolha um intervalo</span>
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={activityDateRange?.from}
                selected={activityDateRange}
                onSelect={(range) => { setActivityDateRange(range || undefined); setCurrentPage(1); }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 gap-2 xl:col-span-2"> <div> <Label htmlFor="timeFromFilter" className="block text-sm font-medium text-muted-foreground mb-1">De</Label> <Input id="timeFromFilter" type="time" value={timeFromFilter} onChange={e => { setTimeFromFilter(e.target.value); setCurrentPage(1); }} className="form-input" /> </div> <div> <Label htmlFor="timeToFilter" className="block text-sm font-medium text-muted-foreground mb-1">Até</Label> <Input id="timeToFilter" type="time" value={timeToFilter} onChange={e => { setTimeToFilter(e.target.value); setCurrentPage(1);}} className="form-input" /> </div> </div>
        <div className="xl:col-span-1 flex justify-end items-end gap-2"> <Button variant="outline" disabled className="w-full"><Filter className="mr-2 h-4 w-4" /> Aplicar</Button> </div>
      </div>
      <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Checkbox id="selectAllRows" aria-label="Selecionar todas as linhas visíveis" checked={paginatedMembers.length > 0 && numSelectedRows === paginatedMembers.length} onCheckedChange={(checked) => handleSelectAllRows(Boolean(checked))} disabled={paginatedMembers.length === 0}/>
          {numSelectedRows > 0 && <span className="text-sm text-muted-foreground">{numSelectedRows} de {paginatedMembers.length} linha(s) visíveis selecionada(s)</span>}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={numSelectedRows === 0}>
                <span>Ações <MoreVertical className="ml-2 h-4 w-4" /></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Promover Selecionados</DropdownMenuItem>
              <DropdownMenuItem disabled>Rebaixar Selecionados</DropdownMenuItem>
              <DropdownMenuItem disabled>Alterar Status Selecionados</DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem className="text-destructive focus:text-destructive" disabled>
                Remover Selecionados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" disabled><SlidersHorizontal className="mr-2 h-4 w-4" /> Filtros Avançados</Button> <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Exportar</Button>
        </div>
      </div>
      <div className="overflow-x-auto bg-card p-2 rounded-lg shadow">
        <Table>
          <TableHeader><TableRow><TableHead className="w-[50px]"><Checkbox checked={paginatedMembers.length > 0 && numSelectedRows === paginatedMembers.length} onCheckedChange={(checked) => handleSelectAllRows(Boolean(checked))} aria-label="Selecionar todas as linhas visíveis" disabled={paginatedMembers.length === 0}/></TableHead><TableHead>Usuário <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>{isTLGuild && <TableHead>Função <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>}<TableHead>Armas</TableHead><TableHead>Gear <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead><TableHead>Cargo <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead><TableHead>Balanço DKP <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>{canManageMemberNotes && <TableHead>Nota</TableHead>}<TableHead>Status <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead><TableHead className="text-right w-[120px]">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {paginatedMembers.length === 0 && ( <TableRow><TableCell colSpan={isTLGuild ? (canManageMemberNotes ? 10 : 9) : (canManageMemberNotes ? 9 : 8)} className="text-center h-24"> Nenhum membro encontrado {usernameFilter || tlRoleFilter !== "all" || rankFilter !== "all" || statusFilter !== "all" ? "com os filtros aplicados." : "nesta guilda."} </TableCell></TableRow> )}
            {paginatedMembers.map((member) => {
              const isCurrentUserTarget = member.uid === currentUser?.uid;
              const isGuildOwnerTarget = member.uid === guild?.ownerId;
              const displayName = member.characterNickname || member.displayName || member.email || member.uid;

              const hasRoleActions = !isCurrentUserTarget && canManageMemberRoles && !(isGuildOwnerTarget && member.roleName === "Lider");
              const hasStatusActions = !isCurrentUserTarget && canManageMemberStatus;
              const hasDkpActions = !isCurrentUserTarget && canAdjustMemberDkp && guild.dkpSystemEnabled && !isGuildOwnerTarget;
              const hasKickAction = !isCurrentUserTarget && canKickMembers && !isGuildOwnerTarget;

              const canPerformManagementActions = hasRoleActions || hasStatusActions || hasDkpActions || hasKickAction;
              
              return (
                <TableRow key={member.uid} data-state={selectedRows[member.uid] ? "selected" : ""}>
                  <TableCell><div className="flex items-center"><Checkbox checked={selectedRows[member.uid] || false} onCheckedChange={(checked) => handleSelectRow(member.uid, Boolean(checked))} aria-label={`Selecionar ${displayName}`}/></div></TableCell>
                  <TableCell><div className={cn("flex items-center gap-2 font-medium", canViewDetailedMemberInfo && "cursor-pointer hover:text-primary transition-colors")} onClick={() => canViewDetailedMemberInfo && handleViewMemberDetails(member)} title={canViewDetailedMemberInfo ? "Ver detalhes do membro" : "" }><Avatar className="h-8 w-8"><AvatarImage src={member.photoURL || `https://placehold.co/40x40.png?text=${displayName?.substring(0,1) || 'M'}`} alt={displayName || 'Avatar'} data-ai-hint="user avatar"/><AvatarFallback>{displayName?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback></Avatar>{displayName}</div></TableCell>
                  {isTLGuild && ( <TableCell><div className={cn("flex items-center gap-1", getTLRoleStyling(member.tlRole))}>{getTLRoleIcon(member.tlRole)}{member.tlRole || "N/A"}</div></TableCell> )}
                  <TableCell><div className="flex items-center gap-1">{member.weapons?.mainHandIconUrl && <Image src={member.weapons.mainHandIconUrl} alt={member.tlPrimaryWeapon || "Arma Principal"} width={24} height={24} data-ai-hint="weapon sword"/>}{member.weapons?.offHandIconUrl && <Image src={member.weapons.offHandIconUrl} alt={member.tlSecondaryWeapon || "Arma Secundária"} width={24} height={24} data-ai-hint="weapon shield"/>}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1">{member.gearScore}{member.gearScoreScreenshotUrl && <a href={member.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer" title="Ver screenshot do gearscore"><Eye className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" /></a>}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1">{getRoleIcon(member.roleName)}{member.roleName}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1">{member.dkpBalance ?? 0}<Eye className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" /></div></TableCell>
                  {canManageMemberNotes && ( <TableCell><div className="flex items-center"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenNotesDialog(member)}><FileText className="h-4 w-4" /><span className="sr-only">Ver/Editar Nota</span></Button></div></TableCell> )}
                  <TableCell><Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(member.status))}><div className="flex items-center gap-1">{getStatusIcon(member.status)}{displayMemberStatus(member.status)}</div></Badge></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                    {canPerformManagementActions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /><span className="sr-only">Ações do membro</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {hasRoleActions && ( <DropdownMenuItem onSelect={() => openActionDialog(member, "changeRole")}><UserCog className="mr-2 h-4 w-4" /> Alterar Cargo</DropdownMenuItem> )}
                                {hasStatusActions && ( <DropdownMenuSub><DropdownMenuSubTrigger disabled={isGuildOwnerTarget && member.roleName === "Lider" && member.status === "Ativo"}><UserCog className="mr-2 h-4 w-4" />Alterar Status</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent>{(['Ativo', 'Inativo', 'Licenca'] as MemberStatus[]).filter(s => s !== member.status).map(statusOption => ( <DropdownMenuItem key={statusOption} onSelect={() => { setSelectedNewStatus(statusOption); handleChangeStatus(member, statusOption); }} disabled={isGuildOwnerTarget && member.roleName === "Lider" && statusOption === 'Inativo'}>{getStatusIcon(statusOption)}{displayMemberStatus(statusOption)}</DropdownMenuItem> ))}</DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub> )}
                                
                                { (hasRoleActions || hasStatusActions) && hasDkpActions && <DropdownMenuSeparator /> }

                                {hasDkpActions && (
                                    <>
                                        <DropdownMenuItem onSelect={() => handleOpenDkpDialog(member, 'add')}><PlusCircleIconLucide className="mr-2 h-4 w-4 text-green-500"/> Dar DKP</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleOpenDkpDialog(member, 'remove')}><MinusCircle className="mr-2 h-4 w-4 text-red-500"/> Retirar DKP</DropdownMenuItem>
                                    </>
                                )}
                                
                                { (hasDkpActions || hasRoleActions || hasStatusActions) && hasKickAction && <DropdownMenuSeparator /> }

                                {hasKickAction && ( 
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => openActionDialog(member, "kick")}><UserX className="mr-2 h-4 w-4" /> Remover da Guilda</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </div></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow mt-4">
        <div className="text-sm text-muted-foreground"> {numSelectedRows > 0 ? `${numSelectedRows} de ${paginatedMembers.length} linha(s) visíveis selecionada(s).` : `${totalFilteredMembers} membro(s) no total.`} </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"> <span className="text-sm text-muted-foreground">Linhas/pág:</span> <Select value={rowsPerPage.toString()} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1);}}> <SelectTrigger className="w-[70px] h-8 text-xs form-input"> <SelectValue placeholder={rowsPerPage.toString()} /> </SelectTrigger> <SelectContent> {[10, 25, 50, 100].map(size => <SelectItem key={size} value={size.toString()} className="text-xs">{size}</SelectItem>)} </SelectContent> </Select> </div>
            <span className="text-sm text-muted-foreground">Página {totalPages > 0 ? currentPage : 0} de {totalPages}</span>
            <div className="flex items-center gap-1"> <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || totalPages === 0}><ChevronsLeft className="h-4 w-4" /></Button> <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || totalPages === 0}><ChevronLeft className="h-4 w-4" /></Button> <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button> <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button> </div>
        </div>
      </div>
      {memberForNotes && ( <Dialog open={showNotesDialog} onOpenChange={(isOpen) => { if (!isOpen) { setShowNotesDialog(false); setMemberForNotes(null); } }}> <NotesDialogContent className="sm:max-w-md"> <NotesDialogHeader> <NotesDialogTitle>Nota para {memberForNotes.characterNickname || memberForNotes.displayName}</NotesDialogTitle> <NotesDialogDescription> Adicione ou edite uma nota sobre este membro. Visível apenas para quem tem permissão. </NotesDialogDescription> </NotesDialogHeader> <div className="py-4"> <Textarea placeholder="Escreva sua nota aqui..." value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} rows={5} className="form-input"/> </div> <NotesDialogFooter> <Button type="button" variant="outline" onClick={() => setShowNotesDialog(false)} disabled={isSavingNote}> Cancelar </Button> <Button type="button" onClick={handleSaveNote} disabled={isSavingNote} className="btn-gradient btn-style-primary"> {isSavingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar Nota </Button> </NotesDialogFooter> </NotesDialogContent> </Dialog> )}
      {selectedMemberForDetails && ( <Dialog open={showMemberDetailsDialog} onOpenChange={setShowMemberDetailsDialog}> <MemberDetailsDialogContent className="sm:max-w-lg"> <MemberDetailsDialogHeader> <MemberDetailsDialogTitle className="flex items-center"> <Avatar className="h-10 w-10 mr-3"> <AvatarImage src={selectedMemberForDetails.photoURL || `https://placehold.co/40x40.png?text=${(selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName)?.substring(0,1) || 'M'}`} alt={selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName || 'Avatar'} data-ai-hint="user avatar"/><AvatarFallback>{(selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName)?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback> </Avatar> Detalhes de {selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName} </MemberDetailsDialogTitle> <MemberDetailsDialogDescription> Informações específicas do membro na guilda. </MemberDetailsDialogDescription> </MemberDetailsDialogHeader> <div className="py-4 space-y-3"> <p><strong>Nickname na Guilda:</strong> {selectedMemberForDetails.characterNickname || "N/A"}</p> <p><strong>Gearscore:</strong> {selectedMemberForDetails.gearScore ?? "N/A"}</p> {selectedMemberForDetails.gearScoreScreenshotUrl ? ( <p><strong>Print do Gearscore:</strong> <Link href={selectedMemberForDetails.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Screenshot <Eye className="inline h-4 w-4 ml-1"/></Link></p> ) : <p><strong>Print do Gearscore:</strong> N/A</p>} {selectedMemberForDetails.gearBuildLink ? ( <p><strong>Gear Build Link:</strong> <Link href={selectedMemberForDetails.gearBuildLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Build de Equipamento <LinkIcon className="inline h-4 w-4 ml-1"/></Link></p> ) : <p><strong>Gear Build Link:</strong> N/A</p>} {selectedMemberForDetails.skillBuildLink ? ( <p><strong>Skill Build Link:</strong> <Link href={selectedMemberForDetails.skillBuildLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Build de Habilidades <LinkIcon className="inline h-4 w-4 ml-1"/></Link></p> ) : <p><strong>Skill Build Link:</strong> N/A</p>} {isTLGuild && ( <> <hr className="my-3 border-border"/> <p className="flex items-center gap-1"><strong>Função (TL):</strong> {getTLRoleIcon(selectedMemberForDetails.tlRole)} {selectedMemberForDetails.tlRole || "N/A"}</p> <div className="flex items-center gap-2"> <strong>Armas (TL):</strong> {selectedMemberForDetails.weapons?.mainHandIconUrl && <Image src={selectedMemberForDetails.weapons.mainHandIconUrl} alt={selectedMemberForDetails.tlPrimaryWeapon || "Arma Principal"} width={24} height={24} data-ai-hint="weapon sword"/>} {selectedMemberForDetails.weapons?.offHandIconUrl && <Image src={selectedMemberForDetails.weapons.offHandIconUrl} alt={member.tlSecondaryWeapon || "Arma Secundária"} width={24} height={24} data-ai-hint="weapon shield"/>} {!selectedMemberForDetails.weapons?.mainHandIconUrl && !selectedMemberForDetails.weapons?.offHandIconUrl && "N/A"} </div> {selectedMemberForDetails.tlPrimaryWeapon && <p className="text-sm text-muted-foreground ml-4">- {selectedMemberForDetails.tlPrimaryWeapon}</p>} {selectedMemberForDetails.tlSecondaryWeapon && <p className="text-sm text-muted-foreground ml-4">- {selectedMemberForDetails.tlSecondaryWeapon}</p>} </> )} </div> <MemberDetailsDialogFooter> <Button variant="outline" onClick={() => setShowMemberDetailsDialog(false)}>Fechar</Button> </MemberDetailsDialogFooter> </MemberDetailsDialogContent> </Dialog> )}
      <AlertDialog open={actionType === 'changeRole' && !!actionUser} onOpenChange={(isOpen) => !isOpen && closeActionDialog()}> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Alterar Cargo de {actionUser?.characterNickname || actionUser?.displayName}</AlertDialogTitle> <AlertDialogDescription> Selecione o novo cargo para este membro. </AlertDialogDescription> </AlertDialogHeader> <div className="py-4"> <Select value={selectedNewRoleName} onValueChange={(value) => setSelectedNewRoleName(value as string)}> <SelectTrigger className="form-input"> <SelectValue placeholder="Selecione um novo cargo" /> </SelectTrigger> <SelectContent> {availableRoleNamesForChange.filter(roleName => roleName !== actionUser?.roleName).map(roleName => ( <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem> ))} </SelectContent> </Select> </div> <AlertDialogFooter> <AlertDialogCancel onClick={closeActionDialog} disabled={isProcessingAction}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={handleChangeRole} disabled={isProcessingAction || !selectedNewRoleName}> {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirmar Mudança </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog>
      <AlertDialog open={actionType === 'kick' && !!actionUser} onOpenChange={(isOpen) => !isOpen && closeActionDialog()}> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Remover {actionUser?.characterNickname || actionUser?.displayName} da Guilda?</AlertDialogTitle> <AlertDialogDescription> Esta ação é irreversível. O membro será removido da guilda e perderá seu cargo. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={closeActionDialog} disabled={isProcessingAction}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={handleKickMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isProcessingAction}> {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirmar Remoção </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog>
      
      {/* DKP Adjustment Dialog */}
      <Dialog open={isDkpModalOpen} onOpenChange={(isOpen) => { if (!isOpen) {setSelectedMemberForDkp(null); setDkpAdjustmentAmount(""); setDkpAdjustmentReason("");} setIsDkpModalOpen(isOpen); }}>
        <DkpDialogContent className="sm:max-w-md">
          <DkpDialogHeader>
            <DkpDialogTitle className="flex items-center">
                <Coins className="mr-2 h-6 w-6 text-primary"/>
                Ajustar DKP de {selectedMemberForDkp?.characterNickname || selectedMemberForDkp?.displayName}
            </DkpDialogTitle>
            <DkpDialogDescription>
                {dkpAdjustmentType === 'add' ? 'Adicionar DKP ao membro.' : 'Remover DKP do membro.'}
                <br/>Saldo Atual: <span className="font-semibold text-foreground">{selectedMemberForDkp?.dkpBalance ?? 0} DKP</span>
            </DkpDialogDescription>
          </DkpDialogHeader>
          <div className="py-4 space-y-4">
            <div>
                <Label htmlFor="dkpAmount">Valor DKP</Label>
                <Input
                    id="dkpAmount"
                    type="number"
                    value={dkpAdjustmentAmount}
                    onChange={(e) => setDkpAdjustmentAmount(e.target.value)}
                    placeholder="Ex: 50"
                    className="form-input mt-1"
                    min="1"
                />
            </div>
            <div>
                <Label htmlFor="dkpReason">Motivo (Opcional)</Label>
                <Textarea
                    id="dkpReason"
                    value={dkpAdjustmentReason}
                    onChange={(e) => setDkpAdjustmentReason(e.target.value)}
                    placeholder="Ex: Participação em evento especial"
                    rows={3}
                    className="form-input mt-1"
                />
            </div>
          </div>
          <DkpDialogFooter>
            <Button variant="outline" onClick={() => setIsDkpModalOpen(false)} disabled={isProcessingDkp}>Cancelar</Button>
            <Button onClick={handleDkpAdjustment} disabled={isProcessingDkp || dkpAdjustmentAmount === "" || Number(dkpAdjustmentAmount) <= 0} className="btn-gradient btn-style-secondary">
              {isProcessingDkp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (dkpAdjustmentType === 'add' ? <PlusCircleIconLucide className="mr-2 h-4 w-4"/> : <MinusCircle className="mr-2 h-4 w-4"/>)}
              {dkpAdjustmentType === 'add' ? 'Confirmar Adição' : 'Confirmar Remoção'}
            </Button>
          </DkpDialogFooter>
        </DkpDialogContent>
      </Dialog>
    </div>
  );
}

// --- GROUPS TAB CONTENT ---
function GroupsTabContent(
  { guild, guildMembers, currentUser, guildId, currentUserRoleInfo }:
  { guild: Guild; guildMembers: GuildMember[]; currentUser: UserProfile; guildId: string; currentUserRoleInfo: GuildMemberRoleInfo | null; }
) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GuildGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GuildGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<GuildGroup | null>(null);

  const groupForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: "", icon: "shield", headerColor: availableHeaderColors[0].value, members: [{ memberId: "", note: "" }], },
  });
  const { fields: groupMembersFields, append: appendGroupMember, remove: removeGroupMember } = useFieldArray({ control: groupForm.control, name: "members", });

  const canManageGroups = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(currentUserRoleInfo.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_CREATE) ||
           hasPermission(currentUserRoleInfo.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_EDIT) ||
           hasPermission(currentUserRoleInfo.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_DELETE);
  }, [currentUserRoleInfo, guild?.customRoles]);

  useEffect(() => {
    if (!guildId) return; setLoadingGroups(true);
    const groupsRef = collection(db, `guilds/${guildId}/groups`); const q = firestoreQuery(groupsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as GuildGroup));
      setGroups(fetchedGroups); setLoadingGroups(false);
    }, (error) => { console.error("Erro ao buscar grupos:", error); toast({ title: "Erro ao carregar grupos", variant: "destructive" }); setLoadingGroups(false); });
    return () => unsubscribe();
  }, [guildId, toast]);

  const handleOpenGroupDialog = (groupToEdit: GuildGroup | null = null) => {
    const canEdit = groupToEdit ? hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_EDIT) : hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_CREATE);
    if (!canEdit) { toast({title: "Permissão Negada", description: `Você não tem permissão para ${groupToEdit ? 'editar' : 'criar'} grupos.`, variant: "destructive"}); return; }
    setEditingGroup(groupToEdit);
    if (groupToEdit) { groupForm.reset({ name: groupToEdit.name, icon: groupToEdit.icon, headerColor: groupToEdit.headerColor, members: groupToEdit.members.map(m => ({ memberId: m.memberId, note: m.note || "" })), });
    } else { groupForm.reset({ name: "", icon: "shield", headerColor: availableHeaderColors[0].value, members: [{ memberId: "", note: "" }], }); }
    setShowGroupDialog(true);
  };

  const onSubmitGroup: GroupSubmitHandler<GroupFormValues> = async (data) => {
    if (!currentUser || !guildId) return;
    const requiredPermission = editingGroup ? GuildPermission.MANAGE_GROUPS_EDIT : GuildPermission.MANAGE_GROUPS_CREATE;
    if (!hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, requiredPermission)) { toast({title: "Permissão Negada", description: `Você não tem permissão para ${editingGroup ? 'editar' : 'criar'} grupos.`, variant: "destructive"}); return; }
    setIsSubmittingGroup(true);
    const groupMembersData: GuildGroupMember[] = data.members.filter(m => m.memberId).map(m => { const memberProfile = guildMembers.find(gm => gm.uid === m.memberId); return { memberId: m.memberId, displayName: memberProfile?.displayName || 'Desconhecido', photoURL: memberProfile?.photoURL || null, note: m.note, }; });
    const groupDataPayload = { name: data.name, icon: data.icon, headerColor: data.headerColor, members: groupMembersData, guildId: guildId, };
    try {
      if (editingGroup) {
        const groupRef = doc(db, `guilds/${guildId}/groups`, editingGroup.id); await updateDoc(groupRef, groupDataPayload);
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.GROUP_UPDATED, { groupId: editingGroup.id, groupName: data.name });
        toast({ title: "Grupo Atualizado!", description: `O grupo "${data.name}" foi atualizado com sucesso.` });
      } else {
        const docRef = await addDoc(collection(db, `guilds/${guildId}/groups`), { ...groupDataPayload, createdAt: serverTimestamp(), createdBy: currentUser.uid, });
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.GROUP_CREATED, { groupId: docRef.id, groupName: data.name });
        toast({ title: "Grupo Criado!", description: `O grupo "${data.name}" foi criado com sucesso.` });
      }
      setShowGroupDialog(false); setEditingGroup(null);
    } catch (error) { console.error("Erro ao salvar grupo:", error); toast({ title: "Erro ao Salvar Grupo", variant: "destructive" });
    } finally { setIsSubmittingGroup(false); }
  };

  const handleDeleteGroup = async (groupToDeleteConfirmed: GuildGroup) => {
    if (!groupToDeleteConfirmed || !currentUser || !guildId || !hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_DELETE)) { toast({title: "Permissão Negada", description: "Você não tem permissão para excluir grupos.", variant: "destructive"}); return; }
    setIsSubmittingGroup(true);
    try {
      await firestoreDeleteDoc(doc(db, `guilds/${guildId}/groups`, groupToDeleteConfirmed.id));
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.GROUP_DELETED, { groupId: groupToDeleteConfirmed.id, groupName: groupToDeleteConfirmed.name });
      toast({ title: "Grupo Excluído!", description: `O grupo "${groupToDeleteConfirmed.name}" foi excluído.`});
      setGroupToDelete(null);
    } catch (error) { console.error("Erro ao excluir grupo:", error); toast({ title: "Erro ao Excluir", variant: "destructive" });
    } finally { setIsSubmittingGroup(false); }
  };

  if (loadingGroups) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-300px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex justify-end">
        {hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_CREATE) && (
          <Button onClick={() => handleOpenGroupDialog()} className="btn-gradient btn-style-secondary"> <PlusCircle className="mr-2 h-5 w-5" /> Novo Grupo </Button>
        )}
      </div>
      {groups.length === 0 ? (
        <Card className="card-bg text-center py-10 max-w-lg mx-auto"> <CardHeader> <UsersRound className="mx-auto h-16 w-16 text-muted-foreground mb-4" /> <CardTitle className="text-2xl">Nenhum Grupo Criado</CardTitle> </CardHeader> <CardContent> <p className="text-muted-foreground"> {hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_CREATE) ? "Crie o primeiro grupo para sua guilda!" : "Ainda não há grupos formados nesta guilda."} </p> </CardContent> </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map(group => ( <GroupCard key={group.id} group={group} onEdit={handleOpenGroupDialog} onDelete={(g) => setGroupToDelete(g)} canManage={canManageGroups} /> ))}
        </div>
      )}
      <Dialog open={showGroupDialog} onOpenChange={(isOpen) => { if (!isOpen) { setEditingGroup(null); groupForm.reset(); } setShowGroupDialog(isOpen); }}>
        <GroupDialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] flex flex-col">
          <GroupDialogHeader className="p-6 pb-4 shrink-0 border-b border-border"> <GroupDialogTitle className="font-headline text-primary">{editingGroup ? "Editar Grupo" : "Criar Novo Grupo"}</GroupDialogTitle> <GroupDialogDescription>Preencha os detalhes para {editingGroup ? "atualizar o" : "configurar um novo"} grupo.</GroupDialogDescription> </GroupDialogHeader>
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onSubmitGroup)} className="flex-grow overflow-y-auto px-6 py-4 space-y-5">
              <FormField control={groupForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome do Grupo</FormLabel> <FormControl><Input {...field} placeholder="Ex: Grupo Alpha de Raide" className="form-input"/></FormControl> <FormMessage /> </FormItem> )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={groupForm.control} name="icon" render={({ field }) => ( <FormItem> <FormLabel>Ícone do Grupo</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione um ícone" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="shield"><ShieldIconLucide className="inline mr-2 h-4 w-4"/> Escudo</SelectItem> <SelectItem value="sword"><Swords className="inline mr-2 h-4 w-4"/> Espada</SelectItem> <SelectItem value="heart"><Heart className="inline mr-2 h-4 w-4"/> Coração</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <FormField control={groupForm.control} name="headerColor" render={({ field }) => ( <FormItem> <FormLabel>Cor do Cabeçalho</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione uma cor" /></SelectTrigger></FormControl> <SelectContent> {availableHeaderColors.map(color => ( <SelectItem key={color.value} value={color.value}> <div className="flex items-center"> <span className={cn("w-4 h-4 rounded-full mr-2", color.value.split(' ')[0])}></span> {color.label} </div> </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
              </div>
              <div className="space-y-3"> <FormLabel>Membros do Grupo (Máximo 6)</FormLabel>
                {groupMembersFields.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start gap-2 p-3 border rounded-md bg-input/30">
                    <div className="flex-grow w-full sm:w-auto"> <FormField control={groupForm.control} name={`members.${index}.memberId`} render={({ field }) => ( <FormItem> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger className="form-input bg-background"><SelectValue placeholder="Selecione um membro" /></SelectTrigger></FormControl> <SelectContent> {guildMembers.map(member => ( <SelectItem key={member.uid} value={member.uid} disabled={groupMembersFields.some((f, i) => i !== index && f.memberId === member.uid)}> <div className="flex items-center gap-2"> <Avatar className="h-6 w-6"> <AvatarImage src={member.photoURL || undefined} alt={member.displayName || ""} data-ai-hint="user avatar"/> <AvatarFallback>{member.displayName?.substring(0,1).toUpperCase() || 'M'}</AvatarFallback> </Avatar> {member.displayName} </div> </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/> </div>
                    <div className="flex-grow w-full sm:w-auto"> <FormField control={groupForm.control} name={`members.${index}.note`} render={({ field }) => ( <FormItem> <FormControl><Input {...field} placeholder="Nota (Ex: Tank Principal)" className="form-input bg-background"/></FormControl> <FormMessage /> </FormItem> )}/> </div>
                    {groupMembersFields.length > 1 && ( <Button type="button" variant="ghost" size="icon" onClick={() => removeGroupMember(index)} className="text-destructive hover:bg-destructive/10 h-9 w-9 mt-0 sm:mt-2 shrink-0"> <Trash2 className="h-4 w-4" /> </Button> )}
                  </div>
                ))}
                {groupMembersFields.length < 6 && ( <Button type="button" variant="outline" size="sm" onClick={() => appendGroupMember({ memberId: "", note: "" })} className="mt-2"> Adicionar Membro </Button> )}
                <FormMessage>{groupForm.formState.errors.members?.message || groupForm.formState.errors.members?.root?.message}</FormMessage>
              </div>
              <GroupDialogFooter className="p-0 pt-6 sticky bottom-0 bg-card"> <Button type="button" variant="outline" onClick={() => setShowGroupDialog(false)} disabled={isSubmittingGroup}>Cancelar</Button> <Button type="submit" className="btn-gradient btn-style-primary" disabled={isSubmittingGroup}> {isSubmittingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {editingGroup ? "Salvar Alterações" : "Criar Grupo"} </Button> </GroupDialogFooter>
            </form>
          </Form>
        </GroupDialogContent>
      </Dialog>
      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle> <AlertDialogDescription> Tem certeza que deseja excluir o grupo "{groupToDelete?.name}"? Esta ação não pode ser desfeita. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setGroupToDelete(null)} disabled={isSubmittingGroup}>Cancelar</AlertDialogCancel> <AlertDialogAction onClick={() => groupToDelete && handleDeleteGroup(groupToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSubmittingGroup}> {isSubmittingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />} Excluir </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog>
    </div>
  );
}

function GroupCard({ group, onEdit, onDelete, canManage }: { group: GuildGroup; onEdit: (group: GuildGroup) => void; onDelete: (group: GuildGroup) => void; canManage: boolean; }) {
  const IconComponent = iconMap[group.icon] || ShieldIconLucide;
  return (
    <Card className="static-card-container flex flex-col">
      <CardHeader className={cn("p-4 rounded-t-lg text-card-foreground", group.headerColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-6 w-6" />
            <CardTitle className="text-lg font-headline truncate">{group.name}</CardTitle>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-current hover:bg-white/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hasPermission(useAuth().user && useAuth().user!.uid && group.guildId ? (doc(db, "guilds", group.guildId).get().then(snap => snap.data() as Guild).then(g => g.roles?.[useAuth().user!.uid]) as unknown as GuildMemberRoleInfo) : null, (doc(db, "guilds", group.guildId).get().then(snap => snap.data() as Guild).then(g => g.customRoles) as unknown as Record<string, CustomRole>), GuildPermission.MANAGE_GROUPS_EDIT) && <DropdownMenuItem onClick={() => onEdit(group)}><Edit2 className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}
                {hasPermission(useAuth().user && useAuth().user!.uid && group.guildId ? (doc(db, "guilds", group.guildId).get().then(snap => snap.data() as Guild).then(g => g.roles?.[useAuth().user!.uid]) as unknown as GuildMemberRoleInfo) : null, (doc(db, "guilds", group.guildId).get().then(snap => snap.data() as Guild).then(g => g.customRoles) as unknown as Record<string, CustomRole>), GuildPermission.MANAGE_GROUPS_DELETE) && <DropdownMenuItem onClick={() => onDelete(group)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2 flex-grow">
        {group.members.length > 0 ? (
          group.members.map(member => (
            <div key={member.memberId} className="flex items-center gap-2 text-sm">
              <Avatar className="h-7 w-7">
                <AvatarImage src={member.photoURL || undefined} alt={member.displayName || "Membro"} data-ai-hint="user avatar"/>
                <AvatarFallback>{member.displayName?.substring(0,1).toUpperCase() || 'M'}</AvatarFallback>
              </Avatar>
              <span className="text-foreground truncate flex-1">{member.displayName}</span>
              {member.note && <span className="text-xs text-muted-foreground truncate italic">({member.note})</span>}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum membro neste grupo.</p>
        )}
      </CardContent>
    </Card>
  );
}


// --- MAIN PAGE COMPONENT ---
function MembersPageContainer() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]); // For members list tab
  const [guildMembersForGroups, setGuildMembersForGroups] = useState<GuildMember[]>([]); // For groups tab dropdown
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "members");

  const guildId = searchParams.get('guildId');

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && ["members", "groups", "screenshots", "vod"].includes(currentTab)) {
      setActiveTab(currentTab);
    } else {
      setActiveTab("members"); 
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('tab', newTab);
    router.push(`${window.location.pathname}?${newSearchParams.toString()}`, { scroll: false });
  };

  const fetchGuildAndMembersData = useCallback(async () => {
    if (!guildId || !currentUser) return;
    setLoadingGuildData(true);
    try {
      const guildDocRef = doc(db, "guilds", guildId);
      const guildSnap = await getDoc(guildDocRef);
      if (!guildSnap.exists()) {
        toast({ title: "Guilda não encontrada", variant: "destructive" }); router.push('/guild-selection'); return;
      }
      const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
      setGuild(guildData);
      setHeaderTitle(`Membros: ${guildData.name}`);

      let memberIdsToFetch = guildData.memberIds || [];
      if (guildData.ownerId && !memberIdsToFetch.includes(guildData.ownerId)) { memberIdsToFetch = [...new Set([...memberIdsToFetch, guildData.ownerId])]; }

      if (memberIdsToFetch.length > 0) {
        const userProfilesPromises = memberIdsToFetch.map(uid => getDoc(doc(db, "users", uid)));
        const userProfileSnaps = await Promise.all(userProfilesPromises);
        const processedMembers: GuildMember[] = []; const processedGuildMembersForGroups: GuildMember[] = [];
        for (let i = 0; i < memberIdsToFetch.length; i++) {
          const uid = memberIdsToFetch[i]; const userProfileSnap = userProfileSnaps[i];
          let baseProfile: UserProfile;
          if (userProfileSnap && userProfileSnap.exists()) { baseProfile = userProfileSnap.data() as UserProfile;
          } else if (uid === guildData.ownerId && currentUser && uid === currentUser.uid) { baseProfile = { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName || `Owner (${currentUser.uid.substring(0,6)})`, photoURL: currentUser.photoURL, guilds: [], lastNotificationsCheckedTimestamp: {} };
          } else { console.warn(`User profile not found for UID: ${uid}, skipping member.`); continue; }
          const roleInfoSource = guildData.roles?.[uid];
          const enhancedMember = enhanceMemberData(baseProfile, roleInfoSource, guildData);
          processedMembers.push(enhancedMember);
          processedGuildMembersForGroups.push({ uid: baseProfile.uid, displayName: baseProfile.displayName || 'Desconhecido', photoURL: baseProfile.photoURL, email: baseProfile.email } as GuildMember);
        }
        processedMembers.sort((a, b) => (a.characterNickname || a.displayName || a.uid).localeCompare(b.characterNickname || b.displayName || b.uid));
        setMembers(processedMembers);
        setGuildMembersForGroups(processedGuildMembersForGroups.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "")));
      } else {
         if (guildData.ownerId === currentUser.uid) {
            const ownerRoleInfoSource = guildData.roles?.[currentUser.uid];
            const ownerBaseProfile: UserProfile = { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName || `Owner (${currentUser.uid.substring(0,6)})`, photoURL: currentUser.photoURL, guilds: [], lastNotificationsCheckedTimestamp: {} };
            const ownerEnhanced = enhanceMemberData(ownerBaseProfile, ownerRoleInfoSource, guildData);
            setMembers([ownerEnhanced]);
            setGuildMembersForGroups([ownerEnhanced]);
         } else { setMembers([]); setGuildMembersForGroups([]); }
      }
    } catch (error) { console.error("Erro ao buscar dados da guilda e membros:", error); toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar os membros da guilda.", variant: "destructive" });
    } finally { setLoadingGuildData(false); }
  }, [guildId, currentUser, router, toast, setHeaderTitle]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.push('/login'); return; }
    if (!guildId) { toast({ title: "ID da Guilda Ausente", variant: "destructive" }); router.push('/guild-selection'); return; }
    fetchGuildAndMembersData();
    return () => setHeaderTitle(null);
  }, [guildId, currentUser, authLoading, router, toast, fetchGuildAndMembersData, setHeaderTitle]);

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  if (loadingGuildData || authLoading || !guild || !currentUser) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageTitle title={`Membros de ${guild.name}`} icon={<Users className="h-8 w-8 text-primary" />} />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="vod">VOD</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersListTabContent guild={guild} members={members} currentUser={currentUser} guildId={guildId} currentUserRoleInfo={currentUserRoleInfo} fetchGuildAndMembers={fetchGuildAndMembersData} />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsTabContent guild={guild} guildMembers={guildMembersForGroups} currentUser={currentUser} guildId={guildId} currentUserRoleInfo={currentUserRoleInfo} />
        </TabsContent>
        <TabsContent value="screenshots">
           <ComingSoon pageName="Screenshots dos Membros" icon={<ImageIconLucide className="h-8 w-8 text-primary"/>} />
        </TabsContent>
        <TabsContent value="vod">
           <ComingSoon pageName="VODs dos Membros" icon={<Film className="h-8 w-8 text-primary"/>} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <MembersPageContainer />
    </Suspense>
  );
}




