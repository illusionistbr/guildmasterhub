
"use client";

import React, { useState } from 'react';
import type { Event as GuildEvent } from '@/types/guildmaster';
import { GuildRole, AuditActionType } from '@/types/guildmaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, updateDoc, arrayUnion, increment, writeBatch } from '@/lib/firebase';
import { logGuildActivity } from '@/lib/auditLogService';

interface EventPinDialogProps {
  event: GuildEvent | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: GuildRole | null;
  guildId: string | null;
}

export function EventPinDialog({ event, isOpen, onClose, currentUserRole, guildId }: EventPinDialogProps) {
  const { user: currentUser } = useAuth();
  const [pinInputs, setPinInputs] = useState<string[]>(Array(6).fill(""));
  const [showPin, setShowPin] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setPinInputs(Array(6).fill(""));
      setShowPin(false);
      setIsSubmittingPin(false);
    }
  }, [isOpen, event]);

  if (!event || !guildId || !currentUser) return null;

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
    if (!event.requiresPin || !event.pinCode) {
      toast({ title: "PIN não necessário", description: "Este evento não requer PIN.", variant: "default" });
      onClose();
      return;
    }
    if (!event.dkpValue || event.dkpValue <= 0) {
      toast({ title: "Sem DKP", description: "Este evento não concede DKP ou o valor é zero.", variant: "default" });
       // Consider still marking attendance if PIN is correct but DKP is 0
    }

    const enteredPin = pinInputs.join("");
    if (enteredPin !== event.pinCode) {
      toast({ title: "PIN Incorreto", description: "O código PIN inserido está incorreto.", variant: "destructive" });
      setPinInputs(Array(6).fill("")); // Clear inputs
      return;
    }

    if (event.attendeesWithPin?.includes(currentUser.uid)) {
      toast({ title: "Presença Já Registrada", description: "Sua presença (e DKP) para este evento já foi registrada com PIN.", variant: "default" });
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

      if (event.dkpValue && event.dkpValue > 0) {
        batch.update(guildRef, {
          [userRolePath]: increment(event.dkpValue)
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
          dkpValueAwarded: event.dkpValue || 0,
          targetUserId: currentUser.uid, // Log for the user who redeemed
          targetUserDisplayName: currentUser.displayName
        }
      );

      toast({ title: "Sucesso!", description: `Presença registrada e ${event.dkpValue || 0} DKP creditados para ${event.title}.` });
      onClose();
    } catch (error) {
      console.error("Error submitting PIN and awarding DKP:", error);
      toast({ title: "Erro ao Registrar Presença", description: "Não foi possível processar sua solicitação.", variant: "destructive" });
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleRevealPin = () => {
    if (currentUserRole === GuildRole.Leader || currentUserRole === GuildRole.ViceLeader) {
      setShowPin(!showPin);
    } else {
      toast({ title: "Acesso Negado", description: "Você não tem permissão para revelar o PIN.", variant: "destructive" });
    }
  };
  
  const canRevealPin = currentUserRole === GuildRole.Leader || currentUserRole === GuildRole.ViceLeader;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-headline text-primary flex items-center">
            <KeyRound className="mr-2 h-6 w-6" /> {event.title}
          </DialogTitle>
          <DialogDescription>
            {event.requiresPin 
              ? "Insira o código PIN de 6 dígitos para registrar presença e resgatar seus pontos DKP."
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
              Verificar Presença e Resgatar DKP
            </Button>

            {canRevealPin && (
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
