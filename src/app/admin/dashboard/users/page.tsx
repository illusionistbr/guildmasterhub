
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { db, collection, getDocs, query, orderBy, Timestamp } from '@/lib/firebase';
import type { UserProfile } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Users, MoreHorizontal, Search, Check, X, ShieldCheck, UserCheckIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';


const USERS_PER_PAGE = 15;

// This list should ideally be managed in a secure backend or a centralized config.
// For now, it mirrors the logic in AuthContext for display purposes.
const ADMIN_UIDS = ['Y3W5w0EcrMQOtep8OzqxJnrbrdj2'];


function AdminUsersContent() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        // Removed orderBy from the query to avoid potential index/permission issues.
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        
        // Sorting is now done on the client-side.
        usersData.sort((a, b) => {
            const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });
        
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Erro ao buscar usuários", description: "Não foi possível carregar a lista de usuários.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [toast]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderSkeleton = () => {
    return [...Array(USERS_PER_PAGE)].map((_, i) => (
      <TableRow key={`skel-${i}`}>
        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-8">
      <PageTitle title="Gerenciamento de Usuários" icon={<Users />} />

      <div className="flex items-center justify-between">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              className="max-w-sm pl-10"
            />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? renderSkeleton() : paginatedUsers.length > 0 ? (
              paginatedUsers.map(user => (
                <TableRow key={user.uid}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} data-ai-hint="user avatar"/>
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.displayName || 'Sem Nickname'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.createdAt && user.createdAt instanceof Timestamp ? format(user.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {ADMIN_UIDS.includes(user.uid) ? 
                        <Badge variant="default" className="bg-primary hover:bg-primary/90"><ShieldCheck className="h-4 w-4 mr-1.5"/>Sim</Badge> : 
                        <Badge variant="outline"><UserCheckIcon className="h-4 w-4 mr-1.5"/>Não</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Ver Perfil</DropdownMenuItem>
                        <DropdownMenuItem disabled>Tornar Admin</DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-destructive focus:text-destructive">Suspender Usuário</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
            >
                Próxima
            </Button>
        </div>
      )}
    </div>
  );
}


export default function AdminUsersPage() {
    return (
        <Suspense>
            <AdminUsersContent />
        </Suspense>
    );
}
