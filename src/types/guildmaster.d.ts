"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, arrayRemove, increment as firebaseIncrement, deleteField, collection, writeBatch } from '@/lib/firebase';
import { type Guild, type GuildMember, type UserProfile, GuildRole } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  DropdownMenuPortal
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Users, MoreVertical, Trash2, ShieldCheck, UserX, UserCog, Loader2, Crown, Shield, BadgeCent, User } from 'lucide-react';

type MemberManagementAction = "changeRole" | "kick";

function MembersPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [actionUser, setActionUser] = useState<GuildMember | null>(null);
  const [actionType, setActionType] = useState<MemberManagementAction | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<GuildRole | ''>('');

  const guildId = searchParams.get('guildId');

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", description: "Nenhuma ID de guilda fornecida.", variant: "destructive" });
      router.push('/guild-selection');
      return;
    }

    const fetchGuildAndMembers = async () => {
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

        if (guildData.memberIds && guildData.memberIds.length > 0) {
          const userProfilesPromises = guildData.memberIds.map(uid => getDoc(doc(db, "users", uid)));
          const userProfileSnaps = await Promise.all(userProfilesPromises);
          
          const fetchedMembers: GuildMember[] = userProfileSnaps
            .map(snap => snap.exists() ? snap.data() as UserProfile : null)
            .filter(profile => profile !== null)
            .map(profile => ({
              ...(profile as UserProfile),
              role: guildData.roles?.[profile!.uid] || GuildRole.Member, 
            }))
            .sort((a, b) => (a.displayName || a.uid).localeCompare(b.displayName || b.uid)); // Sort by display name

          setMembers(fetchedMembers);
        } else {
          setMembers([]);
        }
      } catch (error) {
        console.error("Erro ao buscar dados da guilda e membros:", error);
        toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar os membros da guilda.", variant: "destructive" });
      } finally {
        setLoadingGuildData(false);
      }
    };

    fetchGuildAndMembers();
  }, [guildId, currentUser, authLoading, router, toast]);

  const currentUserRoleInGuild = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid] || null;
  }, [currentUser, guild]);


  const canManageMember = (targetMemberRole: GuildRole): { canChangeRole: boolean, canKick: boolean } => {
    if (!currentUserRoleInGuild || !guild) return { canChangeRole: false, canKick: false };

    if (currentUserRoleInGuild === GuildRole.Leader) {
      return { 
        canChangeRole: targetMemberRole !== GuildRole.Leader, // Leader cannot change their own role or create another leader via this simple UI
        canKick: targetMemberRole !== GuildRole.Leader // Leader cannot kick themselves
      };
    }
    if (currentUserRoleInGuild === GuildRole.ViceLeader) {
      const isLowerRank = [GuildRole.Counselor, GuildRole.Officer, GuildRole.Member].includes(targetMemberRole);
      return {
        canChangeRole: isLowerRank,
        canKick: isLowerRank && targetMemberRole !== GuildRole.Leader // Vice cannot kick leader
      };
    }
    return { canChangeRole: false, canKick: false };
  };
  
  const availableRolesForChange = (targetMemberRole: GuildRole): GuildRole[] => {
    if (!currentUserRoleInGuild) return [];

    if (currentUserRoleInGuild === GuildRole.Leader) {
        // Leader can change to any role except making another Leader or changing their own role
        if (targetMemberRole === GuildRole.Leader) return [];
        return [GuildRole.ViceLeader, GuildRole.Counselor, GuildRole.Officer, GuildRole.Member].filter(r => r !== targetMemberRole);
    }
    if (currentUserRoleInGuild === GuildRole.ViceLeader) {
        // Vice-Leader can change to Counselor, Officer, Member, if target is lower rank
        if ([GuildRole.Leader, GuildRole.ViceLeader].includes(targetMemberRole)) return [];
        return [GuildRole.Counselor, GuildRole.Officer, GuildRole.Member].filter(r => r !== targetMemberRole);
    }
    return [];
  };

  const openActionDialog = (member: GuildMember, type: MemberManagementAction) => {
    setActionUser(member);
    setActionType(type);
    setSelectedNewRole(''); // Reset role selection
  };

  const closeActionDialog = () => {
    setActionUser(null);
    setActionType(null);
    setIsProcessingAction(false);
  };

  const handleChangeRole = async () => {
    if (!actionUser || !guild || selectedNewRole === '' || !guildId) return;
    if (actionUser.uid === guild.ownerId && selectedNewRole !== GuildRole.Leader) {
        toast({ title: "Ação Inválida", description: "O Líder não pode ser rebaixado por esta ação. Use a transferência de liderança.", variant: "destructive" });
        return;
    }
    if (selectedNewRole === GuildRole.Leader && actionUser.uid !== guild.ownerId) {
        toast({ title: "Ação Inválida", description: "Para nomear um novo Líder, use a funcionalidade de transferência de liderança.", variant: "destructive" });
        return;
    }

    setIsProcessingAction(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      await updateDoc(guildRef, {
        [`roles.${actionUser.uid}`]: selectedNewRole
      });
      toast({ title: "Cargo Atualizado!", description: `${actionUser.displayName} agora é ${selectedNewRole}.` });
      setMembers(prev => prev.map(m => m.uid === actionUser.uid ? { ...m, role: selectedNewRole } : m));
      closeActionDialog();
    } catch (error) {
      console.error("Erro ao mudar cargo:", error);
      toast({ title: "Erro ao Mudar Cargo", variant: "destructive" });
      setIsProcessingAction(false);
    }
  };

  const handleKickMember = async () => {
    if (!actionUser || !guild || !guildId) return;
    if (actionUser.uid === guild.ownerId) {
         toast({ title: "Ação Inválida", description: "O Líder não pode ser expulso.", variant: "destructive" });
        return;
    }

    setIsProcessingAction(true);
    try {
      const guildRef = doc(db, "guilds", guildId);
      // Use a batch write if you also need to update a 'kickedUsers' subcollection or similar in the future
      const batch = writeBatch(db);
      batch.update(guildRef, {
        memberIds: arrayRemove(actionUser.uid),
        memberCount: firebaseIncrement(-1),
        [`roles.${actionUser.uid}`]: deleteField()
      });
      await batch.commit();

      toast({ title: "Membro Removido", description: `${actionUser.displayName} foi removido da guilda.` });
      setMembers(prev => prev.filter(m => m.uid !== actionUser.uid));
      setGuild(g => g ? {...g, memberCount: g.memberCount -1, memberIds: g.memberIds?.filter(id => id !== actionUser.uid), roles: g.roles ? (()=>{const newRoles = {...g.roles}; delete newRoles[actionUser.uid]; return newRoles;})() : undefined} : null);
      closeActionDialog();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({ title: "Erro ao Remover Membro", variant: "destructive" });
      setIsProcessingAction(false);
    }
  };

  const getRoleIcon = (role: GuildRole) => {
    switch (role) {
      case GuildRole.Leader: return <Crown className="h-5 w-5 text-yellow-400" />;
      case GuildRole.ViceLeader: return <Shield className="h-5 w-5 text-orange-400" />;
      case GuildRole.Counselor: return <BadgeCent className="h-5 w-5 text-sky-400" />; // Example, could be Brain or similar
      case GuildRole.Officer: return <ShieldCheck className="h-5 w-5 text-green-400" />;
      default: return <User className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loadingGuildData || authLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <PageTitle title="Membros da Guilda" icon={<Users className="h-8 w-8 text-primary" />} />
        <Skeleton className="h-12 w-full" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }
  
  if (!guild) {
    return <div className="p-6 text-center">Guilda não carregada ou não encontrada.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageTitle title={`Membros de ${guild.name}`} description="Gerencie os membros e seus cargos na guilda." icon={<Users className="h-8 w-8 text-primary" />} />
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] hidden sm:table-cell">Avatar</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  Nenhum membro encontrado nesta guilda.
                </TableCell>
              </TableRow>
            )}
            {members.map((member) => {
              const permissions = canManageMember(member.role);
              const roleOptions = availableRolesForChange(member.role);
              return (
                <TableRow key={member.uid}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.photoURL || `https://placehold.co/64x64.png?text=${member.displayName?.substring(0,1) || 'M'}`} alt={member.displayName || 'Avatar'} data-ai-hint="user avatar"/>
                      <AvatarFallback>{member.displayName?.substring(0,2).toUpperCase() || 'M'}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{member.displayName || member.email || member.uid}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    {member.role}
                  </TableCell>
                  <TableCell className="text-right">
                    {(permissions.canChangeRole || permissions.canKick) && member.uid !== currentUser?.uid && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Gerenciar Membro</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {permissions.canChangeRole && roleOptions.length > 0 && (
                             <DropdownMenuItem onSelect={() => openActionDialog(member, "changeRole")}>
                                <UserCog className="mr-2 h-4 w-4" /> Alterar Cargo
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Change Role Dialog */}
      <AlertDialog open={actionType === 'changeRole' && !!actionUser} onOpenChange={(isOpen) => !isOpen && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Cargo de {actionUser?.displayName}</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo cargo para este membro.
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

      {/* Kick Member Dialog */}
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
    <Suspense fallback={<div><Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mt-10" /></div>}>
      <MembersPageContent />
    </Suspense>
  );
}