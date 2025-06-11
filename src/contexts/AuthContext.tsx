
"use client";

import type { UserProfile } from '@/types/guildmaster';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth as firebaseAuth, firebaseUpdateProfile } from '@/lib/firebase'; 
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
} from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  signup?: (nickname: string, email?: string, password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentFirebaseUser: FirebaseUser | null) => {
      if (currentFirebaseUser) {
        setUser({
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email,
          displayName: currentFirebaseUser.displayName,
          photoURL: currentFirebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email?: string, password?: string) => {
    if (!email || !password) {
      throw new Error("Email e senha são obrigatórios para o login.");
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // O estado do usuário será atualizado por onAuthStateChanged
    } catch (error) {
      console.error("Erro no login:", error);
      throw error; 
    } finally {
      // setLoading(false); // onAuthStateChanged cuidará disso
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(firebaseAuth);
      // O estado do usuário será atualizado por onAuthStateChanged
    } catch (error) {
      console.error("Erro no logout:", error);
      throw error;
    } finally {
      // setLoading(false); // onAuthStateChanged cuidará disso
    }
  };
  
  const signup = async (nickname: string, email?: string, password?: string) => {
    if (!nickname || !email || !password) {
      throw new Error("Nickname, email e senha são obrigatórios para o cadastro.");
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (userCredential.user) {
        await firebaseUpdateProfile(userCredential.user, {
          displayName: nickname,
        });
        // Atualiza o estado local imediatamente para refletir o displayName.
        // onAuthStateChanged pode demorar um pouco ou não pegar a mudança de perfil instantaneamente.
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: nickname,
          photoURL: userCredential.user.photoURL, 
        });
      }
    } catch (error) {
      console.error("Erro no cadastro:", error);
      throw error;
    } finally {
      setLoading(false); // Certifique-se de que o loading é desativado aqui, pois onAuthStateChanged pode não ser rápido o suficiente para o feedback de UI
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
