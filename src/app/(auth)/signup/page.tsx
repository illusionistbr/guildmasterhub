
"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { User, UserPlus, Mail, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Corrected import
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) {
      setError("O nickname é obrigatório.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (signup) {
        const redirectPath = await signup(nickname, email, password); 
        toast({ title: "Conta criada com sucesso!", description: "Redirecionando..." });
        router.push(redirectPath); 
      } else {
        setError("Funcionalidade de cadastro não implementada.");
        toast({ title: "Erro", description: "Funcionalidade de cadastro não implementada.", variant: "destructive" });
      }
    } catch (err: any) {
      let errorMessage = "Falha ao criar conta. Verifique os dados e tente novamente.";
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "Este email já está em uso. Tente outro.";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      setError(errorMessage);
      toast({ title: "Erro no Cadastro", description: errorMessage, variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Crie Sua Conta</CardTitle>
        <CardDescription>Junte-se ao GuildMasterHub e comece a gerenciar sua guilda hoje mesmo!</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <div className="relative flex items-center">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="nickname" 
                type="text" 
                placeholder="SeuApelidoNoJogo" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required 
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="seuemail@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
             <div className="relative flex items-center">
              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="password" 
                type="password" 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="********" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
                className="form-input pl-10"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full btn-gradient btn-style-primary" disabled={loading}>
            {loading ? "Criando conta..." : <><UserPlus className="mr-2 h-5 w-5"/> Criar Conta </>}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Button variant="link" asChild className="text-primary hover:underline p-0">
            <Link href="/login">Faça login</Link>
          </Button>
        </p>
      </CardFooter>
    </>
  );
}
