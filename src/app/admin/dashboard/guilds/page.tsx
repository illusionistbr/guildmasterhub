"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { db, collection, getDocs, query, Timestamp } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Shield, MoreHorizontal, Search, Users, Gamepad2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const GUILDS_PER_PAGE = 15;

function AdminGuildsContent() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGuilds = async () => {
      setLoading(true);
      try {
        const guildsRef = collection(db, 'guilds');
        const q = query(guildsRef); // Removed orderBy to avoid index issues
        const querySnapshot = await getDocs(q);
        const guildsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild));
        
        // Sort on client side
        guildsData.sort((a, b) => {
            const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        setGuilds(guildsData);
      } catch (error) {
        console.error("Error fetching guilds:", error);
        toast({ title: "Erro ao buscar guildas", description: "Não foi possível carregar a lista de guildas. Verifique as permissões do Firestore.", variant: "destructive", duration: 7000 });
      } finally {
        setLoading(false);
      }
    };
    fetchGuilds();
  }, [toast]);

  const filteredGuilds = useMemo(() => {
    if (!searchTerm) return guilds;
    return guilds.filter(guild =>
      guild.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guild.ownerDisplayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [guilds, searchTerm]);

  const paginatedGuilds = useMemo(() => {
    const startIndex = (currentPage - 1) * GUILDS_PER_PAGE;
    return filteredGuilds.slice(startIndex, startIndex + GUILDS_PER_PAGE);
  }, [filteredGuilds, currentPage]);

  const totalPages = Math.ceil(filteredGuilds.length / GUILDS_PER_PAGE);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "G";
    return name.substring(0, 1).toUpperCase();
  };

  const renderSkeleton = () => {
    return [...Array(5)].map((_, i) => (
      <TableRow key={`skel-${i}`}>
        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-8">
      <PageTitle title="Gerenciamento de Guildas" icon={<Shield />} />

      <div className="flex items-center justify-between">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome da guilda ou dono..."
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
              <TableHead>Guilda</TableHead>
              <TableHead>Dono</TableHead>
              <TableHead><Users className="inline-block h-4 w-4 mr-1"/>Membros</TableHead>
              <TableHead><Gamepad2 className="inline-block h-4 w-4 mr-1"/>Jogo</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? renderSkeleton() : paginatedGuilds.length > 0 ? (
              paginatedGuilds.map(guild => (
                <TableRow key={guild.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={guild.logoUrl || undefined} alt={guild.name || ""} data-ai-hint="guild logo"/>
                        <AvatarFallback>{getInitials(guild.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{guild.name || 'Nome Desconhecido'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{guild.ownerDisplayName || 'Dono Desconhecido'}</TableCell>
                  <TableCell>{guild.memberCount || 0}</TableCell>
                  <TableCell>{guild.game || 'N/A'}</TableCell>
                  <TableCell>
                    {guild.createdAt && guild.createdAt instanceof Timestamp ? format(guild.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
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
                        <DropdownMenuItem disabled>Ver Detalhes</DropdownMenuItem>
                        <DropdownMenuItem disabled>Enviar Notificação</DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-destructive focus:text-destructive">Suspender Guilda</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhuma guilda encontrada.
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

export default function AdminGuildsPage() {
    return (
        <Suspense>
            <AdminGuildsContent />
        </Suspense>
    );
}
