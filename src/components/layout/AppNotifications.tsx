
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bell, CalendarDays, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query, where, orderBy, limit, doc, updateDoc, serverTimestamp, Timestamp } from '@/lib/firebase';
import { onSnapshot } from 'firebase/firestore'; // Importação corrigida
import type { AppNotification } from '@/types/guildmaster'; // UserProfile não é mais necessário aqui diretamente
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export function AppNotifications() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const currentGuildId = searchParams.get('guildId');

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (!user || !currentGuildId) {
      setNotifications([]);
      setShowNotificationAlert(false);
      return;
    }

    const notificationsRef = collection(db, `guilds/${currentGuildId}/notifications`);
    const q = query(notificationsRef, orderBy("timestamp", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications: AppNotification[] = [];
      querySnapshot.forEach((doc) => {
        fetchedNotifications.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      setNotifications(fetchedNotifications);

      const lastCheckedTimestamp = user.lastNotificationsCheckedTimestamp?.[currentGuildId];
      if (fetchedNotifications.length > 0) {
        const latestNotificationTimestamp = fetchedNotifications[0].timestamp;
        // Certifique-se de que ambos os timestamps existem e são objetos Timestamp do Firebase antes de chamar toMillis()
        if (!lastCheckedTimestamp || (latestNotificationTimestamp && latestNotificationTimestamp instanceof Timestamp && (!lastCheckedTimestamp || lastCheckedTimestamp instanceof Timestamp && latestNotificationTimestamp.toMillis() > lastCheckedTimestamp.toMillis()))) {
          setShowNotificationAlert(true);
        } else {
          setShowNotificationAlert(false);
        }
      } else {
         setShowNotificationAlert(false);
      }
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setShowNotificationAlert(false);
    });

    return () => unsubscribe();
  }, [user, currentGuildId]);

  const handlePopoverOpenChange = async (open: boolean) => {
    setIsPopoverOpen(open);
    if (open && user && currentGuildId) {
      setShowNotificationAlert(false); 
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          [`lastNotificationsCheckedTimestamp.${currentGuildId}`]: serverTimestamp()
        });
      } catch (error) {
        console.error("Error updating lastNotificationsCheckedTimestamp:", error);
      }
    }
  };
  
  const formatTimestamp = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return "";
    try {
      // Certifique-se de que é um Timestamp do Firebase antes de chamar toDate()
      if (timestamp instanceof Timestamp) {
        return formatDistanceToNowStrict(timestamp.toDate(), { addSuffix: true, locale: ptBR });
      }
      // Se não for um Timestamp (por exemplo, já um Date ou string), tente converter ou retorne um placeholder
      const dateObj = new Date(timestamp as any); // Tenta converter, pode falhar
      if (!isNaN(dateObj.getTime())) {
        return formatDistanceToNowStrict(dateObj, { addSuffix: true, locale: ptBR });
      }
      return "Data inválida";

    } catch (e) {
        console.error("Error formatting timestamp:", e, "Timestamp value:", timestamp);
        return "Erro na data";
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch(type) {
      case 'MANDATORY_ACTIVITY_CREATED':
        return <CalendarDays className="h-5 w-5 text-primary mr-3 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground mr-3 shrink-0" />;
    }
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {showNotificationAlert && currentGuildId && (
            <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
          )}
          <span className="sr-only">Abrir notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-foreground">Notificações</h3>
        </div>
        <ScrollArea className="h-[300px] sm:h-[350px]">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação nova.</p>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link key={notification.id} href={notification.link} passHref legacyBehavior>
                  <a
                    className="block p-3 hover:bg-muted transition-colors"
                    onClick={() => setIsPopoverOpen(false)} // Close popover on click
                  >
                    <div className="flex items-start">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <p className="text-sm text-foreground mb-0.5 leading-snug">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(notification.timestamp)}</p>
                      </div>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
