
"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, arrayRemove, increment as firebaseIncrement, deleteField, collection, writeBatch } from '@/lib/firebase';
import { type Guild, type GuildMember, type UserProfile, AuditActionType, TLRole, TLWeapon, type GuildMemberRoleInfo, type MemberStatus, GuildPermission, CustomRole } from '@/types/guildmaster';
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, MoreVertical, UserCog, UserX, Loader2, Crown, Shield as ShieldIconLucide, BadgeCent, User,
  CalendarDays, Clock, Eye, FileText, ArrowUpDown, Search, SlidersHorizontal, Download, UserPlus,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ShieldAlert, Heart, Swords, Wand2, Gamepad2, Filter, UserCheck, UserMinus, Hourglass, Link2 as LinkIcon
} from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { useHeader } from '@/contexts/HeaderContext';
import { Label } from '@/components/ui/label';
import { hasPermission } from '@/lib/permissions';


type MemberManagementAction = "changeRole" | "kick" | "changeStatus";
type GearSortOrder = "default" | "asc" | "desc";
type DkpSortOrder = "default" | "asc" | "desc";

const getWeaponIconPath = (weapon?: TLWeapon): string => {
  if (!weapon) return "https://placehold.co/32x32.png?text=N/A";
  switch (weapon) {
    case TLWeapon.SwordAndShield: return "https://i.imgur.com/jPEqyNb.png";
    case TLWeapon.Greatsword: return "https://i.imgur.com/Tf1LymG.png";
    case TLWeapon.Daggers: return "https://i.imgur.com/CEM1Oij.png";
    case TLWeapon.Crossbow: return "https://i.imgur.com/u7pqt5H.png";
    case TLWeapon.Bow: return "https://i.imgur.com/73c5Rl4.png";
    case TLWeapon.Staff: return "https://i.imgur.com/wgjWVvI.png";
    case TLWeapon.WandAndTome: return "https://i.imgur.com/BdYPLee.png";
    case TLWeapon.Spear: return "https://i.imgur.com/l2oHYwY.png";
    default: return "https://placehold.co/32x32.png?text=WPN";
  }
};

const enhanceMemberData = (memberBaseProfile: UserProfile, guildRoleInfo: GuildMemberRoleInfo | undefined, guildData: Guild): GuildMember => {
  const isTLGuild = guildData.game === "Throne and Liberty";
  
  let specificRoleInfo: GuildMemberRoleInfo = {
    roleName: "Membro", 
    status: 'Ativo', 
    dkpBalance: 0,
    notes: "",
    characterNickname: memberBaseProfile.displayName || memberBaseProfile.email || memberBaseProfile.uid,
    gearScore: 0,
  };

  if (guildRoleInfo) {
    specificRoleInfo = {
      ...specificRoleInfo, // Start with defaults
      ...guildRoleInfo,    // Override with actual role info
      characterNickname: guildRoleInfo.characterNickname || memberBaseProfile.displayName || memberBaseProfile.email || memberBaseProfile.uid,
      gearScore: guildRoleInfo.gearScore || 0,
      gearScoreScreenshotUrl: guildRoleInfo.gearScoreScreenshotUrl,
      gearBuildLink: guildRoleInfo.gearBuildLink,
      skillBuildLink: guildRoleInfo.skillBuildLink,
      status: guildRoleInfo.status || 'Ativo', 
      dkpBalance: guildRoleInfo.dkpBalance ?? 0,
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
    ...memberBaseProfile,
    roleName: specificRoleInfo.roleName,
    characterNickname: specificRoleInfo.characterNickname,
    gearScore: specificRoleInfo.gearScore,
    gearScoreScreenshotUrl: specificRoleInfo.gearScoreScreenshotUrl,
    gearBuildLink: specificRoleInfo.gearBuildLink,
    skillBuildLink: specificRoleInfo.skillBuildLink,
    tlRole: specificRoleInfo.tlRole,
    tlPrimaryWeapon: specificRoleInfo.tlPrimaryWeapon,
    tlSecondaryWeapon: specificRoleInfo.tlSecondaryWeapon,
    notes: specificRoleInfo.notes,
    status: specificRoleInfo.status,
    dkpBalance: specificRoleInfo.dkpBalance,
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


function MembersPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [actionUser, setActionUser] = useState<GuildMember | null>(null);
  const [actionType, setActionType] = useState<MemberManagementAction | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [selectedNewRoleName, setSelectedNewRoleName] = useState<string>('');
  const [selectedNewStatus, setSelectedNewStatus] = useState<MemberStatus | ''>('');


  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [usernameFilter, setUsernameFilter] = useState("");
  const [tlRoleFilter, setTlRoleFilter] = useState<TLRole | "all">("all");
  const [gearSortOrder, setGearSortOrder] = useState<GearSortOrder>("default");
  const [rankFilter, setRankFilter] = useState<string | "all">("all"); 
  const [dkpSortOrder, setDkpSortOrder] = useState<DkpSortOrder>("default");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all");


  const [activityDateRange, setActivityDateRange] = useState<DateRange | undefined>({
    from: undefined, 
    to: undefined, 
  });
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


  const guildId = searchParams.get('guildId');

  useEffect(() => {
    if (guild?.name) {
        setHeaderTitle(`Membros: ${guild.name}`);
    }
    return () => setHeaderTitle(null);
  }, [guild?.name, setHeaderTitle]);

  useEffect(() => {
    const initialUsername = searchParams.get('usernameFilter');
    if (initialUsername) setUsernameFilter(initialUsername);

    const initialTlRole = searchParams.get('tlRoleFilter') as TLRole | "all" | null;
    if (initialTlRole && (Object.values(TLRole).includes(initialTlRole as TLRole) || initialTlRole === "all")) {
      setTlRoleFilter(initialTlRole);
    }

    const initialRank = searchParams.get('rankFilter') as string | "all" | null;
     if (initialRank) { 
      setRankFilter(initialRank);
    }

    const initialStatus = searchParams.get('statusFilter') as MemberStatus | "all" | null;
    if (initialStatus && (['Ativo', 'Inativo', 'Licenca'] as MemberStatus[]).concat("all" as any).includes(initialStatus)) {
      setStatusFilter(initialStatus);
    }
  }, [searchParams]);


  const fetchGuildAndMembers = useCallback(async () => {
    if (!guildId || !currentUser) return;
    setLoadingGuildData(true);
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

      let memberIdsToFetch = guildData.memberIds || [];
      if (guildData.ownerId && !memberIdsToFetch.includes(guildData.ownerId)) {
          memberIdsToFetch = [...new Set([...memberIdsToFetch, guildData.ownerId])];
      }
      
      if (memberIdsToFetch.length > 0) {
        const userProfilesPromises = memberIdsToFetch.map(uid => getDoc(doc(db, "users", uid)));
        const userProfileSnaps = await Promise.all(userProfilesPromises);
        
        const processedMembers: GuildMember[] = [];
        for (let i = 0; i < memberIdsToFetch.length; i++) {
          const uid = memberIdsToFetch[i];
          const userProfileSnap = userProfileSnaps[i];
          let baseProfile: UserProfile;

          if (userProfileSnap && userProfileSnap.exists()) {
            baseProfile = userProfileSnap.data() as UserProfile;
          } else if (uid === guildData.ownerId && currentUser && uid === currentUser.uid) { 
            baseProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || `Owner (${currentUser.uid.substring(0,6)})`,
              photoURL: currentUser.photoURL,
            };
          } else {
            console.warn(`User profile not found for UID: ${uid}, skipping member.`);
            continue; 
          }
          
          const roleInfoSource = guildData.roles?.[uid];
          processedMembers.push(enhanceMemberData(baseProfile, roleInfoSource, guildData));
        }
        
        processedMembers.sort((a, b) => (a.characterNickname || a.displayName || a.uid).localeCompare(b.characterNickname || b.displayName || b.uid)); 
        setMembers(processedMembers);

      } else { 
         if (guildData.ownerId === currentUser.uid) {
            const ownerRoleInfoSource = guildData.roles?.[currentUser.uid];
            const ownerBaseProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || `Owner (${currentUser.uid.substring(0,6)})`,
                photoURL: currentUser.photoURL,
            };
            setMembers([enhanceMemberData(ownerBaseProfile, ownerRoleInfoSource, guildData)]);
         } else {
            setMembers([]);
         }
      }
    } catch (error) {
      console.error("Erro ao buscar dados da guilda e membros:", error);
      toast({ title: "Erro ao carregar dados", description: "Nao foi possivel carregar os membros da guilda.", variant: "destructive" });
    } finally {
      setLoadingGuildData(false);
    }
  }, [guildId, currentUser, router, toast]);


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
    fetchGuildAndMembers();
  }, [guildId, currentUser, authLoading, router, toast, fetchGuildAndMembers]);


  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canManageMemberRoles = useMemo(() => hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_ROLE), [currentUserRoleInfo, guild?.customRoles]);
  const canKickMembers = useMemo(() => hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_KICK), [currentUserRoleInfo, guild?.customRoles]);
  const canManageMemberStatus = useMemo(() => hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_STATUS), [currentUserRoleInfo, guild?.customRoles]);
  const canManageMemberNotes = useMemo(() => hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.MANAGE_MEMBERS_EDIT_NOTES), [currentUserRoleInfo, guild?.customRoles]);
  const canViewDetailedMemberInfo = useMemo(() => hasPermission(currentUserRoleInfo?.roleName, guild?.customRoles, GuildPermission.VIEW_MEMBER_DETAILED_INFO), [currentUserRoleInfo, guild?.customRoles]);


  const availableRoleNamesForChange = useMemo(() => {
    if (!guild || !guild.customRoles) return [];
    const defaultRoles = ["Membro"];
    if (guild.customRoles["Lider"]) defaultRoles.unshift("Lider");
    
    return [...new Set([...defaultRoles, ...Object.keys(guild.customRoles)])]
           .filter(roleName => roleName !== "Lider" || (actionUser?.uid === guild.ownerId)) 
           .sort();
  }, [guild, actionUser]);


  const openActionDialog = (member: GuildMember, type: MemberManagementAction) => {
    setActionUser(member);
    setActionType(type);
    setSelectedNewRoleName(''); 
    setSelectedNewStatus('');
  };

  const closeActionDialog = () => {
    setActionUser(null);
    setActionType(null);
    setIsProcessingAction(false);
  };

  const handleChangeRole = async () => {
    if (!actionUser || !guild || selectedNewRoleName === '' || !guildId || !currentUser || !canManageMemberRoles) return;
    
    if (actionUser.uid === guild.ownerId && selectedNewRoleName !== "Lider") {
        toast({ title: "Acao Invalida", description: "O cargo do fundador da guilda (Lider) nao pode ser alterado para outro cargo aqui.", variant: "destructive" });
        return;
    }
    if (selectedNewRoleName === "Lider" && actionUser.uid !== guild.ownerId) {
        toast({ title: "Acao Invalida", description: "Para transferir a lideranca, use uma funcionalidade especifica.", variant: "destructive" });
        return;
    }

    const oldRoleName = actionUser.roleName;
    setIsProcessingAction(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const existingRoleInfo = guild.roles?.[actionUser.uid] || { roleName: "Membro", status: 'Ativo', dkpBalance: 0 }; 
      
      const newRoleInfoPayload: GuildMemberRoleInfo = { 
        ...existingRoleInfo, 
        roleName: selectedNewRoleName 
      };

      await updateDoc(guildRef, { [`roles.${actionUser.uid}`]: newRoleInfoPayload });
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_ROLE_CHANGED, { 
        targetUserId: actionUser.uid, targetUserDisplayName: actionUser.characterNickname || actionUser.displayName,
        oldValue: oldRoleName, newValue: selectedNewRoleName, changedField: 'roleName'
      });
      toast({ title: "Cargo Atualizado!", description: `${actionUser.characterNickname || actionUser.displayName} agora e ${selectedNewRoleName}.` });
      fetchGuildAndMembers(); 
      closeActionDialog();
    } catch (error) {
      console.error("Erro ao mudar cargo:", error);
      toast({ title: "Erro ao Mudar Cargo", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleChangeStatus = async (memberToUpdate?: GuildMember, newStatus?: MemberStatus) => {
    const targetMember = memberToUpdate || actionUser;
    const statusToSet = newStatus || selectedNewStatus;

    if (!targetMember || !guild || statusToSet === '' || !guildId || !currentUser || !canManageMemberStatus) return;
    
    if(targetMember.uid === guild.ownerId && targetMember.roleName === "Lider" && statusToSet === 'Inativo') {
        toast({ title: "Acao Invalida", description: "O Lider da guilda nao pode definir seu proprio status como Inativo diretamente aqui.", variant: "destructive" });
        closeActionDialog(); 
        return;
    }
    const oldStatus = targetMember.status;
    setIsProcessingAction(true);
    try {
        const guildRef = doc(db, "guilds", guildId);
        const existingRoleInfo = guild.roles?.[targetMember.uid] || { roleName: targetMember.roleName, status: 'Ativo', dkpBalance: 0 };
        
        let updatedRoleInfoPayload: GuildMemberRoleInfo = { 
          ...existingRoleInfo, 
          status: statusToSet 
        };

        await updateDoc(guildRef, { [`roles.${targetMember.uid}`]: updatedRoleInfoPayload });
        
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_STATUS_CHANGED, {
            targetUserId: targetMember.uid,
            targetUserDisplayName: targetMember.characterNickname || targetMember.displayName,
            oldValue: oldStatus,
            newValue: statusToSet,
            changedField: 'status'
        });

        toast({ title: "Status Atualizado!", description: `O status de ${targetMember.characterNickname || targetMember.displayName} foi alterado para ${displayMemberStatus(statusToSet)}.` });
        fetchGuildAndMembers(); 
        closeActionDialog();
    } catch (error) {
        console.error("Erro ao mudar status:", error);
        toast({ title: "Erro ao Mudar Status", variant: "destructive" });
    } finally {
        setIsProcessingAction(false);
    }
  };

  const handleKickMember = async () => {
    if (!actionUser || !guild || !guildId || !currentUser || !canKickMembers) return;
    
    if (actionUser.uid === guild.ownerId) {
         toast({ title: "Acao Invalida", description: "O Lider (fundador) nao pode ser expulso.", variant: "destructive" });
        return;
    }
    const kickedUserRoleName = actionUser.roleName;
    setIsProcessingAction(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const batch = writeBatch(db);
      batch.update(guildRef, {
        memberIds: arrayRemove(actionUser.uid),
        memberCount: firebaseIncrement(-1),
        [`roles.${actionUser.uid}`]: deleteField()
      });
      await batch.commit();
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_KICKED, { 
        targetUserId: actionUser.uid, targetUserDisplayName: actionUser.characterNickname || actionUser.displayName,
        kickedUserRoleName: kickedUserRoleName 
      });
      toast({ title: "Membro Removido", description: `${actionUser.characterNickname || actionUser.displayName} foi removido.` });
      fetchGuildAndMembers();
      closeActionDialog();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({ title: "Erro ao Remover Membro", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenNotesDialog = (member: GuildMember) => {
    if (!canManageMemberNotes) {
        toast({title: "Permissao Negada", description: "Voce nao tem permissao para gerenciar notas.", variant: "destructive"});
        return;
    }
    setMemberForNotes(member);
    setCurrentNote(member.notes || "");
    setShowNotesDialog(true);
  };

  const handleSaveNote = async () => {
    if (!memberForNotes || !guild || !guildId || !currentUser || !canManageMemberNotes) return;
    setIsSavingNote(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const existingRoleInfo = guild.roles?.[memberForNotes.uid] || { roleName: memberForNotes.roleName, status: 'Ativo', dkpBalance: 0 };

      let updatedRoleInfoPayload: GuildMemberRoleInfo = { 
        ...existingRoleInfo, 
        notes: currentNote 
      };

      await updateDoc(guildRef, { [`roles.${memberForNotes.uid}`]: updatedRoleInfoPayload });
      
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_NOTE_UPDATED, {
        targetUserId: memberForNotes.uid,
        targetUserDisplayName: memberForNotes.characterNickname || memberForNotes.displayName,
        noteSummary: currentNote ? "Nota atualizada" : "Nota removida",
        changedField: 'notes'
      });

      toast({ title: "Nota Salva!", description: `Nota para ${memberForNotes.characterNickname || memberForNotes.displayName} foi salva.` });
      fetchGuildAndMembers(); 
      setShowNotesDialog(false);
      setMemberForNotes(null);
    } catch (error) {
      console.error("Erro ao salvar nota:", error);
      toast({ title: "Erro ao Salvar Nota", variant: "destructive" });
    } finally {
      setIsSavingNote(false);
    }
  };
  
  const handleViewMemberDetails = (member: GuildMember) => {
    if (canViewDetailedMemberInfo) {
      setSelectedMemberForDetails(member);
      setShowMemberDetailsDialog(true);
    } else {
      toast({ title: "Permissão Negada", description: "Você não tem permissão para ver detalhes dos membros.", variant: "destructive" });
    }
  };


  const getRoleIcon = (roleName: string) => {
    if (roleName === "Lider") return <Crown className="h-5 w-5 text-yellow-400" />;
    return <User className="h-5 w-5 text-muted-foreground" />;
  };

  const getTLRoleStyling = (role?: TLRole): string => {
    if (!role) return "";
    switch (role) {
      case TLRole.Tank: return "text-sky-500";
      case TLRole.Healer: return "text-emerald-500";
      case TLRole.DPS: return "text-rose-500";
      default: return "";
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
    if (checked) {
      paginatedMembers.forEach(member => newSelectedRows[member.uid] = true); 
    }
    setSelectedRows(newSelectedRows);
  };

  const handleSelectRow = (uid: string, checked: boolean) => {
    setSelectedRows(prev => ({ ...prev, [uid]: checked }));
  };

  const filteredAndSortedMembers = useMemo(() => {
    let tempMembers = [...members];

    if (usernameFilter) {
        tempMembers = tempMembers.filter(member => 
            (member.characterNickname || member.displayName || member.email || "").toLowerCase().includes(usernameFilter.toLowerCase())
        );
    }
    if (guild?.game === "Throne and Liberty" && tlRoleFilter !== "all") {
        tempMembers = tempMembers.filter(member => member.tlRole === tlRoleFilter);
    }
    if (rankFilter !== "all") {
        tempMembers = tempMembers.filter(member => member.roleName === rankFilter);
    }
    if (statusFilter !== "all") {
        tempMembers = tempMembers.filter(member => member.status === statusFilter);
    }

    if (gearSortOrder !== "default") {
        tempMembers.sort((a, b) => {
            const gearA = a.gearScore || 0;
            const gearB = b.gearScore || 0;
            return gearSortOrder === "asc" ? gearA - gearB : gearB - gearA;
        });
    }
    if (dkpSortOrder !== "default") {
        tempMembers.sort((a, b) => {
            const dkpA = a.dkpBalance || 0;
            const dkpB = b.dkpBalance || 0;
            return dkpSortOrder === "asc" ? dkpA - dkpB : dkpB - dkpA;
        });
    }
    
    return tempMembers;
  }, [members, usernameFilter, tlRoleFilter, rankFilter, statusFilter, gearSortOrder, dkpSortOrder, guild?.game]);


  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedMembers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedMembers, currentPage, rowsPerPage]);

  const totalFilteredMembers = filteredAndSortedMembers.length;
  const totalPages = Math.ceil(totalFilteredMembers / rowsPerPage);


  if (loadingGuildData || authLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3 mb-6" /> 
        <Skeleton className="h-28 w-full" /> 
        <Skeleton className="h-16 w-full" /> 
        <Skeleton className="h-12 w-full" /> 
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)} 
      </div>
    );
  }
  
  if (!guild) {
    return <div className="p-6 text-center">Guilda nao carregada ou nao encontrada.</div>;
  }
  
  const isTLGuild = guild.game === "Throne and Liberty";


  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageTitle title={`Membros de ${guild.name}`} icon={<Users className="h-8 w-8 text-primary" />} />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4 bg-card rounded-lg shadow items-end">
        <div className="xl:col-span-2">
          <Label htmlFor="usernameFilter" className="block text-sm font-medium text-muted-foreground mb-1">Usuario</Label>
          <Input id="usernameFilter" placeholder="Filtrar por nome..." value={usernameFilter} onChange={(e) => {setUsernameFilter(e.target.value); setCurrentPage(1);}} className="form-input"/>
        </div>

        {isTLGuild && (
          <div>
            <Label htmlFor="tlRoleFilter" className="block text-sm font-medium text-muted-foreground mb-1">Funcao (TL)</Label>
            <Select value={tlRoleFilter} onValueChange={(value) => { setTlRoleFilter(value as TLRole | "all"); setCurrentPage(1); }}>
              <SelectTrigger id="tlRoleFilter" className="form-input"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.values(TLRole).map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="gearSortOrder" className="block text-sm font-medium text-muted-foreground mb-1">Gear</Label>
          <Select value={gearSortOrder} onValueChange={(value) => { setGearSortOrder(value as GearSortOrder); setCurrentPage(1); }}>
            <SelectTrigger id="gearSortOrder" className="form-input"><SelectValue placeholder="Padrao" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrao</SelectItem>
              <SelectItem value="asc">Menor para Maior</SelectItem>
              <SelectItem value="desc">Maior para Menor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rankFilter" className="block text-sm font-medium text-muted-foreground mb-1">Cargo</Label>
          <Select value={rankFilter} onValueChange={(value) => { setRankFilter(value as string | "all"); setCurrentPage(1); }}>
            <SelectTrigger id="rankFilter" className="form-input"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {guild.customRoles && Object.keys(guild.customRoles).sort().map(roleName => <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="dkpSortOrder" className="block text-sm font-medium text-muted-foreground mb-1">Balanco DKP</Label>
          <Select value={dkpSortOrder} onValueChange={(value) => { setDkpSortOrder(value as DkpSortOrder); setCurrentPage(1); }}>
            <SelectTrigger id="dkpSortOrder" className="form-input"><SelectValue placeholder="Padrao" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrao</SelectItem>
              <SelectItem value="asc">Menor para Maior</SelectItem>
              <SelectItem value="desc">Maior para Menor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Status</Label>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as MemberStatus | "all"); setCurrentPage(1); }}>
            <SelectTrigger id="statusFilter" className="form-input"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(['Ativo', 'Inativo', 'Licenca'] as MemberStatus[]).map(statusVal => 
                <SelectItem key={statusVal} value={statusVal}>{displayMemberStatus(statusVal)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="xl:col-span-3">
          <Label htmlFor="activityDateRange" className="block text-sm font-medium text-muted-foreground mb-1">Intervalo de Atividade</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button id="activityDateRange" variant="outline" className={cn("w-full justify-start text-left font-normal form-input",!activityDateRange?.from && "text-muted-foreground")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                {activityDateRange?.from ? (activityDateRange.to ? (<>{format(activityDateRange.from, "dd/MM/yy", {locale:ptBR})} - {format(activityDateRange.to, "dd/MM/yy", {locale:ptBR})}</>) : format(activityDateRange.from, "dd/MM/yy", {locale:ptBR})) : (<span>Escolha um intervalo</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card" align="start">
              <Calendar initialFocus mode="range" defaultMonth={activityDateRange?.from} selected={activityDateRange} onSelect={(range) => { setActivityDateRange(range); setCurrentPage(1); }} numberOfMonths={2} locale={ptBR}/>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 gap-2 xl:col-span-2">
            <div>
              <Label htmlFor="timeFromFilter" className="block text-sm font-medium text-muted-foreground mb-1">De</Label>
              <Input id="timeFromFilter" type="time" value={timeFromFilter} onChange={e => { setTimeFromFilter(e.target.value); setCurrentPage(1); }} className="form-input" />
            </div>
            <div>
              <Label htmlFor="timeToFilter" className="block text-sm font-medium text-muted-foreground mb-1">Ate</Label>
              <Input id="timeToFilter" type="time" value={timeToFilter} onChange={e => { setTimeToFilter(e.target.value); setCurrentPage(1);}} className="form-input" />
            </div>
        </div>

         <div className="xl:col-span-1 flex justify-end items-end gap-2">
            <Button variant="outline" disabled className="w-full"><Filter className="mr-2 h-4 w-4" /> Aplicar</Button>
        </div>
      </div>


      <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="selectAllRows" 
            aria-label="Selecionar todas as linhas visiveis"
            checked={paginatedMembers.length > 0 && numSelectedRows === paginatedMembers.length}
            onCheckedChange={(checked) => handleSelectAllRows(Boolean(checked))}
            disabled={paginatedMembers.length === 0}
          />
          {numSelectedRows > 0 && <span className="text-sm text-muted-foreground">{numSelectedRows} de {paginatedMembers.length} linha(s) visiveis selecionada(s)</span>}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={numSelectedRows === 0}>Acoes <MoreVertical className="ml-2 h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Promover Selecionados</DropdownMenuItem>
              <DropdownMenuItem disabled>Rebaixar Selecionados</DropdownMenuItem>
              <DropdownMenuItem disabled>Alterar Status Selecionados</DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem className="text-destructive focus:text-destructive" disabled>Remover Selecionados</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" disabled><SlidersHorizontal className="mr-2 h-4 w-4" /> Filtros Avancados</Button>
          <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Exportar</Button>
        </div>
      </div>
      
      <div className="overflow-x-auto bg-card p-2 rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                    checked={paginatedMembers.length > 0 && numSelectedRows === paginatedMembers.length}
                    onCheckedChange={(checked) => handleSelectAllRows(Boolean(checked))}
                    aria-label="Selecionar todas as linhas visiveis"
                    disabled={paginatedMembers.length === 0}
                />
              </TableHead>
              <TableHead>Usuario <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              {isTLGuild && <TableHead>Funcao <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>}
              <TableHead>Armas</TableHead>
              <TableHead>Gear <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              <TableHead>Cargo <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              <TableHead>Balanco DKP <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              {canManageMemberNotes && <TableHead>Nota</TableHead>}
              <TableHead>Status <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              <TableHead className="text-right w-[120px]">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={isTLGuild ? (canManageMemberNotes ? 10 : 9) : (canManageMemberNotes ? 9 : 8)} className="text-center h-24">
                  Nenhum membro encontrado {usernameFilter || tlRoleFilter !== "all" || rankFilter !== "all" || statusFilter !== "all" ? "com os filtros aplicados." : "nesta guilda."}
                </TableCell>
              </TableRow>
            )}
            {paginatedMembers.map((member) => {
              const isCurrentUserTarget = member.uid === currentUser?.uid;
              const isGuildOwnerTarget = member.uid === guild?.ownerId;
              const displayName = member.characterNickname || member.displayName || member.email || member.uid;

              return (
                <TableRow key={member.uid} data-state={selectedRows[member.uid] ? "selected" : ""}>
                  <TableCell>
                    <div className="flex items-center">
                      <Checkbox checked={selectedRows[member.uid] || false} onCheckedChange={(checked) => handleSelectRow(member.uid, Boolean(checked))} aria-label={`Selecionar ${displayName}`}/>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div 
                      className={cn("flex items-center gap-2 font-medium", canViewDetailedMemberInfo && "cursor-pointer hover:text-primary transition-colors")}
                      onClick={() => handleViewMemberDetails(member)}
                      title={canViewDetailedMemberInfo ? "Ver detalhes do membro" : ""}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoURL || `https://placehold.co/40x40.png?text=${displayName?.substring(0,1) || 'M'}`} alt={displayName || 'Avatar'} data-ai-hint="user avatar"/>
                        <AvatarFallback>{displayName?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback>
                      </Avatar>
                      {displayName}
                    </div>
                  </TableCell>

                  {isTLGuild && (
                    <TableCell>
                      <div className={cn("flex items-center gap-1", getTLRoleStyling(member.tlRole))}>
                        {getTLRoleIcon(member.tlRole)}
                        {member.tlRole || "N/A"}
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {member.weapons?.mainHandIconUrl && <Image src={member.weapons.mainHandIconUrl} alt={member.tlPrimaryWeapon || "Arma Principal"} width={24} height={24} data-ai-hint="weapon sword"/>}
                      {member.weapons?.offHandIconUrl && <Image src={member.weapons.offHandIconUrl} alt={member.tlSecondaryWeapon || "Arma Secundaria"} width={24} height={24} data-ai-hint="weapon shield"/>}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {member.gearScore}
                      {member.gearScoreScreenshotUrl && 
                        <a href={member.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer" title="Ver screenshot do gearscore">
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                        </a>
                      }
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(member.roleName)}
                      {member.roleName}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {member.dkpBalance ?? 0} <Eye className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                    </div>
                  </TableCell>

                  {canManageMemberNotes && (
                    <TableCell>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenNotesDialog(member)}>
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">Ver/Editar Nota</span>
                        </Button>
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                     <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(member.status))}>
                       <div className="flex items-center gap-1">
                        {getStatusIcon(member.status)}
                        {displayMemberStatus(member.status)}
                       </div>
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewMemberDetails(member)} disabled={!canViewDetailedMemberInfo}>
                        <Search className="h-4 w-4" />
                        <span className="sr-only">Ver Detalhes</span>
                      </Button>
                      {!isCurrentUserTarget && ( 
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" 
                              disabled={isGuildOwnerTarget && member.roleName === "Lider" && !canManageMemberStatus} 
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Acoes do membro</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Gerenciar Membro</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {canManageMemberRoles && !(isGuildOwnerTarget && member.roleName === "Lider") && (
                              <DropdownMenuItem onSelect={() => openActionDialog(member, "changeRole")} disabled={isGuildOwnerTarget && member.roleName === "Lider"}>
                                  <UserCog className="mr-2 h-4 w-4" /> Alterar Cargo
                              </DropdownMenuItem>
                            )}
                             {canManageMemberStatus && (
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={isGuildOwnerTarget && member.roleName === "Lider" && member.status === "Ativo"}>
                                        <UserCog className="mr-2 h-4 w-4" />Alterar Status
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        {(['Ativo', 'Inativo', 'Licenca'] as MemberStatus[]).filter(s => s !== member.status).map(statusOption => (
                                            <DropdownMenuItem key={statusOption} onSelect={() => { setSelectedNewStatus(statusOption); handleChangeStatus(member, statusOption); }}
                                                disabled={isGuildOwnerTarget && member.roleName === "Lider" && statusOption === 'Inativo'}>
                                                {getStatusIcon(statusOption)} {displayMemberStatus(statusOption)}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            )}
                            {canKickMembers && !isGuildOwnerTarget && ( 
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => openActionDialog(member, "kick")}>
                                <UserX className="mr-2 h-4 w-4" /> Remover da Guilda
                              </DropdownMenuItem>
                            )}
                            {isGuildOwnerTarget && member.roleName === "Lider" && !canManageMemberStatus && !canManageMemberRoles && !canKickMembers && (
                               <DropdownMenuItem disabled>Nenhuma acao disponivel</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow mt-4">
        <div className="text-sm text-muted-foreground">
            {numSelectedRows > 0 ? `${numSelectedRows} de ${paginatedMembers.length} linha(s) visiveis selecionada(s).` : `${totalFilteredMembers} membro(s) no total.`}
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Linhas/pag:</span>
                <Select value={rowsPerPage.toString()} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1);}}>
                    <SelectTrigger className="w-[70px] h-8 text-xs form-input">
                        <SelectValue placeholder={rowsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 25, 50, 100].map(size => <SelectItem key={size} value={size.toString()} className="text-xs">{size}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <span className="text-sm text-muted-foreground">Pagina {totalPages > 0 ? currentPage : 0} de {totalPages}</span>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || totalPages === 0}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || totalPages === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
        </div>
      </div>

      {memberForNotes && (
        <Dialog open={showNotesDialog} onOpenChange={(isOpen) => { if (!isOpen) { setShowNotesDialog(false); setMemberForNotes(null); } }}>
          <NotesDialogContent className="sm:max-w-md">
            <NotesDialogHeader>
              <NotesDialogTitle>Nota para {memberForNotes.characterNickname || memberForNotes.displayName}</NotesDialogTitle>
              <NotesDialogDescription>
                Adicione ou edite uma nota sobre este membro. Visivel apenas para quem tem permissao.
              </NotesDialogDescription>
            </NotesDialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Escreva sua nota aqui..."
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                rows={5}
                className="form-input"
              />
            </div>
            <NotesDialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNotesDialog(false)} disabled={isSavingNote}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveNote} disabled={isSavingNote} className="btn-gradient btn-style-primary">
                {isSavingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Nota
              </Button>
            </NotesDialogFooter>
          </NotesDialogContent>
        </Dialog>
      )}

      {selectedMemberForDetails && (
        <MemberDetailsDialog open={showMemberDetailsDialog} onOpenChange={setShowMemberDetailsDialog}>
            <MemberDetailsDialogContent className="sm:max-w-lg">
                <MemberDetailsDialogHeader>
                    <MemberDetailsDialogTitle className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                           <AvatarImage src={selectedMemberForDetails.photoURL || `https://placehold.co/40x40.png?text=${(selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName)?.substring(0,1) || 'M'}`} alt={selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName || 'Avatar'} data-ai-hint="user avatar"/>
                           <AvatarFallback>{(selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName)?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback>
                        </Avatar>
                        Detalhes de {selectedMemberForDetails.characterNickname || selectedMemberForDetails.displayName}
                    </MemberDetailsDialogTitle>
                    <MemberDetailsDialogDescription>
                        Informações específicas do membro na guilda.
                    </MemberDetailsDialogDescription>
                </MemberDetailsDialogHeader>
                <div className="py-4 space-y-3">
                    <p><strong>Nickname na Guilda:</strong> {selectedMemberForDetails.characterNickname || "N/A"}</p>
                    <p><strong>Gearscore:</strong> {selectedMemberForDetails.gearScore ?? "N/A"}</p>
                    {selectedMemberForDetails.gearScoreScreenshotUrl ? (
                        <p><strong>Print do Gearscore:</strong> <Link href={selectedMemberForDetails.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Screenshot <Eye className="inline h-4 w-4 ml-1"/></Link></p>
                    ) : <p><strong>Print do Gearscore:</strong> N/A</p>}
                    {selectedMemberForDetails.gearBuildLink ? (
                        <p><strong>Gear Build Link:</strong> <Link href={selectedMemberForDetails.gearBuildLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Build de Equipamento <LinkIcon className="inline h-4 w-4 ml-1"/></Link></p>
                    ) : <p><strong>Gear Build Link:</strong> N/A</p>}
                    {selectedMemberForDetails.skillBuildLink ? (
                        <p><strong>Skill Build Link:</strong> <Link href={selectedMemberForDetails.skillBuildLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver Build de Habilidades <LinkIcon className="inline h-4 w-4 ml-1"/></Link></p>
                    ) : <p><strong>Skill Build Link:</strong> N/A</p>}

                    {isTLGuild && (
                        <>
                            <hr className="my-3 border-border"/>
                            <p className="flex items-center gap-1"><strong>Função (TL):</strong> {getTLRoleIcon(selectedMemberForDetails.tlRole)} {selectedMemberForDetails.tlRole || "N/A"}</p>
                            <div className="flex items-center gap-2">
                                <strong>Armas (TL):</strong>
                                {selectedMemberForDetails.weapons?.mainHandIconUrl && <Image src={selectedMemberForDetails.weapons.mainHandIconUrl} alt={selectedMemberForDetails.tlPrimaryWeapon || "Arma Principal"} width={24} height={24} data-ai-hint="weapon sword"/>}
                                {selectedMemberForDetails.weapons?.offHandIconUrl && <Image src={selectedMemberForDetails.weapons.offHandIconUrl} alt={selectedMemberForDetails.tlSecondaryWeapon || "Arma Secundaria"} width={24} height={24} data-ai-hint="weapon shield"/>}
                                {!selectedMemberForDetails.weapons?.mainHandIconUrl && !selectedMemberForDetails.weapons?.offHandIconUrl && "N/A"}
                            </div>
                            {selectedMemberForDetails.tlPrimaryWeapon && <p className="text-sm text-muted-foreground ml-4">- {selectedMemberForDetails.tlPrimaryWeapon}</p>}
                            {selectedMemberForDetails.tlSecondaryWeapon && <p className="text-sm text-muted-foreground ml-4">- {selectedMemberForDetails.tlSecondaryWeapon}</p>}
                        </>
                    )}
                </div>
                <MemberDetailsDialogFooter>
                    <Button variant="outline" onClick={() => setShowMemberDetailsDialog(false)}>Fechar</Button>
                </MemberDetailsDialogFooter>
            </MemberDetailsDialogContent>
        </MemberDetailsDialog>
      )}


      <AlertDialog open={actionType === 'changeRole' && !!actionUser} onOpenChange={(isOpen) => !isOpen && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Cargo de {actionUser?.characterNickname || actionUser?.displayName}</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo cargo para este membro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedNewRoleName} onValueChange={(value) => setSelectedNewRoleName(value as string)}>
              <SelectTrigger className="form-input">
                <SelectValue placeholder="Selecione um novo cargo" />
              </SelectTrigger>
              <SelectContent>
                {availableRoleNamesForChange.filter(roleName => roleName !== actionUser?.roleName).map(roleName => (
                  <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeActionDialog} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangeRole} disabled={isProcessingAction || !selectedNewRoleName}>
              {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Mudanca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === 'kick' && !!actionUser} onOpenChange={(isOpen) => !isOpen && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {actionUser?.characterNickname || actionUser?.displayName} da Guilda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao e irreversivel. O membro sera removido da guilda e perdera seu cargo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeActionDialog} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKickMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessingAction}
            >
              {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Remocao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <MembersPageContent />
    </Suspense>
  );
}

