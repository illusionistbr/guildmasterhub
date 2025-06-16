
"use client";

import React, { useState } from 'react';
import type { Event as GuildEvent } from '@/types/guildmaster';
import { GuildRole } from '@/types/guildmaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EventPinDialogProps {
  event: GuildEvent | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: GuildRole | null;
  guildId: string | null;
}

export function EventPinDialog({ event, isOpen, onClose, currentUserRole, guildId }: EventPinDialogProps) {
  const [pinInputs, setPinInputs] = useState<string[]>(Array(6).fill(""));
  const [showPin, setShowPin] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    // Reset PIN inputs and visibility when dialog opens for a new event or closes
    if (isOpen) {
      setPinInputs(Array(6).fill(""));
      setShowPin(false);
    }
  }, [isOpen, event]);

  if (!event) return null;

  const handleInputChange = (index: number, value: string) => {
    if (/^[0-9]?$/.test(value)) { // Allow only single digit or empty string
      const newPinInputs = [...pinInputs];
      newPinInputs[index] = value;
      setPinInputs(newPinInputs);

      // Focus next input if a digit is entered
      if (value && index < 5) {
        const nextInput = document.getElementById(`pin-input-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinInputs[index] && index > 0) {
      const prevInput = document.getElementById(`pin-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmitPin = () => {
    const enteredPin = pinInputs.join("");
    // TODO: Implement PIN submission logic (check against event.pinCode)
    // For now, just show a toast.
    toast({ title: "Verificação de PIN", description: `PIN inserido: ${enteredPin}. Funcionalidade em desenvolvimento.` });
    onClose();
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
              ? "Insira o código PIN de 6 dígitos para registrar presença ou visualizar detalhes."
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
                    type="text" // Changed to text to handle single character better
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 text-center text-lg font-semibold form-input"
                    inputMode="numeric"
                  />
                ))}
              </div>
            </div>

            <Button onClick={handleSubmitPin} className="w-full btn-gradient btn-style-secondary">
              Verificar Presença (Em Breve)
            </Button>

            {canRevealPin && (
                <div className="space-y-2">
                    <Button variant="outline" onClick={handleRevealPin} className="w-full">
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
           {/* "Comprovar manualmente" button can be added here later if needed */}
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
