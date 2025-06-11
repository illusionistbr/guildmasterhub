
"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, Mail, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Corrected import
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const redirectPath = await login(email, password);
      toast({ title: "Login bem-sucedido!", description: "Redirecionando..." });
      router.push(redirectPath);
    } catch (err: any) {
      setError("Falha ao fazer login. Verifique suas credenciais.");
      console.error(err);
      toast({ title: "Erro no Login", description: err.message || "Verifique suas credenciais.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Bem-vindo de Volta!</CardTitle>
        <CardDescription>Acesse sua conta para gerenciar sua guilda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-6">
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
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full btn-gradient btn-style-primary" disabled={loading}>
            {loading ? "Entrando..." : <> <LogIn className="mr-2 h-5 w-5" /> Entrar </>}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Button variant="link" asChild className="text-sm text-primary hover:underline">
          <Link href="/forgot-password">Esqueceu sua senha?</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Button variant="link" asChild className="text-primary hover:underline p-0">
            <Link href="/signup">Crie uma agora</Link>
          </Button>
        </p>
      </CardFooter>
    </>
  );
}
