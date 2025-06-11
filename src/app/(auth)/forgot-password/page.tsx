
"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, LogIn } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // In a real app, you would call your backend/Firebase to send a password reset email
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setLoading(false);
    toast({
      title: "Link Enviado!",
      description: `Se uma conta com o email ${email} existir, um link de recuperação foi enviado.`,
    });
    setEmail("");
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Recuperar Senha</CardTitle>
        <CardDescription>
          Insira seu email para receber um link de recuperação de senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
          <Button type="submit" className="w-full btn-gradient btn-style-primary" disabled={loading}>
            {loading ? "Enviando..." : <> <Mail className="mr-2 h-5 w-5" /> Enviar Link de Recuperação </>}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <Button variant="link" asChild className="text-sm text-primary hover:underline">
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" /> Voltar para o Login
          </Link>
        </Button>
      </CardFooter>
    </>
  );
}
