
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from '@/lib/firebase';
import type { Guild, GuildGroup, GuildMember, UserProfile, GuildMemberRoleInfo, GroupIconType, GuildGroupMember } from '@/types/guildmaster';
import { GuildRole, AuditActionType } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, UsersRound, Shield, Swords, Heart, Edit2, Trash2, Save } from 'lucide-react';
import { useHeader } from '@/contexts/HeaderContext';
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logGuildActivity } from '@/lib/auditLogService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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
  shield: Shield,
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

// Simplified GroupCard component directly in this file for now
function GroupCard({ group, onEdit, onDelete, canManage }: { group: GuildGroup; onEdit: (group: GuildGroup) => void; onDelete: (group: GuildGroup) => void; canManage: boolean; }) {
  const IconComponent = iconMap[group.icon];
  return (
    <Card className="w-full max-w-sm flex flex-col static-card-container">
      <CardHeader className={cn("p-3 rounded-t-lg flex flex-row items-center justify-between", group.headerColor)}>
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/20" onClick={() => onEdit(group)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/20">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o grupo "{group.name}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(group)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <div className="divide-y divide-border">
          {group.members.map((member, index) => (
            <div key={member.memberId + index} className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.photoURL || `https://placehold.co/40x40.png?text=${member.displayName?.substring(0,1)}`} alt={member.displayName} data-ai-hint="user avatar" />
                  <AvatarFallback>{member.displayName?.substring(0,1).toUpperCase() || 'M'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{member.displayName}</span>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[150px]" title={member.note}>{member.note || '-'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


function GroupsPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [groups, setGroups] = useState<GuildGroup[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GuildGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<GuildGroup | null>(null);


  const guildId = searchParams.get('guildId');

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      icon: "shield",
      headerColor: availableHeaderColors[0].value,
      members: [{ memberId: "", note: "" }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "members",
  });

  useEffect(() => {
    if (guild?.name) setHeaderTitle(`Grupos: ${guild.name}`);
    return () => setHeaderTitle(null);
  }, [guild?.name, setHeaderTitle]);

  const currentUserRoleInGuild = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    const roleInfo = guild.roles[currentUser.uid];
    if (typeof roleInfo === 'object' && roleInfo !== null && 'generalRole' in roleInfo) {
      return (roleInfo as GuildMemberRoleInfo).generalRole;
    }
    return roleInfo as GuildRole | null;
  }, [currentUser, guild]);

  const canManageGroups = useMemo(() => {
    return currentUserRoleInGuild === GuildRole.Leader || currentUserRoleInGuild === GuildRole.ViceLeader;
  }, [currentUserRoleInGuild]);

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

    const fetchGuildAndMembersData = async () => {
      setLoadingData(true);
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

        // Fetch guild members for the select dropdown
        if (guildData.memberIds && guildData.memberIds.length > 0) {
          const memberProfilesPromises = guildData.memberIds.map(uid => getDoc(doc(db, "users", uid)));
          const memberProfileSnaps = await Promise.all(memberProfilesPromises);
          const fetchedMembers: GuildMember[] = memberProfileSnaps
            .filter(snap => snap.exists())
            .map(snap => {
              const userProfile = snap.data() as UserProfile;
              const roleInfo = guildData.roles?.[userProfile.uid];
              let generalRole = GuildRole.Member; // Default
              if (typeof roleInfo === 'object' && roleInfo !== null && 'generalRole' in roleInfo) {
                  generalRole = (roleInfo as GuildMemberRoleInfo).generalRole;
              } else if (typeof roleInfo === 'string') {
                  generalRole = roleInfo as GuildRole;
              }
              return { ...userProfile, role: generalRole } as GuildMember;
            });
          setGuildMembers(fetchedMembers.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "")));
        } else {
          setGuildMembers([]);
        }

      } catch (error) {
        console.error("Erro ao buscar dados da guilda e membros:", error);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      }
    };

    fetchGuildAndMembersData();
  }, [guildId, currentUser, authLoading, router, toast]);

  useEffect(() => {
    if (!guildId) return;
    setLoadingData(true);
    const groupsRef = collection(db, `guilds/${guildId}/groups`);
    const q = query(groupsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuildGroup));
      setGroups(fetchedGroups);
      setLoadingData(false);
    }, (error) => {
      console.error("Erro ao buscar grupos:", error);
      toast({ title: "Erro ao carregar grupos", variant: "destructive" });
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [guildId, toast]);


  const handleOpenDialog = (groupToEdit: GuildGroup | null = null) => {
    setEditingGroup(groupToEdit);
    if (groupToEdit) {
      form.reset({
        name: groupToEdit.name,
        icon: groupToEdit.icon,
        headerColor: groupToEdit.headerColor,
        members: groupToEdit.members.map(m => ({ memberId: m.memberId, note: m.note || "" })),
      });
    } else {
      form.reset({
        name: "",
        icon: "shield",
        headerColor: availableHeaderColors[0].value,
        members: [{ memberId: "", note: "" }],
      });
    }
    setShowDialog(true);
  };

  const onSubmitGroup: SubmitHandler<GroupFormValues> = async (data) => {
    if (!currentUser || !guildId || !canManageGroups) return;
    setIsSubmitting(true);

    const groupMembersData: GuildGroupMember[] = data.members
      .filter(m => m.memberId) // Ensure memberId is present
      .map(m => {
        const memberProfile = guildMembers.find(gm => gm.uid === m.memberId);
        return {
          memberId: m.memberId,
          displayName: memberProfile?.displayName || 'Desconhecido',
          photoURL: memberProfile?.photoURL || null,
          note: m.note,
        };
      });

    const groupDataPayload = {
      name: data.name,
      icon: data.icon,
      headerColor: data.headerColor,
      members: groupMembersData,
      guildId: guildId, // Add guildId to the group document
    };

    try {
      if (editingGroup) {
        const groupRef = doc(db, `guilds/${guildId}/groups`, editingGroup.id);
        await updateDoc(groupRef, groupDataPayload);
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.GROUP_UPDATED, { groupId: editingGroup.id, groupName: data.name });
        toast({ title: "Grupo Atualizado!", description: `O grupo "${data.name}" foi atualizado com sucesso.` });
      } else {
        const docRef = await addDoc(collection(db, `guilds/${guildId}/groups`), {
          ...groupDataPayload,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
        });
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.GROUP_CREATED, { groupId: docRef.id, groupName: data.name });
        toast({ title: "Grupo Criado!", description: `O grupo "${data.name}" foi criado com sucesso.` });
      }
      setShowDialog(false);
      setEditingGroup(null);
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      toast({ title: "Erro ao Salvar Grupo", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteGroup = async (groupToDelete: GuildGroup) => {
    if (!groupToDelete || !currentUser || !guildId || !canManageGroups) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, `guilds/${guildId}/groups`, groupToDelete.id));
      await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || "", AuditActionType.GROUP_DELETED, { groupId: groupToDelete.id, groupName: groupToDelete.name });
      toast({ title: "Grupo Excluído!", description: `O grupo "${groupToDelete.name}" foi excluído.`});
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      toast({ title: "Erro ao Excluir", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (authLoading || loadingData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Grupos da Guilda"
        description="Gerencie e organize os grupos (parties) da sua guilda."
        icon={<UsersRound className="h-8 w-8 text-primary" />}
        action={
          canManageGroups && (
            <Button onClick={() => handleOpenDialog()} className="btn-gradient btn-style-secondary">
              <PlusCircle className="mr-2 h-5 w-5" /> Novo Grupo
            </Button>
          )
        }
      />

      {groups.length === 0 ? (
        <Card className="card-bg text-center py-10 max-w-lg mx-auto">
          <CardHeader>
            <UsersRound className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl">Nenhum Grupo Criado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {canManageGroups ? "Crie o primeiro grupo para sua guilda!" : "Ainda não há grupos formados nesta guilda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map(group => (
            <GroupCard 
              key={group.id} 
              group={group} 
              onEdit={handleOpenDialog} 
              onDelete={handleDeleteGroup}
              canManage={canManageGroups}
            />
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(isOpen) => { if (!isOpen) { setEditingGroup(null); form.reset(); } setShowDialog(isOpen); }}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border">
            <DialogTitle className="font-headline text-primary">{editingGroup ? "Editar Grupo" : "Criar Novo Grupo"}</DialogTitle>
            <DialogDescription>Preencha os detalhes para {editingGroup ? "atualizar o" : "configurar um novo"} grupo.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitGroup)} className="flex-grow overflow-y-auto px-6 py-4 space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Grupo</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: Grupo Alpha de Raide" className="form-input"/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ícone do Grupo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione um ícone" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="shield"><Shield className="inline mr-2 h-4 w-4"/> Escudo</SelectItem>
                          <SelectItem value="sword"><Swords className="inline mr-2 h-4 w-4"/> Espada</SelectItem>
                          <SelectItem value="heart"><Heart className="inline mr-2 h-4 w-4"/> Coração</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="headerColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Cabeçalho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione uma cor" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {availableHeaderColors.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center">
                                <span className={cn("w-4 h-4 rounded-full mr-2", color.value.split(' ')[0])}></span>
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel>Membros do Grupo (Máximo 6)</FormLabel>
                {fields.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start gap-2 p-3 border rounded-md bg-input/30">
                    <div className="flex-grow w-full sm:w-auto">
                      <FormField
                        control={form.control}
                        name={`members.${index}.memberId`}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="form-input bg-background"><SelectValue placeholder="Selecione um membro" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {guildMembers.map(member => (
                                  <SelectItem key={member.uid} value={member.uid} disabled={fields.some((f, i) => i !== index && f.memberId === member.uid)}>
                                    <div className="flex items-center gap-2">
                                       <Avatar className="h-6 w-6">
                                          <AvatarImage src={member.photoURL || undefined} alt={member.displayName || ""} data-ai-hint="user avatar"/>
                                          <AvatarFallback>{member.displayName?.substring(0,1).toUpperCase() || 'M'}</AvatarFallback>
                                       </Avatar>
                                      {member.displayName}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex-grow w-full sm:w-auto">
                       <FormField
                        control={form.control}
                        name={`members.${index}.note`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} placeholder="Nota (Ex: Tank Principal)" className="form-input bg-background"/></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 h-9 w-9 mt-0 sm:mt-2 shrink-0">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                  </div>
                ))}
                {fields.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ memberId: "", note: "" })}
                    className="mt-2"
                  >
                    Adicionar Membro
                  </Button>
                )}
                 <FormMessage>{form.formState.errors.members?.message || form.formState.errors.members?.root?.message}</FormMessage>
              </div>
            <DialogFooter className="p-0 pt-6 sticky bottom-0 bg-card">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="btn-gradient btn-style-primary" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingGroup ? "Salvar Alterações" : "Criar Grupo"}
              </Button>
            </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Keep the existing AlertDialog for confirming deletion, adjusted to pass groupToDelete */}
      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                      Tem certeza que deseja excluir o grupo "{groupToDelete?.name}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setGroupToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => groupToDelete && handleDeleteGroup(groupToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                      Excluir
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <GroupsPageContent />
    </Suspense>
  );
}

    
