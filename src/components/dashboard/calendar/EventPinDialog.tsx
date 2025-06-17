
"use client";

import React, { useState, useEffect } from 'react'; // Added useEffect
import type { Event as GuildEvent, GuildMemberRoleInfo } from '@/types/guildmaster'; // Added GuildMemberRoleInfo
import { GuildPermission } from '@/types/guildmaster'; // Added GuildPermission
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, updateDoc, arrayUnion, increment, writeBatch } from '@/lib/firebase';
import { logGuildActivity, AuditActionType } from '@/lib/auditLogService';
import { hasPermission } from '@/lib/permissions'; // Import hasPermission

interface EventPinDialogProps {
  event: GuildEvent | null;
  guild: Guild | null; // Add guild to props
  isOpen: boolean;
  onClose: () => void;
  currentUserRoleInfo: GuildMemberRoleInfo | null; // Changed from currentUserRole
  guildId: string | null;
}

export function EventPinDialog({ event, guild, isOpen, onClose, currentUserRoleInfo, guildId }: EventPinDialogProps) {
  const { user: currentUser } = useAuth();
  const [pinInputs, setPinInputs] = useState<string[]>(Array(6).fill(""));
  const [showPin, setShowPin] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const { toast } = useToast();

  useEffect(() => { // Renamed from React.useEffect
    if (isOpen) {
      setPinInputs(Array(6).fill(""));
      setShowPin(false);
      setIsSubmittingPin(false);
    }
  }, [isOpen, event]);

  if (!event || !guildId || !currentUser || !guild) return null; // Check for guild

  const canCurrentUserRevealPin = useMemo(() => { // Renamed for clarity
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
    if (!event.requiresPin || !event.pinCode) {
      toast({ title: "PIN nao necessario", description: "Este evento nao requer PIN.", variant: "default" });
      onClose();
      return;
    }
    if (!event.dkpValue || event.dkpValue <= 0) {
      toast({ title: "Sem DKP", description: "Este evento nao concede DKP ou o valor e zero.", variant: "default" });
    }

    const enteredPin = pinInputs.join("");
    if (enteredPin !== event.pinCode) {
      toast({ title: "PIN Incorreto", description: "O codigo PIN inserido esta incorreto.", variant: "destructive" });
      setPinInputs(Array(6).fill("")); 
      return;
    }

    if (event.attendeesWithPin?.includes(currentUser.uid)) {
      toast({ title: "Presenca Ja Registrada", description: "Sua presenca (e DKP) para este evento ja foi registrada com PIN.", variant: "default" });
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
          targetUserId: currentUser.uid, 
          targetUserDisplayName: currentUser.displayName
        }
      );

      toast({ title: "Sucesso!", description: `Presenca registrada e ${event.dkpValue || 0} DKP creditados para ${event.title}.` });
      onClose();
    } catch (error) {
      console.error("Error submitting PIN and awarding DKP:", error);
      toast({ title: "Erro ao Registrar Presenca", description: "Nao foi possivel processar sua solicitacao.", variant: "destructive" });
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleRevealPin = () => {
    if (canCurrentUserRevealPin) { // Use the memoized value
      setShowPin(!showPin);
    } else {
      toast({ title: "Acesso Negado", description: "Voce nao tem permissao para revelar o PIN.", variant: "destructive" });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-headline text-primary flex items-center">
            <KeyRound className="mr-2 h-6 w-6" /> {event.title}
          </DialogTitle>
          <DialogDescription>
            {event.requiresPin 
              ? "Insira o codigo PIN de 6 digitos para registrar presenca e resgatar seus pontos DKP."
              : "Este evento nao requer um codigo PIN."}
          </DialogDescription>
        </DialogHeader>
        
        {event.requiresPin && (
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="pin-input-0" className="text-foreground">Codigo PIN do Evento</Label>
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
              Verificar Presenca e Resgatar DKP
            </Button>

            {canCurrentUserRevealPin && ( // Use memoized value
                <div className="space-y-2">
                    <Button variant="outline" onClick={handleRevealPin} className="w-full" disabled={isSubmittingPin}>
                        {showPin ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {showPin ? "Ocultar Codigo PIN" : "Revelar Codigo PIN"}
                    </Button>
                    {showPin && (
                        <div className="p-3 bg-muted rounded-md text-center">
                            <p className="text-2xl font-bold tracking-widest text-primary">{event.pinCode || "PIN nao disponivel"}</p>
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
