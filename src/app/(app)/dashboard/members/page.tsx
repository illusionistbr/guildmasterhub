
"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, arrayRemove, increment as firebaseIncrement, deleteField, collection, writeBatch } from '@/lib/firebase';
import { type Guild, type GuildMember, type UserProfile, GuildRole, AuditActionType, TLRole, TLWeapon, type GuildMemberRoleInfo } from '@/types/guildmaster';
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
  DialogClose,
  DialogContent as NotesDialogContent, // Renamed to avoid conflict
  DialogDescription as NotesDialogDescription,
  DialogFooter as NotesDialogFooter,
  DialogHeader as NotesDialogHeader,
  DialogTitle as NotesDialogTitle,
  DialogTrigger as NotesDialogTrigger,
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
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ShieldAlert, Heart, Swords, Wand2, Crosshair, Gamepad2
} from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { useHeader } from '@/contexts/HeaderContext';

type MemberManagementAction = "changeRole" | "kick";

const getWeaponIconPath = (weapon?: TLWeapon): string => {
  if (!weapon) return "https://placehold.co/32x32.png?text=N/A";
  switch (weapon) {
    case TLWeapon.SwordAndShield: return "https://i.imgur.com/jPEqyNb.png";
    case TLWeapon.Greatsword: return "https://i.imgur.com/Tf1LymG.png";
    case TLWeapon.Daggers: return "https://i.imgur.com/CEM1Oij.png";
    case TLWeapon.Crossbow: return "https://i.imgur.com/u7pqt5H.png";
    case TLWeapon.Bow: return "https://i.imgur.com/73c5Rl4.png";
    case TLWeapon.Staff: return "https://i.imgur.com/wgjWVvI.png";
    case TLWeapon.WandAndTome: return "https://i.imgur.com/BdYPLee.png"; // Assuming "Wand" for "WandAndTome"
    case TLWeapon.Spear: return "https://i.imgur.com/l2oHYwY.png";
    default: return "https://placehold.co/32x32.png?text=WPN";
  }
};

const enhanceMemberData = (member: GuildMember, guildGame?: string): GuildMember => {
  const isTLGuild = guildGame === "Throne and Liberty";
  return {
    ...member,
    weapons: { 
      mainHandIconUrl: member.tlPrimaryWeapon ? getWeaponIconPath(member.tlPrimaryWeapon) : `https://placehold.co/32x32.png?text=MH`,
      offHandIconUrl: member.tlSecondaryWeapon ? getWeaponIconPath(member.tlSecondaryWeapon) : `https://placehold.co/32x32.png?text=OH`
    },
    gearScore: member.gearScore ?? Math.floor(3800 + Math.random() * 500),
    activityPoints: member.activityPoints ?? Math.floor(Math.random() * 100),
    dkpBalance: member.dkpBalance ?? Math.floor(Math.random() * 500),
    status: member.status ?? (Math.random() > 0.2 ? 'Ativo' : 'Inativo'),
    tlRole: isTLGuild ? member.tlRole : undefined,
    tlPrimaryWeapon: isTLGuild ? member.tlPrimaryWeapon : undefined,
    tlSecondaryWeapon: isTLGuild ? member.tlSecondaryWeapon : undefined,
    notes: member.notes ?? "",
  };
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
  const [selectedNewRole, setSelectedNewRole] = useState<GuildRole | ''>('');

  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [usernameFilter, setUsernameFilter] = useState("");
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


  const guildId = searchParams.get('guildId');

  useEffect(() => {
    if (guild?.name) {
        setHeaderTitle(`Membros: ${guild.name}`);
    }
    return () => setHeaderTitle(null);
  }, [guild?.name, setHeaderTitle]);


  const fetchGuildAndMembers = useCallback(async () => {
    if (!guildId || !currentUser) return;
    setLoadingGuildData(true);
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
            continue; 
          }
          
          const roleInfoSource = guildData.roles?.[uid];
          let memberSpecificData: Partial<GuildMember> = { role: GuildRole.Member }; 

          if (typeof roleInfoSource === 'object' && roleInfoSource !== null && 'generalRole' in roleInfoSource) {
            const fullRoleInfo = roleInfoSource as GuildMemberRoleInfo;
            memberSpecificData = {
              role: fullRoleInfo.generalRole,
              tlRole: guildData.game === "Throne and Liberty" ? fullRoleInfo.tlRole : undefined,
              tlPrimaryWeapon: guildData.game === "Throne and Liberty" ? fullRoleInfo.tlPrimaryWeapon : undefined,
              tlSecondaryWeapon: guildData.game === "Throne and Liberty" ? fullRoleInfo.tlSecondaryWeapon : undefined,
              notes: fullRoleInfo.notes || "",
            };
          } else if (typeof roleInfoSource === 'string') { 
            memberSpecificData.role = roleInfoSource as GuildRole;
          }
          
          processedMembers.push(enhanceMemberData({
            ...baseProfile, 
            uid: uid,
            ...memberSpecificData, 
          }, guildData.game));
        }
        
        processedMembers.sort((a, b) => (a.displayName || a.uid).localeCompare(b.displayName || b.uid)); 
        setMembers(processedMembers);

      } else { 
         if (guildData.ownerId === currentUser.uid) {
            const ownerRoleInfoSource = guildData.roles?.[currentUser.uid];
            let ownerSpecificData: Partial<GuildMember> = { role: GuildRole.Leader };
             if (typeof ownerRoleInfoSource === 'object' && ownerRoleInfoSource !== null && 'generalRole' in ownerRoleInfoSource) {
                const fullRoleInfo = ownerRoleInfoSource as GuildMemberRoleInfo;
                ownerSpecificData = {
                    role: fullRoleInfo.generalRole, 
                    tlRole: guildData.game === "Throne and Liberty" ? fullRoleInfo.tlRole : undefined,
                    tlPrimaryWeapon: guildData.game === "Throne and Liberty" ? fullRoleInfo.tlPrimaryWeapon : undefined,
                    tlSecondaryWeapon: guildData.game === "Throne and Liberty" ? fullRoleInfo.tlSecondaryWeapon : undefined,
                    notes: fullRoleInfo.notes || "",
                };
            } else if (typeof ownerRoleInfoSource === 'string') {
                ownerSpecificData.role = ownerRoleInfoSource as GuildRole;
            }

            setMembers([enhanceMemberData({
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || `Owner (${currentUser.uid.substring(0,6)})`,
                photoURL: currentUser.photoURL,
                ...ownerSpecificData,
            }, guildData.game)]);
         } else {
            setMembers([]);
         }
      }
    } catch (error) {
      console.error("Erro ao buscar dados da guilda e membros:", error);
      toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar os membros da guilda.", variant: "destructive" });
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


  const currentUserRoleInGuild = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    const roleInfo = guild.roles[currentUser.uid];
    if (typeof roleInfo === 'object' && roleInfo !== null && 'generalRole' in roleInfo) {
      return (roleInfo as GuildMemberRoleInfo).generalRole;
    }
    return roleInfo as GuildRole | null; 
  }, [currentUser, guild]);


  const canManageMember = (targetMemberRole: GuildRole): { canChangeRole: boolean, canKick: boolean } => {
    if (!currentUserRoleInGuild || !guild) return { canChangeRole: false, canKick: false };
    if (currentUserRoleInGuild === GuildRole.Leader) {
      return { canChangeRole: targetMemberRole !== GuildRole.Leader, canKick: targetMemberRole !== GuildRole.Leader };
    }
    if (currentUserRoleInGuild === GuildRole.ViceLeader) {
      const isLowerRank = [GuildRole.Counselor, GuildRole.Officer, GuildRole.Member].includes(targetMemberRole);
      return { canChangeRole: isLowerRank, canKick: isLowerRank && targetMemberRole !== GuildRole.Leader };
    }
    return { canChangeRole: false, canKick: false };
  };
  
  const availableRolesForChange = (targetMemberRole: GuildRole): GuildRole[] => {
    if (!currentUserRoleInGuild) return [];
    if (currentUserRoleInGuild === GuildRole.Leader) {
        if (targetMemberRole === GuildRole.Leader) return [];
        return [GuildRole.ViceLeader, GuildRole.Counselor, GuildRole.Officer, GuildRole.Member].filter(r => r !== targetMemberRole);
    }
    if (currentUserRoleInGuild === GuildRole.ViceLeader) {
        if ([GuildRole.Leader, GuildRole.ViceLeader].includes(targetMemberRole)) return [];
        return [GuildRole.Counselor, GuildRole.Officer, GuildRole.Member].filter(r => r !== targetMemberRole);
    }
    return [];
  };

  const openActionDialog = (member: GuildMember, type: MemberManagementAction) => {
    setActionUser(member);
    setActionType(type);
    setSelectedNewRole(''); 
  };

  const closeActionDialog = () => {
    setActionUser(null);
    setActionType(null);
    setIsProcessingAction(false);
  };

  const handleChangeRole = async () => {
    if (!actionUser || !guild || selectedNewRole === '' || !guildId || !currentUser) return;
    const oldRole = actionUser.role;
    if (actionUser.uid === guild.ownerId && selectedNewRole !== GuildRole.Leader) {
        toast({ title: "Ação Inválida", description: "O Líder não pode ser rebaixado. Use a transferência de liderança.", variant: "destructive" });
        return;
    }
     if (selectedNewRole === GuildRole.Leader && actionUser.uid !== guild.ownerId) {
        toast({ title: "Ação Inválida", description: "Use a transferência de liderança para nomear um novo Líder.", variant: "destructive" });
        return;
    }

    setIsProcessingAction(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const existingRoleInfo = guild.roles?.[actionUser.uid];
      let newRoleInfoPayload: GuildMemberRoleInfo;

      if (typeof existingRoleInfo === 'object' && existingRoleInfo !== null && 'generalRole' in existingRoleInfo) {
        newRoleInfoPayload = { ...(existingRoleInfo as GuildMemberRoleInfo), generalRole: selectedNewRole };
      } else { 
        newRoleInfoPayload = {
          generalRole: selectedNewRole,
          tlRole: actionUser.tlRole, 
          tlPrimaryWeapon: actionUser.tlPrimaryWeapon, 
          tlSecondaryWeapon: actionUser.tlSecondaryWeapon, 
          notes: actionUser.notes || "", 
        };
      }

      await updateDoc(guildRef, { [`roles.${actionUser.uid}`]: newRoleInfoPayload });
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_ROLE_CHANGED, { 
        targetUserId: actionUser.uid, targetUserDisplayName: actionUser.displayName || actionUser.email || actionUser.uid,
        oldValue: oldRole, newValue: selectedNewRole 
      });
      toast({ title: "Cargo Atualizado!", description: `${actionUser.displayName} agora é ${selectedNewRole}.` });
      fetchGuildAndMembers(); 
      closeActionDialog();
    } catch (error) {
      console.error("Erro ao mudar cargo:", error);
      toast({ title: "Erro ao Mudar Cargo", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleKickMember = async () => {
    if (!actionUser || !guild || !guildId || !currentUser) return;
    const kickedUserRole = actionUser.role;
    if (actionUser.uid === guild.ownerId) {
         toast({ title: "Ação Inválida", description: "O Líder não pode ser expulso.", variant: "destructive" });
        return;
    }
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
        targetUserId: actionUser.uid, targetUserDisplayName: actionUser.displayName || actionUser.email || actionUser.uid,
        kickedUserRole: kickedUserRole 
      });
      toast({ title: "Membro Removido", description: `${actionUser.displayName} foi removido.` });
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
    setMemberForNotes(member);
    setCurrentNote(member.notes || "");
    setShowNotesDialog(true);
  };

  const handleSaveNote = async () => {
    if (!memberForNotes || !guild || !guildId || !currentUser) return;
    setIsSavingNote(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      const existingRoleInfo = guild.roles?.[memberForNotes.uid];
      let updatedRoleInfoPayload: GuildMemberRoleInfo;

      if (typeof existingRoleInfo === 'object' && existingRoleInfo !== null && 'generalRole' in existingRoleInfo) {
        updatedRoleInfoPayload = { ...(existingRoleInfo as GuildMemberRoleInfo), notes: currentNote };
      } else { 
        updatedRoleInfoPayload = {
          generalRole: memberForNotes.role, 
          tlRole: memberForNotes.tlRole,
          tlPrimaryWeapon: memberForNotes.tlPrimaryWeapon,
          tlSecondaryWeapon: memberForNotes.tlSecondaryWeapon,
          notes: currentNote,
        };
      }

      await updateDoc(guildRef, { [`roles.${memberForNotes.uid}`]: updatedRoleInfoPayload });
      
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_NOTE_UPDATED, {
        targetUserId: memberForNotes.uid,
        targetUserDisplayName: memberForNotes.displayName,
        noteSummary: currentNote ? "Nota atualizada" : "Nota removida",
      });

      toast({ title: "Nota Salva!", description: `Nota para ${memberForNotes.displayName} foi salva.` });
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

  const getGeneralRoleIcon = (role: GuildRole) => {
    switch (role) {
      case GuildRole.Leader: return <Crown className="h-5 w-5 text-yellow-400" />;
      case GuildRole.ViceLeader: return <ShieldIconLucide className="h-5 w-5 text-orange-400" />;
      case GuildRole.Counselor: return <BadgeCent className="h-5 w-5 text-sky-400" />;
      case GuildRole.Officer: return <UserCog className="h-5 w-5 text-green-400" />;
      default: return <User className="h-5 w-5 text-muted-foreground" />;
    }
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
      default: return null;
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

  const paginatedMembers = useMemo(() => {
    const filtered = members.filter(member => 
        (member.displayName || member.email || "").toLowerCase().includes(usernameFilter.toLowerCase())
    );
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filtered.slice(startIndex, startIndex + rowsPerPage);
  }, [members, currentPage, rowsPerPage, usernameFilter]);

  const totalPages = Math.ceil(members.filter(member => (member.displayName || member.email || "").toLowerCase().includes(usernameFilter.toLowerCase())).length / rowsPerPage);


  if (loadingGuildData || authLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-1/3 mb-6" /> 
        <Skeleton className="h-16 w-full" /> 
        <Skeleton className="h-12 w-full" /> 
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)} 
      </div>
    );
  }
  
  if (!guild) {
    return <div className="p-6 text-center">Guilda não carregada ou não encontrada.</div>;
  }
  
  const isGuildLeaderOrVice = currentUserRoleInGuild === GuildRole.Leader || currentUserRoleInGuild === GuildRole.ViceLeader;


  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageTitle title={`Membros de ${guild.name}`} icon={<Users className="h-8 w-8 text-primary" />} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end p-4 bg-card rounded-lg shadow">
        <div>
          <label htmlFor="usernameFilter" className="block text-sm font-medium text-muted-foreground mb-1">Nome de Usuário</label>
          <Input id="usernameFilter" placeholder="Filtrar por nome..." value={usernameFilter} onChange={(e) => {setUsernameFilter(e.target.value); setCurrentPage(1);}} />
        </div>
        <div>
          <label htmlFor="activityDateRange" className="block text-sm font-medium text-muted-foreground mb-1">Intervalo de datas de atividade</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="activityDateRange"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !activityDateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {activityDateRange?.from ? (
                  activityDateRange.to ? (
                    <>
                      {format(activityDateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                      {format(activityDateRange.to, "dd/MM/yy", { locale: ptBR })}
                    </>
                  ) : (
                    format(activityDateRange.from, "dd/MM/yy", { locale: ptBR })
                  )
                ) : (
                  <span>Escolha um intervalo</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={activityDateRange?.from}
                selected={activityDateRange}
                onSelect={setActivityDateRange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="timeFromFilter" className="block text-sm font-medium text-muted-foreground mb-1">De</label>
              <Input id="timeFromFilter" type="time" value={timeFromFilter} onChange={e => setTimeFromFilter(e.target.value)} />
            </div>
            <div>
              <label htmlFor="timeToFilter" className="block text-sm font-medium text-muted-foreground mb-1">Até</label>
              <Input id="timeToFilter" type="time" value={timeToFilter} onChange={e => setTimeToFilter(e.target.value)} />
            </div>
        </div>
         <div className="lg:col-span-3 flex justify-end gap-2 items-center mt-2 lg:mt-0">
            <Button variant="outline" disabled><ShieldIconLucide className="mr-2 h-4 w-4" /> Verificar Equip.</Button>
            <Button disabled><UserPlus className="mr-2 h-4 w-4" /> Adicionar Membro</Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="selectAllRows" 
            aria-label="Selecionar todas as linhas visíveis"
            checked={paginatedMembers.length > 0 && numSelectedRows === paginatedMembers.length}
            onCheckedChange={(checked) => handleSelectAllRows(Boolean(checked))}
            disabled={paginatedMembers.length === 0}
          />
          {numSelectedRows > 0 && <span className="text-sm text-muted-foreground">{numSelectedRows} de {paginatedMembers.length} linha(s) visíveis selecionadas</span>}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={numSelectedRows === 0}>Ações <MoreVertical className="ml-2 h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Promover Selecionados</DropdownMenuItem>
              <DropdownMenuItem disabled>Rebaixar Selecionados</DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem className="text-destructive focus:text-destructive" disabled>Remover Selecionados</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" disabled><SlidersHorizontal className="mr-2 h-4 w-4" /> Filtros</Button>
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
                    aria-label="Selecionar todas as linhas visíveis"
                    disabled={paginatedMembers.length === 0}
                />
              </TableHead>
              <TableHead>Nome de Usuário <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              <TableHead>Rank <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              {guild.game === "Throne and Liberty" && <TableHead>Função (TL) <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>}
              <TableHead>Armas</TableHead>
              <TableHead>Equip. <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              <TableHead>Pontos Ativ. <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              <TableHead>Saldo DKP <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              {isGuildLeaderOrVice && <TableHead>Nota</TableHead>}
              <TableHead>Status <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
              <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={guild.game === "Throne and Liberty" ? (isGuildLeaderOrVice ? 11 : 10) : (isGuildLeaderOrVice ? 10 : 9)} className="text-center h-24">
                  Nenhum membro encontrado {usernameFilter ? "com o filtro aplicado." : "nesta guilda."}
                </TableCell>
              </TableRow>
            )}
            {paginatedMembers.map((member) => {
              const permissions = canManageMember(member.role);
              const roleOptions = availableRolesForChange(member.role);
              const isCurrentUserTarget = member.uid === currentUser?.uid;

              return (
                <TableRow key={member.uid} data-state={selectedRows[member.uid] ? "selected" : ""}>
                  <TableCell><Checkbox checked={selectedRows[member.uid] || false} onCheckedChange={(checked) => handleSelectRow(member.uid, Boolean(checked))} aria-label={`Selecionar ${member.displayName}`}/></TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.photoURL || `https://placehold.co/40x40.png?text=${member.displayName?.substring(0,1) || 'M'}`} alt={member.displayName || 'Avatar'} data-ai-hint="user avatar"/>
                      <AvatarFallback>{member.displayName?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback>
                    </Avatar>
                    {member.displayName || member.email || member.uid}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    {getGeneralRoleIcon(member.role)}
                    {member.role}
                  </TableCell>
                  {guild.game === "Throne and Liberty" && (
                    <TableCell className={cn("flex items-center gap-1", getTLRoleStyling(member.tlRole))}>
                      {getTLRoleIcon(member.tlRole)}
                      {member.tlRole || "N/A"}
                    </TableCell>
                  )}
                  <TableCell className="flex items-center gap-1">
                    {member.weapons?.mainHandIconUrl && <Image src={member.weapons.mainHandIconUrl} alt={member.tlPrimaryWeapon || "Arma Principal"} width={24} height={24} data-ai-hint="weapon sword"/>}
                    {member.weapons?.offHandIconUrl && <Image src={member.weapons.offHandIconUrl} alt={member.tlSecondaryWeapon || "Arma Secundária"} width={24} height={24} data-ai-hint="weapon shield"/>}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    {member.gearScore} <Eye className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={ (member.activityPoints ?? 0) > 50 ? "default" : ((member.activityPoints ?? 0) > 0 ? "secondary" : "destructive") } className="text-xs">
                      {member.activityPoints ?? 0} pts
                    </Badge>
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    {member.dkpBalance ?? 0} <Eye className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                  </TableCell>
                  {isGuildLeaderOrVice && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenNotesDialog(member)}>
                        <FileText className="h-4 w-4" />
                         <span className="sr-only">Ver/Editar Nota</span>
                      </Button>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={member.status === 'Ativo' ? 'outline' : 'destructive'} className={cn("text-xs", member.status === 'Ativo' && "border-green-500 text-green-500")}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled><Search className="h-4 w-4" /></Button>
                      {(!isCurrentUserTarget && (permissions.canChangeRole || permissions.canKick)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Ações do membro</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Gerenciar Membro</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {permissions.canChangeRole && roleOptions.length > 0 && (
                              <DropdownMenuItem onSelect={() => openActionDialog(member, "changeRole")}>
                                  <UserCog className="mr-2 h-4 w-4" /> Alterar Cargo Geral
                              </DropdownMenuItem>
                            )}
                            {permissions.canKick && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => openActionDialog(member, "kick")}>
                                <UserX className="mr-2 h-4 w-4" /> Remover da Guilda
                              </DropdownMenuItem>
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
            {numSelectedRows > 0 ? `${numSelectedRows} de ${paginatedMembers.length} linha(s) visíveis selecionada(s).` : `${members.filter(member => (member.displayName || member.email || "").toLowerCase().includes(usernameFilter.toLowerCase())).length} membros no total.`}
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Linhas/pág:</span>
                <Select value={rowsPerPage.toString()} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1);}}>
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                        <SelectValue placeholder={rowsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 25, 50, 100].map(size => <SelectItem key={size} value={size.toString()} className="text-xs">{size}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
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
              <NotesDialogTitle>Nota para {memberForNotes.displayName}</NotesDialogTitle>
              <NotesDialogDescription>
                Adicione ou edite uma nota sobre este membro. Visível apenas para Líderes e Vice-Líderes.
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


      <AlertDialog open={actionType === 'changeRole' && !!actionUser} onOpenChange={(isOpen) => !isOpen && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Cargo de {actionUser?.displayName}</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo cargo geral para este membro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedNewRole} onValueChange={(value) => setSelectedNewRole(value as GuildRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um novo cargo" />
              </SelectTrigger>
              <SelectContent>
                {actionUser && availableRolesForChange(actionUser.role).map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeActionDialog} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangeRole} disabled={isProcessingAction || !selectedNewRole}>
              {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Mudança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === 'kick' && !!actionUser} onOpenChange={(isOpen) => !isOpen && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {actionUser?.displayName} da Guilda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O membro será removido da guilda e perderá seu cargo.
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
              Confirmar Remoção
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
