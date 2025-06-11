"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateWelcomeMessage, type GenerateWelcomeMessageInput } from '@/ai/flows/generate-welcome-message';
import { useToast } from "@/hooks/use-toast";
import { Bot, Copy, Send, Wand2 } from "lucide-react";
import { PageTitle } from '@/components/shared/PageTitle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function WelcomeToolPage() {
  const [formData, setFormData] = useState<GenerateWelcomeMessageInput>({
    newMemberName: '',
    guildName: '',
    guildLore: '',
    guildInJokes: ''
  });
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.newMemberName || !formData.guildName) {
      toast({
        title: "Campos Obrigatórios",
        description: "Nome do novo membro e nome da guilda são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setWelcomeMessage(null);
    try {
      const result = await generateWelcomeMessage(formData);
      setWelcomeMessage(result.welcomeMessage);
      toast({
        title: "Mensagem Gerada!",
        description: "Sua mensagem de boas-vindas personalizada está pronta.",
      });
    } catch (error) {
      console.error("Error generating welcome message:", error);
      toast({
        title: "Erro ao Gerar Mensagem",
        description: "Não foi possível gerar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (welcomeMessage) {
      navigator.clipboard.writeText(welcomeMessage);
      toast({ title: "Copiado!", description: "Mensagem copiada para a área de transferência." });
    }
  };

  return (
    <div className="space-y-8">
      <PageTitle 
        title="Gerador de Boas-Vindas com IA"
        description="Crie mensagens de boas-vindas personalizadas para novos membros da sua guilda."
        icon={Bot}
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="card-bg">
          <CardHeader>
            <CardTitle className="flex items-center"><Wand2 className="mr-2 h-6 w-6 text-primary" /> Detalhes para Personalização</CardTitle>
            <CardDescription>Forneça informações para a IA criar a mensagem perfeita.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="newMemberName">Nome do Novo Membro <span className="text-destructive">*</span></Label>
                <Input
                  id="newMemberName"
                  name="newMemberName"
                  value={formData.newMemberName}
                  onChange={handleChange}
                  placeholder="Ex: O Bravo Aventureiro"
                  required
                  className="mt-1 form-input"
                />
              </div>
              <div>
                <Label htmlFor="guildName">Nome da Guilda <span className="text-destructive">*</span></Label>
                <Input
                  id="guildName"
                  name="guildName"
                  value={formData.guildName}
                  onChange={handleChange}
                  placeholder="Ex: Os Protetores do Reino"
                  required
                  className="mt-1 form-input"
                />
              </div>
              <div>
                <Label htmlFor="guildLore">História da Guilda (Opcional)</Label>
                <Textarea
                  id="guildLore"
                  name="guildLore"
                  value={formData.guildLore}
                  onChange={handleChange}
                  placeholder="Ex: Fundada nas cinzas de uma batalha antiga..."
                  rows={3}
                  className="mt-1 form-input"
                />
              </div>
              <div>
                <Label htmlFor="guildInJokes">Piadas Internas (Opcional)</Label>
                <Textarea
                  id="guildInJokes"
                  name="guildInJokes"
                  value={formData.guildInJokes}
                  onChange={handleChange}
                  placeholder="Ex: Lembre-se, nunca toque no frango de estimação do Mestre!"
                  rows={3}
                  className="mt-1 form-input"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full btn-gradient btn-style-primary">
                {isLoading ? (
                  <Bot className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                {isLoading ? 'Gerando...' : 'Gerar Mensagem'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="card-bg sticky top-24">
          <CardHeader>
            <CardTitle className="flex items-center"><Bot className="mr-2 h-6 w-6 text-primary" /> Mensagem Gerada</CardTitle>
            <CardDescription>Aqui está a mensagem de boas-vindas criada pela IA.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px] flex flex-col">
            {isLoading && (
              <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground">
                <Bot className="h-12 w-12 mb-4 animate-bounce text-primary" />
                <p>A IA está conjurando sua mensagem...</p>
              </div>
            )}
            {!isLoading && welcomeMessage && (
              <Alert variant="default" className="flex-grow bg-background border-primary/30">
                <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div className="ml-3">
                    <AlertTitle className="font-semibold text-foreground">Sua Mensagem Personalizada:</AlertTitle>
                    <AlertDescription className="text-foreground/90 whitespace-pre-wrap">
                        {welcomeMessage}
                    </AlertDescription>
                </div>
              </Alert>
            )}
            {!isLoading && !welcomeMessage && (
              <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground">
                <Wand2 className="h-12 w-12 mb-4" />
                <p>Sua mensagem aparecerá aqui após a geração.</p>
              </div>
            )}
          </CardContent>
          {welcomeMessage && !isLoading && (
            <CardFooter>
              <Button onClick={handleCopy} variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
                <Copy className="mr-2 h-4 w-4" /> Copiar Mensagem
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
