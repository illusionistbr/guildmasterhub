
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Event as GuildEvent, Guild, GuildMemberRoleInfo } from '@/types/guildmaster';
import { GuildPermission, AuditActionType } from '@/types/guildmaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, updateDoc, arrayUnion, increment, writeBatch, Timestamp } from '@/lib/firebase';
import { logGuildActivity } from '@/lib/auditLogService';
import { hasPermission } from '@/lib/permissions';
import { add, isAfter, isBefore } from 'date-fns'; // Added isBefore

interface EventPinDialogProps {
  event: GuildEvent | null;
  guild: Guild | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: GuildMemberRoleInfo | null;
  guildId: string | null;
}

// Helper function to parse date and time strings into a Date object
const parseEventDateTimeString = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Month is 0-indexed in JavaScript Date
  return new Date(year, month - 1, day, hours, minutes);
};


export function EventPinDialog({ event, guild, isOpen, onClose, currentUserRole: currentUserRoleInfo, guildId }: EventPinDialogProps) {
  const { user: currentUser } = useAuth();
  const [pinInputs, setPinInputs] = useState<string[]>(Array(6).fill(""));
  const [showPin, setShowPin] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPinInputs(Array(6).fill(""));
      setShowPin(false);
      setIsSubmittingPin(false);
    }
  }, [isOpen, event]);

  if (!event || !guildId || !currentUser || !guild) return null;

  const canCurrentUserRevealPin = useMemo(() => {
    if (!currentUserRoleInfo || !guild.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_EVENTS_VIEW_PIN
    );
  }, [currentUserRoleInfo, guild.customRoles]);


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

    // Check if event has ended before allowing PIN redemption
    if (event.endDate && event.endTime) {
      const eventEndDateTime = parseEventDateTimeString(event.endDate, event.endTime);
      const currentTime = new Date();
      if (isBefore(currentTime, eventEndDateTime)) {
        toast({
          title: "Evento em Andamento",
          description: "O PIN só pode ser resgatado após o término do evento.",
          variant: "default",
          duration: 7000,
          action: (
            <Button variant="outline" size="sm" onClick={() => {
              // Potentially close the toast if needed, though default duration might be enough
            }}>
              <Clock className="mr-2 h-4 w-4" /> OK
            </Button>
          )
        });
        onClose();
        return;
      }
    }

    // Check DKP Redemption Window
    if (guild.dkpRedemptionWindow && event.endDate && event.endTime) {
        const eventEndDateTime = parseEventDateTimeString(event.endDate, event.endTime);
        let redemptionDeadline: Date;
        switch (guild.dkpRedemptionWindow.unit) {
            case 'minutes':
                redemptionDeadline = add(eventEndDateTime, { minutes: guild.dkpRedemptionWindow.value });
                break;
            case 'hours':
                redemptionDeadline = add(eventEndDateTime, { hours: guild.dkpRedemptionWindow.value });
                break;
            case 'days':
                redemptionDeadline = add(eventEndDateTime, { days: guild.dkpRedemptionWindow.value });
                break;
            default: // Fallback, though schema should prevent this
                redemptionDeadline = add(eventEndDateTime, { hours: guild.dkpRedemptionWindow.value });
                break;
        }
        if (isAfter(new Date(), redemptionDeadline)) {
            toast({ title: "Janela de Resgate Expirada", description: "O tempo para resgatar DKP para este evento expirou.", variant: "destructive" });
            onClose();
            return;
        }
    }


    if (!event.dkpValue || event.dkpValue <= 0) {
      toast({ title: "Sem DKP", description: "Este evento não concede DKP ou o valor é zero.", variant: "default" });
      // Still allow presence registration if PIN matches, even if DKP is 0
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

  if (!guild.dkpSystemEnabled && event.requiresPin) { // If DKP is off but event somehow has requiresPin true
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
  
  // If DKP system is disabled AND event does not require PIN (legacy or manually set)
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


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-headline text-primary flex items-center">
            <KeyRound className="mr-2 h-6 w-6" /> {event.title}
          </DialogTitle>
          <DialogDescription>
            {event.requiresPin
              ? "Insira o código PIN de 6 dígitos para registrar presença e resgatar seus pontos DKP (se aplicável)."
              : "Este evento não requer um código PIN."}
          </DialogDescription>
        </DialogHeader>

        {event.requiresPin && (
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

            {canCurrentUserRevealPin && (
                <div className="space-y-2">
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
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmittingPin}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

