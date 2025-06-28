

"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, arrayRemove, increment as firebaseIncrement, deleteField as firestoreDeleteField, collection, query as firestoreQuery, where, onSnapshot, addDoc, deleteDoc as firestoreDeleteDoc, serverTimestamp, orderBy, writeBatch, getDocs as getFirestoreDocs, Timestamp, arrayUnion } from '@/lib/firebase';
import type { Guild, GuildMember, UserProfile, GuildMemberRoleInfo, MemberStatus, CustomRole, GuildGroup, GuildGroupMember, GroupIconType, VODSubmission } from '@/types/guildmaster';
import { AuditActionType, GuildPermission, TLWeapon as TLWeaponEnum, TLRole } from '@/types/guildmaster';
import { hasPermission, isGuildOwner } from '@/lib/permissions';
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
  UsersRound, PlusCircle, Edit2, Trash2, Save, Film, Image as ImageIconLucide, MinusCircle, PlusCircle as PlusCircleIconLucide, Coins, Send, Video, MessageCircle, Lock, MoreHorizontal, FileDown
} from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { useHeader } from '@/contexts/HeaderContext';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, type SubmitHandler as GroupSubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ComingSoon } from '@/components/shared/ComingSoon';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  subGuildId: z.string().optional(),
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

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

const vodSubmissionSchema = z.object({
  youtubeUrl: z.string().regex(YOUTUBE_URL_REGEX, "Por favor, insira um link válido do YouTube."),
  eventName: z.string().min(3, "O nome do evento é obrigatório."),
  eventDateTime: z.date({
    required_error: "A data e hora do evento são obrigatórias.",
  }),
});
type VODSubmissionFormValues = z.infer<typeof vodSubmissionSchema>;


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
      gearScreenshotUpdatedAt: guildRoleInfo.gearScreenshotUpdatedAt,
      gearScreenshotUpdateRequest: guildRoleInfo.gearScreenshotUpdateRequest,
      subGuildId: guildRoleInfo.subGuildId,
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
    gearScreenshotUpdatedAt: specificRoleInfo.gearScreenshotUpdatedAt,
    gearScreenshotUpdateRequest: specificRoleInfo.gearScreenshotUpdateRequest,
    weapons: {
      mainHandIconUrl: specificRoleInfo.tlPrimaryWeapon ? getWeaponIconPath(specificRoleInfo.tlPrimaryWeapon) : undefined,
      offHandIconUrl: specificRoleInfo.tlSecondaryWeapon ? getWeaponIconPath(specificRoleInfo.tlSecondaryWeapon) : undefined
    },
    subGuildId: specificRoleInfo.subGuildId,
  };
};

const displayMemberStatus = (status?: MemberStatus): string => {
  if (status === 'Licenca') return 'Licença';
  return status || 'Desconhecido';
};


// --- Group Card Component ---
function GroupCard({ group, onEdit, onDelete, canManage, guild }: { group: GuildGroup; onEdit: (group: GuildGroup) => void; onDelete: (group: GuildGroup) => void; canManage: boolean; guild: Guild | null; }) {
  const IconComponent = iconMap[group.icon];
  const subGuildName = guild?.subGuildsEnabled && group.subGuildId ? guild.subGuilds?.find(sg => sg.id === group.subGuildId)?.name : null;

  return (
    <Card className="static-card-container flex flex-col h-full">
      <CardHeader className={cn("p-4 flex flex-row items-center justify-between text-white rounded-t-xl", group.headerColor)}>
        <div className="flex items-center gap-2">
          <IconComponent className="h-6 w-6" />
          <CardTitle className="text-lg font-bold">{group.name}</CardTitle>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(group)}>
                <Edit2 className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(group)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-3 flex-grow">
        {subGuildName && <Badge variant="outline" className="mb-2">{subGuildName}</Badge>}
        {group.members.map((member) => (
          <div key={member.memberId} className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.photoURL || undefined} alt={member.displayName} data-ai-hint="user avatar" />
              <AvatarFallback>{member.displayName.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{member.displayName}</p>
              {member.note && <p className="text-xs text-muted-foreground italic">{member.note}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


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

  // Viewer's permissions
  const isOwner = isGuildOwner(currentUser?.uid, guild);
  const canManageMemberRoles = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_ROLE);
  const canKickMembers = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_KICK);
  const canManageMemberStatus = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_STATUS);
  const canManageMemberNotes = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_NOTES);
  const canViewDetailedMemberInfo = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.VIEW_MEMBER_DETAILED_INFO);
  const canAdjustMemberDkp = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBER_DKP_BALANCE);
  const canAssignSubGuild = isOwner || hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_ASSIGN_SUB_GUILD);


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

  const handleAssignSubGuild = async (member: GuildMember, subGuildId: string | null) => {
    if (!guildId || !currentUser || !canAssignSubGuild || !guild) return;
    setIsProcessingAction(true);
    const oldSubGuildId = member.subGuildId || null;
    const oldSubGuildName = guild.subGuilds?.find(sg => sg.id === oldSubGuildId)?.name || "Nenhuma";
    const newSubGuildName = subGuildId ? (guild.subGuilds?.find(sg => sg.id === subGuildId)?.name || "Nenhuma") : "Nenhuma";

    try {
      const guildRef = doc(db, "guilds", guildId);
      const fieldPath = `roles.${member.uid}.subGuildId`;
      
      const existingRoleInfo = guild.roles?.[member.uid] || { roleName: member.roleName, status: 'Ativo', dkpBalance: 0 };
      let updatedRoleInfoPayload: GuildMemberRoleInfo = { ...existingRoleInfo };
      
      if (subGuildId) {
          updatedRoleInfoPayload.subGuildId = subGuildId;
      } else {
          delete updatedRoleInfoPayload.subGuildId;
      }
      
      await updateDoc(guildRef, { [`roles.${member.uid}`]: updatedRoleInfoPayload });
      
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.MEMBER_ASSIGNED_TO_SUB_GUILD, {
        targetUserId: member.uid,
        targetUserDisplayName: member.characterNickname || member.displayName || "N/A",
        oldValue: oldSubGuildName,
        newValue: newSubGuildName,
      });

      toast({ title: "Sub-Guilda Atribuída!", description: `${member.characterNickname || member.displayName} foi movido para ${newSubGuildName}.` });
      fetchGuildAndMembers();
    } catch (error) {
      console.error("Erro ao atribuir sub-guilda:", error);
      toast({ title: "Erro ao Atribuir", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
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
    if (gearSortOrder !== "default") { tempMembers.sort((a, b) => { const gearA = a.gearScore || 0; const gearB = b.gearScore || 0; return gearSortOrder === "asc" ? gearA - gearB : gearB - a; }); }
    if (dkpSortOrder !== "default") { tempMembers.sort((a, b) => { const dkpA = a.dkpBalance || 0; const dkpB = b.dkpBalance || 0; return dkpSortOrder === "asc" ? dkpA - dkpB : dkpB - a; }); }
    return tempMembers;
  }, [members, usernameFilter, tlRoleFilter, rankFilter, statusFilter, gearSortOrder, dkpSortOrder, guild?.game]);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedMembers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedMembers, currentPage]);

  const totalFilteredMembers = filteredAndSortedMembers.length;
  const totalPages = Math.ceil(totalFilteredMembers / rowsPerPage);
  const isTLGuild = guild.game === "Throne and Liberty";

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-card rounded-lg shadow items-end">
        <div className="xl:col-span-1">
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
          <TableHeader><TableRow><TableHead className="w-[50px]"><Checkbox checked={paginatedMembers.length > 0 && numSelectedRows === paginatedMembers.length} onCheckedChange={(checked) => handleSelectAllRows(Boolean(checked))} aria-label="Selecionar todas as linhas visíveis" disabled={paginatedMembers.length === 0}/></TableHead><TableHead>Usuário <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead><TableHead>Sub-Guilda</TableHead>{isTLGuild && <TableHead>Função <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>}<TableHead>Armas</TableHead><TableHead>Gear <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead><TableHead>Cargo <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead><TableHead>Balanço DKP <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>{canManageMemberNotes && <TableHead>Nota</TableHead>}<TableHead>Status <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead><TableHead className="text-right w-[120px]">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {paginatedMembers.length > 0 ? (
              paginatedMembers.map((member) => {
                const isCurrentUserTarget = member.uid === currentUser?.uid;
                const isGuildOwnerTarget = member.uid === guild?.ownerId;
                const displayName = member.characterNickname || member.displayName || member.email || member.uid;
                const subGuildName = guild.subGuildsEnabled ? guild.subGuilds?.find(sg => sg.id === member.subGuildId)?.name || "N/A" : "N/A";
                
                const hasRoleActions = canManageMemberRoles && !isGuildOwnerTarget;
                const hasStatusActions = canManageMemberStatus;
                const showDkpActions = guild.dkpSystemEnabled && canAdjustMemberDkp;
                const hasKickAction = canKickMembers && !isGuildOwnerTarget;
                const hasSubGuildAction = canAssignSubGuild && guild.subGuildsEnabled;
                
                const canPerformManagementActions = hasRoleActions || hasStatusActions || showDkpActions || hasKickAction || hasSubGuildAction;
                
                return (
                  <TableRow key={member.uid} data-state={selectedRows[member.uid] ? "selected" : ""}>
                    <TableCell><div className="flex items-center"><Checkbox checked={selectedRows[member.uid] || false} onCheckedChange={(checked) => handleSelectRow(member.uid, Boolean(checked))} aria-label={`Selecionar ${displayName}`}/></div></TableCell>
                    <TableCell><div className={cn("flex items-center gap-2 font-medium", canViewDetailedMemberInfo && "cursor-pointer hover:text-primary transition-colors")} onClick={() => canViewDetailedMemberInfo && handleViewMemberDetails(member)} title={canViewDetailedMemberInfo ? "Ver detalhes do membro" : "" }><Avatar className="h-8 w-8"><AvatarImage src={member.photoURL || `https://placehold.co/40x40.png?text=${displayName?.substring(0,1) || 'M'}`} alt={displayName || 'Avatar'} data-ai-hint="user avatar"/><AvatarFallback>{displayName?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback></Avatar>{displayName}</div></TableCell>
                    <TableCell>{subGuildName}</TableCell>
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
                                  {hasSubGuildAction && guild.subGuilds && guild.subGuilds.length > 0 && (
                                      <DropdownMenuSub>
                                          <DropdownMenuSubTrigger><UsersRound className="mr-2 h-4 w-4" />Atribuir Sub-Guilda</DropdownMenuSubTrigger>
                                          <DropdownMenuPortal>
                                              <DropdownMenuSubContent>
                                                  <DropdownMenuItem onSelect={() => handleAssignSubGuild(member, null)}>Nenhuma</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  {guild.subGuilds.map(sg => (
                                                      <DropdownMenuItem key={sg.id} onSelect={() => handleAssignSubGuild(member, sg.id)} disabled={member.subGuildId === sg.id}>
                                                          {sg.name}
                                                      </DropdownMenuItem>
                                                  ))}
                                              </DropdownMenuSubContent>
                                          </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                  )}
                                  {hasStatusActions && ( <DropdownMenuSub><DropdownMenuSubTrigger><UserCog className="mr-2 h-4 w-4" />Alterar Status</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent>{(['Ativo', 'Inativo', 'Licenca'] as MemberStatus[]).filter(s => s !== member.status).map(statusOption => ( <DropdownMenuItem key={statusOption} onSelect={() => { setSelectedNewStatus(statusOption); handleChangeStatus(member, statusOption); }} disabled={isGuildOwnerTarget && statusOption === 'Inativo'}>{getStatusIcon(statusOption)}{displayMemberStatus(statusOption)}</DropdownMenuItem> ))}</DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub> )}
                                  
                                  { (hasRoleActions || hasStatusActions || hasSubGuildAction) && showDkpActions && <DropdownMenuSeparator /> }

                                  {showDkpActions && (
                                      <>
                                          <DropdownMenuItem onSelect={() => handleOpenDkpDialog(member, 'add')}><PlusCircleIconLucide className="mr-2 h-4 w-4 text-green-500"/> Dar DKP</DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => handleOpenDkpDialog(member, 'remove')}><MinusCircle className="mr-2 h-4 w-4 text-red-500"/> Retirar DKP</DropdownMenuItem>
                                      </>
                                  )}
                                  
                                  { (showDkpActions || hasRoleActions || hasStatusActions || hasSubGuildAction) && hasKickAction && <DropdownMenuSeparator /> }

                                  {hasKickAction && ( 
                                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => openActionDialog(member, "kick")}><UserX className="mr-2 h-4 w-4" /> Remover da Guilda</DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      )}
                    </div></TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={isTLGuild ? (canManageMemberNotes ? 11 : 10) : (canManageMemberNotes ? 10 : 9)} className="text-center h-24">
                  Nenhum membro encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
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
      {selectedMemberForDetails && ( <Dialog open={showMemberDetailsDialog} onOpenChange={setShowMemberDetailsDialog}> <MemberDetailsDialogContent className="sm:max-w-lg"> <MemberDetailsDialogHeader> <MemberDetailsDialogTitle className="flex items-center"> <Avatar className="h-10 w-10 mr-3"> <AvatarImage src={selectedMemberForDetails.photoURL || `https://placehold.co/40x40.png?text=${(selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName)?.substring(0,1) || 'M'}`} alt={selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName || 'Avatar'} data-ai-hint="user avatar"/><AvatarFallback>{(selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName)?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback> </Avatar> Detalhes de {selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName} </MemberDetailsDialogTitle> <MemberDetailsDialogDescription> Informações específicas do membro na guilda. </MemberDetailsDialogDescription> </MemberDetailsDialogHeader> <div className="py-4 space-y-3"> <p><strong>Nickname na Guilda:</strong> {selectedMemberForDetails.characterNickname || "N/A"}</p> <p><strong>Gearscore:</strong> {selectedMemberForDetails.gearScore ?? "N/A"}</p> {selectedMemberForDetails.gearScoreScreenshotUrl ? ( <p><strong>Print do Gearscore:</strong> <Link href={selectedMemberForDetails.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Screenshot <Eye className="inline h-4 w-4 ml-1"/></Link></p> ) : <p><strong>Print do Gearscore:</strong> N/A</p>} {selectedMemberForDetails.gearBuildLink ? ( <p><strong>Gear Build Link:</strong> <Link href={selectedMemberForDetails.gearBuildLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Build de Equipamento <LinkIcon className="inline h-4 w-4 ml-1"/></Link></p> ) : <p><strong>Gear Build Link:</strong> N/A</p>} {selectedMemberForDetails.skillBuildLink ? ( <p><strong>Skill Build Link:</strong> <Link href={selectedMemberForDetails.skillBuildLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Build de Habilidades <LinkIcon className="inline h-4 w-4 ml-1"/></Link></p> ) : <p><strong>Skill Build Link:</strong> N/A</p>} {isTLGuild && ( <> <hr className="my-3 border-border"/> <p className="flex items-center gap-1"><strong>Função (TL):</strong> {getTLRoleIcon(selectedMemberForDetails.tlRole)} {selectedMemberForDetails.tlRole || "N/A"}</p> <div className="flex items-center gap-2"> <strong>Armas (TL):</strong> {selectedMemberForDetails.weapons?.mainHandIconUrl && <Image src={selectedMemberForDetails.weapons.mainHandIconUrl} alt={selectedMemberForDetails.tlPrimaryWeapon || "Arma Principal"} width={24} height={24} data-ai-hint="weapon sword"/>} {selectedMemberForDetails.weapons?.offHandIconUrl && <Image src={selectedMemberForDetails.weapons.offHandIconUrl} alt={selectedMemberForDetails.tlSecondaryWeapon || "Arma Secundária"} width={24} height={24} data-ai-hint="weapon shield"/>} {!selectedMemberForDetails.weapons?.mainHandIconUrl && !selectedMemberForDetails.weapons?.offHandIconUrl && "N/A"} </div> {selectedMemberForDetails.tlPrimaryWeapon && <p className="text-sm text-muted-foreground ml-4">- {selectedMemberForDetails.tlPrimaryWeapon}</p>} {selectedMemberForDetails.tlSecondaryWeapon && <p className="text-sm text-muted-foreground ml-4">- {selectedMemberForDetails.tlSecondaryWeapon}</p>} </> )} </div> <MemberDetailsDialogFooter> <Button variant="outline" onClick={() => setShowMemberDetailsDialog(false)}>Fechar</Button> </MemberDetailsDialogFooter> </MemberDetailsDialogContent> </Dialog> )}
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

// --- GEAR SCREENSHOTS TAB CONTENT ---
function GearScreenshotsTabContent({ guild, members: initialMembers, currentUser, guildId, currentUserRoleInfo, fetchGuildAndMembers }: { guild: Guild; members: GuildMember[]; currentUser: UserProfile; guildId: string; currentUserRoleInfo: GuildMemberRoleInfo | null; fetchGuildAndMembers: () => void;}) {
    const { toast } = useToast();
    const [members, setMembers] = useState<GuildMember[]>(initialMembers);
    const [requestingUpdateFor, setRequestingUpdateFor] = useState<string | null>(null);

    useEffect(() => {
      setMembers(initialMembers);
    }, [initialMembers]);

    const canRequestUpdate = useMemo(() => {
        return hasPermission(currentUserRoleInfo?.roleName, guild.customRoles, GuildPermission.MANAGE_GEAR_SCREENSHOT_REQUESTS);
    }, [currentUserRoleInfo, guild.customRoles]);

    const handleRequestScreenshotUpdate = async (targetMember: GuildMember) => {
        if (!canRequestUpdate || !guildId || !currentUser) {
            toast({ title: "Permissão Negada", variant: "destructive" });
            return;
        }
        setRequestingUpdateFor(targetMember.uid);
        try {
            const guildRef = doc(db, "guilds", guildId);
            const requestPayload = {
                requestedBy: currentUser.uid,
                requestedByDisplayName: currentUser.displayName || currentUser.email || "Líder",
                requestedAt: serverTimestamp(),
            };
            await updateDoc(guildRef, {
                [`roles.${targetMember.uid}.gearScreenshotUpdateRequest`]: requestPayload,
            });

            await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.GEAR_SCREENSHOT_UPDATE_REQUESTED, {
                targetUserId: targetMember.uid,
                targetUserDisplayName: targetMember.characterNickname || targetMember.displayName
            });

            toast({ title: "Solicitação Enviada", description: `Uma solicitação de atualização de gear foi enviada para ${targetMember.characterNickname || targetMember.displayName}.` });
            fetchGuildAndMembers();
        } catch (error) {
            console.error("Erro ao solicitar atualização:", error);
            toast({ title: "Erro ao Enviar Solicitação", variant: "destructive" });
        } finally {
            setRequestingUpdateFor(null);
        }
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="overflow-x-auto bg-card p-2 rounded-lg shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>Screenshot do Gear</TableHead>
                            <TableHead>Última Atualização</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.length > 0 ? (
                            members.map((member) => (
                            <TableRow key={member.uid}>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-medium">
                                        <Avatar className="h-8 w-8"><AvatarImage src={member.photoURL || undefined} alt={member.displayName || ""} data-ai-hint="user avatar"/><AvatarFallback>{member.displayName?.substring(0, 2).toUpperCase() || 'M'}</AvatarFallback></Avatar>
                                        {member.characterNickname || member.displayName}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {member.gearScoreScreenshotUrl ? (
                                        <a href={member.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer">
                                            <Image src={member.gearScoreScreenshotUrl} alt={`Gear de ${member.characterNickname}`} width={100} height={60} className="rounded-md object-cover hover:scale-110 transition-transform" data-ai-hint="gear screenshot"/>
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">Não enviado</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {member.gearScreenshotUpdatedAt ? format(member.gearScreenshotUpdatedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : <span className="text-muted-foreground text-xs">Nunca</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    {canRequestUpdate && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRequestScreenshotUpdate(member)}
                                            disabled={requestingUpdateFor === member.uid || !!member.gearScreenshotUpdateRequest}
                                        >
                                            {requestingUpdateFor === member.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : (member.gearScreenshotUpdateRequest ? "Solicitado" : <Send className="h-4 w-4 mr-2"/>)}
                                            {requestingUpdateFor !== member.uid && !member.gearScreenshotUpdateRequest && "Solicitar Atualização"}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Nenhum membro encontrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
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
  const groupsContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: "", icon: "shield", headerColor: availableHeaderColors[0].value, subGuildId: undefined, members: [{ memberId: "", note: "" }], },
  });
  const { fields: groupMembersFields, append: appendGroupMember, remove: removeGroupMember } = useFieldArray({ control: groupForm.control, name: "members", });

  const watchedSubGuildId = groupForm.watch('subGuildId');

  useEffect(() => {
    groupForm.setValue('members', [{ memberId: "", note: "" }]);
  }, [watchedSubGuildId, groupForm]);

  const availableMembersForDropdown = useMemo(() => {
      const subGuildIdFilter = groupForm.getValues('subGuildId');
      if (!subGuildIdFilter) {
          return guildMembers;
      }
      return guildMembers.filter(member => member.subGuildId === subGuildIdFilter);
  }, [guildMembers, watchedSubGuildId, groupForm]);

  const canCreateGroups = useMemo(() => {
    return hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_CREATE);
  }, [currentUserRoleInfo, guild?.customRoles]);

  const canManageGroups = useMemo(() => {
    return hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_CREATE) ||
           hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_EDIT) ||
           hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_GROUPS_DELETE);
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
    if (groupToEdit) { groupForm.reset({ name: groupToEdit.name, icon: groupToEdit.icon, headerColor: groupToEdit.headerColor, subGuildId: groupToEdit.subGuildId || undefined, members: groupToEdit.members.map(m => ({ memberId: m.memberId, note: m.note || "" })), });
    } else { groupForm.reset({ name: "", icon: "shield", headerColor: availableHeaderColors[0].value, subGuildId: undefined, members: [{ memberId: "", note: "" }], }); }
    setShowGroupDialog(true);
  };

  const onSubmitGroup: GroupSubmitHandler<GroupFormValues> = async (data) => {
    if (!currentUser || !guildId) return;
    const requiredPermission = editingGroup ? GuildPermission.MANAGE_GROUPS_EDIT : GuildPermission.MANAGE_GROUPS_CREATE;
    if (!hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, requiredPermission)) { toast({title: "Permissão Negada", description: `Você não tem permissão para ${editingGroup ? 'editar' : 'criar'} grupos.`, variant: "destructive"}); return; }
    setIsSubmittingGroup(true);
    const groupMembersData: GuildGroupMember[] = data.members.filter(m => m.memberId).map(m => { const memberProfile = guildMembers.find(gm => gm.uid === m.memberId); return { memberId: m.memberId, displayName: memberProfile?.displayName || 'Desconhecido', photoURL: memberProfile?.photoURL || null, note: m.note, }; });
    
    const groupDataPayload: { [key: string]: any } = { 
        name: data.name, 
        icon: data.icon, 
        headerColor: data.headerColor, 
        members: groupMembersData, 
        guildId: guildId, 
    };

    if (data.subGuildId) {
        groupDataPayload.subGuildId = data.subGuildId;
    } else if (editingGroup) {
        groupDataPayload.subGuildId = firestoreDeleteField();
    }

    try {
      if (editingGroup) {
        const groupRef = doc(db, `guilds/${guildId}/groups`, editingGroup.id); 
        await updateDoc(groupRef, groupDataPayload);
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

  const handleExportToPdf = async () => {
    const groupsContainer = groupsContainerRef.current;
    if (!groupsContainer) {
        toast({ title: "Erro", description: "Não foi possível encontrar a área dos grupos para exportar.", variant: "destructive" });
        return;
    }

    setIsExporting(true);
    toast({ title: 'Exportando PDF...', description: 'Aguarde enquanto o arquivo está sendo gerado.' });

    try {
        const canvas = await html2canvas(groupsContainer, {
            backgroundColor: '#110D15', // Matches the app's dark background
            useCORS: true,
            scale: 2, // Higher resolution
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Add Title
        pdf.setFontSize(22);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor('#9F4BFF'); // --primary color
        pdf.text(`Grupos - ${guild?.name || ''}`, pdfWidth / 2, 40, { align: 'center' });

        // Add Image of groups
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth - 80; // Margins
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        let finalHeight = imgHeight;
        
        if (imgHeight > pdfHeight - 120) {
            finalHeight = pdfHeight - 120; // Cap height
        }
        
        pdf.addImage(imgData, 'PNG', 40, 70, imgWidth, finalHeight);

        // Add Watermark Footer
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(150); // Gray color
        const footerText = `Gerado por GuildMasterHub - ${new Date().toLocaleDateString('pt-BR')}`;
        const textWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const textX = (pdfWidth - textWidth) / 2;
        pdf.text(footerText, textX, pdfHeight - 20);

        pdf.save(`grupos_${guild?.name.replace(/\s+/g, '_') || 'guilda'}.pdf`);
        toast({ title: 'Sucesso!', description: 'O PDF foi exportado com sucesso.' });
    } catch (error) {
        console.error("Erro ao exportar PDF:", error);
        toast({ title: 'Erro ao Exportar', description: 'Não foi possível gerar o PDF.', variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
  };


  if (loadingGroups) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-300px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pt-6">
      {groups.length === 0 ? (
        <Card className="static-card-container text-center py-10 max-w-lg mx-auto">
          <CardHeader>
            <UsersRound className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl">Nenhum Grupo Criado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ainda não há grupos formados nesta guilda.
              {canCreateGroups && " Crie o primeiro para começar a organizar seus membros."}
            </p>
          </CardContent>
          {canCreateGroups && (
            <CardFooter className="flex justify-center">
              <Button onClick={() => handleOpenGroupDialog()} className="btn-gradient btn-style-secondary mt-4">
                <PlusCircle className="mr-2 h-5 w-5" /> Crie o Primeiro Grupo
              </Button>
            </CardFooter>
          )}
        </Card>
      ) : (
        <>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExportToPdf} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Exportar PDF
            </Button>
            {canCreateGroups && (
              <Button onClick={() => handleOpenGroupDialog()} className="btn-gradient btn-style-secondary">
                <PlusCircle className="mr-2 h-5 w-5" /> Novo Grupo
              </Button>
            )}
          </div>
          <div ref={groupsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map(group => ( <GroupCard key={group.id} group={group} onEdit={handleOpenGroupDialog} onDelete={(g) => setGroupToDelete(g)} canManage={canManageGroups} guild={guild} /> ))}
          </div>
        </>
      )}
      <Dialog open={showGroupDialog} onOpenChange={(isOpen) => { if (!isOpen) { setEditingGroup(null); groupForm.reset(); } setShowGroupDialog(isOpen); }}>
        <GroupDialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] flex flex-col">
          <GroupDialogHeader className="p-6 pb-4 shrink-0 border-b border-border"> <GroupDialogTitle className="font-headline text-primary">{editingGroup ? "Editar Grupo" : "Criar Novo Grupo"}</GroupDialogTitle> <GroupDialogDescription>Preencha os detalhes para {editingGroup ? "atualizar o" : "configurar um novo"} grupo.</GroupDialogDescription> </GroupDialogHeader>
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onSubmitGroup)} className="flex-grow overflow-y-auto px-6 py-4 space-y-5">
              {guild.subGuildsEnabled && guild.subGuilds && guild.subGuilds.length > 0 && (
                  <FormField control={groupForm.control} name="subGuildId" render={({ field }) => ( <FormItem> <FormLabel>Filtrar por Sub-Guilda (Opcional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)} value={field.value || 'all'}>
                        <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Todas as Sub-Guildas" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="all">Todas as Sub-Guildas</SelectItem>{guild.subGuilds.map(sg => <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>)}</SelectContent>
                      </Select> <FormMessage /> </FormItem>
                  )}/>
              )}
              <FormField control={groupForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome do Grupo</FormLabel> <FormControl><Input {...field} placeholder="Ex: Grupo Alpha de Raide" className="form-input"/></FormControl> <FormMessage /> </FormItem> )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={groupForm.control} name="icon" render={({ field }) => ( <FormItem> <FormLabel>Ícone do Grupo</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione um ícone" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="shield"><ShieldIconLucide className="inline mr-2 h-4 w-4"/> Escudo</SelectItem> <SelectItem value="sword"><Swords className="inline mr-2 h-4 w-4"/> Espada</SelectItem> <SelectItem value="heart"><Heart className="inline mr-2 h-4 w-4"/> Coração</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <FormField control={groupForm.control} name="headerColor" render={({ field }) => ( <FormItem> <FormLabel>Cor do Cabeçalho</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione uma cor" /></SelectTrigger></FormControl> <SelectContent> {availableHeaderColors.map(color => ( <SelectItem key={color.value} value={color.value}> <div className="flex items-center"> <span className={cn("w-4 h-4 rounded-full mr-2", color.value.split(' ')[0])}></span> {color.label} </div> </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
              </div>
              <div className="space-y-3"> <FormLabel>Membros do Grupo (Máximo 6)</FormLabel>
                {groupMembersFields.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start gap-2 p-3 border rounded-md bg-input/30">
                    <div className="flex-grow w-full sm:w-auto"> <FormField control={groupForm.control} name={`members.${index}.memberId`} render={({ field }) => ( <FormItem> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger className="form-input bg-background"><SelectValue placeholder="Selecione um membro" /></SelectTrigger></FormControl> <SelectContent> {availableMembersForDropdown.map(member => ( <SelectItem key={member.uid} value={member.uid} disabled={groupMembersFields.some((f, i) => i !== index && f.memberId === member.uid)}> <div className="flex items-center gap-2"> <Avatar className="h-6 w-6"> <AvatarImage src={member.photoURL || undefined} alt={member.displayName || ""} data-ai-hint="user avatar"/> <AvatarFallback>{member.displayName?.substring(0,1).toUpperCase() || 'M'}</AvatarFallback> </Avatar> {member.displayName} </div> </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/> </div>
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

// --- VODs TAB CONTENT ---
function VODsTabContent({ guild, guildId, currentUser, currentUserRoleInfo }: { guild: Guild; guildId: string; currentUser: UserProfile; currentUserRoleInfo: GuildMemberRoleInfo | null; }) {
  const canReviewVods = hasPermission(currentUserRoleInfo?.roleName, guild.customRoles, GuildPermission.MANAGE_VOD_REVIEWS);

  return (
    <div className="pt-6">
      <Tabs defaultValue="submit">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit">Enviar VOD</TabsTrigger>
          <TabsTrigger value="review" disabled={!canReviewVods}>
            Analisar VODs
            {!canReviewVods && <Lock className="ml-2 h-4 w-4" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="submit">
          <SubmitVODForm guildId={guildId} currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="review">
          {canReviewVods ? (
            <ReviewVODsList guildId={guildId} />
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Você não tem permissão para analisar VODs.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubmitVODForm({ guildId, currentUser }: { guildId: string; currentUser: UserProfile; }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<VODSubmissionFormValues>({
    resolver: zodResolver(vodSubmissionSchema),
  });

  const onSubmit: GroupSubmitHandler<VODSubmissionFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const newVod: Omit<VODSubmission, 'id'> = {
        guildId,
        submittedByUserId: currentUser.uid,
        submittedByDisplayName: currentUser.displayName || "Usuário Desconhecido",
        submittedByUserPhotoUrl: currentUser.photoURL,
        youtubeUrl: data.youtubeUrl,
        eventName: data.eventName,
        eventDateTime: Timestamp.fromDate(data.eventDateTime),
        submittedAt: serverTimestamp() as Timestamp,
        status: 'pending',
      };

      const docRef = await addDoc(collection(db, `guilds/${guildId}/vods`), newVod);
      
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.VOD_SUBMITTED, {
        vodId: docRef.id,
        eventName: data.eventName,
        details: { vodUrl: data.youtubeUrl } as any,
      });

      toast({ title: "VOD Enviado!", description: "Seu vídeo foi enviado para análise." });
      form.reset();
    } catch (error) {
      console.error("Erro ao enviar VOD:", error);
      toast({ title: "Erro", description: "Não foi possível enviar seu VOD.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="static-card-container mt-6">
      <CardHeader>
        <CardTitle>Enviar VOD para Análise</CardTitle>
        <CardDescription>Compartilhe suas gameplays para receber feedback da liderança.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CardContent className="space-y-4">
            <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Link do YouTube</FormLabel>
                <FormControl><Input {...field} placeholder="https://www.youtube.com/watch?v=..." /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="eventName" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Evento</FormLabel>
                <FormControl><Input {...field} placeholder="Ex: Raide do Dragão, Partida Competitiva" /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="eventDateTime" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data e Hora do Evento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}
                        <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR}/>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}/>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="ml-auto">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Enviar VOD"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function ReviewVODsList({ guildId }: { guildId: string; }) {
  const [vods, setVods] = useState<VODSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = firestoreQuery(collection(db, `guilds/${guildId}/vods`), orderBy("submittedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VODSubmission)));
      setLoading(false);
    });
    return unsubscribe;
  }, [guildId]);

  const getYoutubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  };

  if (loading) return <div className="text-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;
  if (vods.length === 0) return <div className="text-center py-10 text-muted-foreground">Nenhum VOD foi enviado ainda.</div>;

  return (
    <div className="space-y-4 mt-6">
      {vods.map(vod => {
        const embedUrl = getYoutubeEmbedUrl(vod.youtubeUrl);
        return (
          <Card key={vod.id} className="static-card-container">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{vod.eventName}</CardTitle>
                  <CardDescription>
                    Enviado por {vod.submittedByDisplayName} em {format(vod.eventDateTime.toDate(), "dd/MM/yyyy", {locale: ptBR})}
                  </CardDescription>
                </div>
                <Badge variant={vod.status === 'pending' ? 'default' : 'secondary'}>{vod.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {embedUrl ? (
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={embedUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-md"
                  ></iframe>
                </div>
              ) : (
                <p className="text-destructive">Link do YouTube inválido.</p>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled>
                <MessageCircle className="mr-2 h-4 w-4" />
                Dar Feedback
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
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
    if (currentTab && ["members", "groups", "screenshots-gear", "vod"].includes(currentTab)) {
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

      const memberIdsToFetch = [...new Set(guildData.memberIds || [])];

      if (memberIdsToFetch.length > 0) {
        const userProfilesPromises = memberIdsToFetch.map(uid => getDoc(doc(db, "users", uid)));
        const userProfileSnaps = await Promise.all(userProfilesPromises);
        const processedMembers: GuildMember[] = [];
        const processedGuildMembersForGroups: GuildMember[] = [];
        
        for (let i = 0; i < memberIdsToFetch.length; i++) {
          const uid = memberIdsToFetch[i];
          const userProfileSnap = userProfileSnaps[i];
          
          let baseProfile: UserProfile;
          const guildRoleInfo = guildData.roles?.[uid];

          if (userProfileSnap && userProfileSnap.exists()) {
            const firestoreData = userProfileSnap.data();
            baseProfile = {
              uid: uid,
              email: firestoreData.email || null,
              displayName: firestoreData.displayName || null,
              photoURL: firestoreData.photoURL || null,
              guilds: firestoreData.guilds || [],
              lastNotificationsCheckedTimestamp: firestoreData.lastNotificationsCheckedTimestamp || {},
            };
          } else {
            console.warn(`User profile document not found for UID: ${uid}. Creating a fallback profile for display.`);
            baseProfile = {
              uid: uid,
              email: null,
              displayName: guildRoleInfo?.characterNickname || 'Membro Desconhecido',
              photoURL: null,
            };
          }
          
          const enhancedMember = enhanceMemberData(baseProfile, guildRoleInfo, guildData);
          processedMembers.push(enhancedMember);
          
          const simpleMemberProfile = {
            uid: enhancedMember.uid,
            displayName: enhancedMember.characterNickname || enhancedMember.displayName || "Membro",
            photoURL: enhancedMember.photoURL,
            subGuildId: enhancedMember.subGuildId,
          } as GuildMember
          processedGuildMembersForGroups.push(simpleMemberProfile);
        }
        processedMembers.sort((a, b) => (a.characterNickname || a.displayName || a.uid).localeCompare(b.characterNickname || b.displayName || b.uid));
        setMembers(processedMembers);
        setGuildMembersForGroups(processedGuildMembersForGroups.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "")));
      } else { 
        setMembers([]); 
        setGuildMembersForGroups([]); 
      }
    } catch (error) {
      console.error("Erro ao buscar dados da guilda e membros:", error);
      toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar os membros da guilda.", variant: "destructive" });
    } finally {
      setLoadingGuildData(false);
    }
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
          <TabsTrigger value="screenshots-gear">Screenshots Gear</TabsTrigger>
          <TabsTrigger value="vod">VOD</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersListTabContent guild={guild} members={members} currentUser={currentUser} guildId={guildId} currentUserRoleInfo={currentUserRoleInfo} fetchGuildAndMembers={fetchGuildAndMembersData} />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsTabContent guild={guild} guildMembers={guildMembersForGroups} currentUser={currentUser} guildId={guildId} currentUserRoleInfo={currentUserRoleInfo} />
        </TabsContent>
        <TabsContent value="screenshots-gear">
           <GearScreenshotsTabContent guild={guild} members={members} currentUser={currentUser} guildId={guildId} currentUserRoleInfo={currentUserRoleInfo} fetchGuildAndMembers={fetchGuildAndMembersData} />
        </TabsContent>
        <TabsContent value="vod">
           <VODsTabContent guild={guild} guildId={guildId} currentUser={currentUser} currentUserRoleInfo={currentUserRoleInfo} />
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
