
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Event as GuildEvent, Guild, GuildMemberRoleInfo, ManualConfirmation } from '@/types/guildmaster';
import { GuildPermission, AuditActionType } from '@/types/guildmaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, Loader2, AlertTriangle, Clock, Edit, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, updateDoc, arrayUnion, increment, writeBatch, Timestamp, getDoc } from '@/lib/firebase';
import { logGuildActivity } from '@/lib/auditLogService';
import { hasPermission } from '@/lib/permissions';
import { add, isAfter, isBefore } from 'date-fns';

interface EventPinDialogProps {
  event: GuildEvent | null;
  guild: Guild | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: GuildMemberRoleInfo | null;
  guildId: string | null;
}

const parseEventDateTimeString = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
};

export function EventPinDialog({ event, guild, isOpen, onClose, currentUserRole: currentUserRoleInfo, guildId }: EventPinDialogProps) {
  const { user: currentUser } = useAuth();
  const [pinInputs, setPinInputs] = useState<string[]>(Array(6).fill(""));
  const [showPin, setShowPin] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const { toast } = useToast();
  const [userManualConfirmation, setUserManualConfirmation] = useState<ManualConfirmation | null>(null);
  const [loadingManualConfirmation, setLoadingManualConfirmation] = useState(false);

  const canCurrentUserRevealPin = useMemo(() => {
    if (!currentUserRoleInfo || !guild || !guild.customRoles) {
      return false;
    }
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_EVENTS_VIEW_PIN
    );
  }, [currentUserRoleInfo, guild]);

  useEffect(() => {
    if (isOpen) {
      setPinInputs(Array(6).fill(""));
      setShowPin(false);
      setIsSubmittingPin(false);
      setUserManualConfirmation(null); // Reset manual confirmation state

      if (event && currentUser && guildId && event.requiresPin) {
        setLoadingManualConfirmation(true);
        const fetchManualConfirmation = async () => {
          try {
            const manualConfirmationDocRef = doc(db, `guilds/${guildId}/events/${event.id}/manualConfirmations`, currentUser.uid);
            const confirmationSnap = await getDoc(manualConfirmationDocRef);
            if (confirmationSnap.exists()) {
              setUserManualConfirmation(confirmationSnap.data() as ManualConfirmation);
            }
          } catch (error) {
            console.error("Error fetching user manual confirmation:", error);
            // Optionally toast an error, but for now, just log it
          } finally {
            setLoadingManualConfirmation(false);
          }
        };
        fetchManualConfirmation();
      } else {
        setLoadingManualConfirmation(false);
      }
    }
  }, [isOpen, event, currentUser, guildId]);

  if (!event || !guildId || !currentUser || !guild) {
    return null;
  }

  if (!guild.dkpSystemEnabled && event.requiresPin) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-headline text-primary flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-yellow-500" /> {event.title}
            </DialogTitle>
            <DialogDescription>
              O sistema de DKP e PINs está atualmente desabilitado para esta guilda, mas este evento requer um PIN.
              Contacte um administrador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!guild.dkpSystemEnabled && !event.requiresPin) {
     return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-headline text-primary flex items-center">
               {event.title}
            </DialogTitle>
            <DialogDescription>
              Este evento não requer PIN e o sistema DKP está desabilitado. Nenhuma ação de PIN é necessária.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const hasActiveManualConfirmation = userManualConfirmation && (userManualConfirmation.status === 'pending' || userManualConfirmation.status === 'approved');

  const handleInputChange = (index: number, value: string) => {
    if (/^[0-9]?$/.test(value)) {
      const newPinInputs = [...pinInputs];
      newPinInputs[index] = value;
      setPinInputs(newPinInputs);
      if (value && index < 5) {
        document.getElementById(`pin-input-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinInputs[index] && index > 0) {
      document.getElementById(`pin-input-${index - 1}`)?.focus();
    }
  };

  const handleSubmitPin = async () => {
    if (!guild.dkpSystemEnabled) {
      toast({ title: "Sistema DKP Desabilitado", description: "O sistema de DKP e PINs está desabilitado para esta guilda.", variant: "default" });
      onClose();
      return;
    }

    if (!event.requiresPin || !event.pinCode) {
      toast({ title: "PIN não necessário", description: "Este evento não requer PIN.", variant: "default" });
      onClose();
      return;
    }
    
    if (hasActiveManualConfirmation) {
      toast({ title: "Confirmação Manual Existente", description: "Você já enviou uma confirmação manual para este evento. O resgate via PIN não está disponível.", variant: "default" });
      return;
    }

    if (event.endDate && event.endTime) {
      const eventEndDateTime = parseEventDateTimeString(event.endDate, event.endTime);
      const currentTime = new Date();
      if (isBefore(currentTime, eventEndDateTime)) {
        toast({
          title: "Evento em Andamento",
          description: "O PIN só pode ser resgatado após o término do evento.",
          variant: "default",
          duration: 7000,
        });
        return; 
      }
    }

    if (guild.dkpRedemptionWindow && event.endDate && event.endTime) {
        const eventEndDateTime = parseEventDateTimeString(event.endDate, event.endTime);
        let redemptionDeadline: Date;
        switch (guild.dkpRedemptionWindow.unit) {
            case 'minutes': redemptionDeadline = add(eventEndDateTime, { minutes: guild.dkpRedemptionWindow.value }); break;
            case 'hours': redemptionDeadline = add(eventEndDateTime, { hours: guild.dkpRedemptionWindow.value }); break;
            case 'days': redemptionDeadline = add(eventEndDateTime, { days: guild.dkpRedemptionWindow.value }); break;
            default: redemptionDeadline = add(eventEndDateTime, { hours: guild.dkpRedemptionWindow.value }); break;
        }
        if (isAfter(new Date(), redemptionDeadline)) {
            toast({ title: "Janela de Resgate Expirada", description: "O tempo para resgatar DKP para este evento expirou.", variant: "destructive" });
            return;
        }
    }

    if (!event.dkpValue || event.dkpValue <= 0) {
      // No DKP for this event, but still register presence
    }

    const enteredPin = pinInputs.join("");
    if (enteredPin !== event.pinCode) {
      toast({ title: "PIN Incorreto", description: "O código PIN inserido está incorreto.", variant: "destructive" });
      setPinInputs(Array(6).fill(""));
      return;
    }

    if (event.attendeesWithPin?.includes(currentUser.uid)) {
      toast({ title: "Presença Já Registrada", description: "Sua presença (e DKP, se aplicável) para este evento já foi registrada com PIN.", variant: "default" });
      onClose();
      return;
    }

    setIsSubmittingPin(true);
    try {
      const batch = writeBatch(db);
      const eventRef = doc(db, `guilds/${guildId}/events`, event.id);
      const guildRef = doc(db, "guilds", guildId);
      const userRolePath = `roles.${currentUser.uid}.dkpBalance`;

      batch.update(eventRef, {
        attendeesWithPin: arrayUnion(currentUser.uid)
      });

      let dkpAwarded = 0;
      if (event.dkpValue && event.dkpValue > 0) {
        dkpAwarded = event.dkpValue;
        batch.update(guildRef, {
          [userRolePath]: increment(dkpAwarded)
        });
      }

      await batch.commit();

      await logGuildActivity(
        guildId,
        currentUser.uid,
        currentUser.displayName,
        AuditActionType.DKP_AWARDED_VIA_PIN,
        {
          eventId: event.id,
          eventName: event.title,
          dkpValueAwarded: dkpAwarded,
          targetUserId: currentUser.uid,
          targetUserDisplayName: currentUser.displayName
        }
      );

      if (dkpAwarded > 0) {
        toast({ title: "Sucesso!", description: `Presença registrada e ${dkpAwarded} DKP creditados para ${event.title}.` });
      } else {
        toast({ title: "Presença Registrada!", description: `Sua presença para ${event.title} foi registrada. Nenhum DKP foi concedido para este evento.` });
      }
      onClose();
    } catch (error) {
      console.error("Error submitting PIN and awarding DKP:", error);
      toast({ title: "Erro ao Registrar Presença", description: "Não foi possível processar sua solicitação.", variant: "destructive" });
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleRevealPin = () => {
    if (canCurrentUserRevealPin) {
      setShowPin(!showPin);
    } else {
      toast({ title: "Acesso Negado", description: "Você não tem permissão para revelar o PIN.", variant: "destructive" });
    }
  };

  if (loadingManualConfirmation) {
    return (
       <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-headline text-primary flex items-center">
              <KeyRound className="mr-2 h-6 w-6" /> {event.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">Verificando confirmações...</p>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-headline text-primary flex items-center">
            <KeyRound className="mr-2 h-6 w-6" /> {event.title}
          </DialogTitle>
          <DialogDescription>
            {event.requiresPin
              ? (hasActiveManualConfirmation 
                  ? "Você já enviou uma confirmação manual para este evento. O resgate via PIN não está disponível." 
                  : "Insira o código PIN de 6 dígitos para registrar presença e resgatar seus pontos DKP (se aplicável).")
              : "Este evento não requer um código PIN."}
          </DialogDescription>
        </DialogHeader>

        {event.requiresPin && !hasActiveManualConfirmation && (
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="pin-input-0" className="text-foreground">Código PIN do Evento</Label>
              <div className="flex justify-center gap-2 mt-2">
                {pinInputs.map((digit, index) => (
                  <Input
                    key={index}
                    id={`pin-input-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 text-center text-lg font-semibold form-input"
                    inputMode="numeric"
                    disabled={isSubmittingPin}
                  />
                ))}
              </div>
            </div>

            <Button onClick={handleSubmitPin} className="w-full btn-gradient btn-style-secondary" disabled={isSubmittingPin || pinInputs.join("").length !== 6}>
              {isSubmittingPin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar Presença
            </Button>
          </div>
        )}

        {event.requiresPin && canCurrentUserRevealPin && !hasActiveManualConfirmation && (
            <div className="space-y-2 pt-2">
                <Button variant="outline" onClick={handleRevealPin} className="w-full" disabled={isSubmittingPin}>
                    {showPin ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showPin ? "Ocultar Código PIN" : "Revelar Código PIN"}
                </Button>
                {showPin && (
                    <div className="p-3 bg-muted rounded-md text-center">
                        <p className="text-2xl font-bold tracking-widest text-primary">{event.pinCode || "PIN não disponível"}</p>
                    </div>
                )}
            </div>
        )}

        {event.requiresPin && !hasActiveManualConfirmation && (
            <div className="text-center pt-2">
              <Link href={`/dashboard/calendar/manual-confirmation?guildId=${guildId}&eventId=${event.id}`} passHref>
                <Button variant="link" className="text-sm text-primary hover:underline p-0" onClick={onClose}>
                  <Edit className="mr-1.5 h-4 w-4" /> Problemas? Confirme manualmente sua participação
                </Button>
              </Link>
            </div>
        )}

         {hasActiveManualConfirmation && (
            <div className="py-4">
                <ShieldAlert className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                <p className="text-center text-muted-foreground">
                    Sua confirmação manual para este evento está <span className="font-semibold">{userManualConfirmation?.status === 'pending' ? 'pendente' : 'aprovada'}</span>.
                    Portanto, o resgate de DKP via PIN não está disponível.
                </p>
            </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmittingPin}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
