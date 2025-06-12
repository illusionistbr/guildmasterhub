
"use client";

import type { UserProfile } from '@/types/guildmaster';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth as firebaseAuth, firebaseUpdateProfile, db, collection, query, where, limit, getDocs, setDoc, serverTimestamp } from '@/lib/firebase'; 
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
  login: (email?: string, password?: string) => Promise<string>; // Returns redirect path
  logout: () => Promise<void>;
  signup?: (nickname: string, email?: string, password?: string) => Promise<string>; // Returns redirect path
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentFirebaseUser: FirebaseUser | null) => {
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
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (userCredential.user) {
        setLoading(false);
        return '/guild-selection'; 
      }
      throw new Error("Login failed, user not found in credential.");
    } catch (error) {
      console.error("Erro no login:", error);
      setLoading(false);
      throw error; 
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (error) {
      console.error("Erro no logout:", error);
      throw error;
    }
  };
  
  const signup = async (nickname: string, email?: string, password?: string) => {
    if (!nickname || !email || !password) {
      throw new Error("Nickname, email e senha são obrigatórios para o cadastro.");
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const fbUser = userCredential.user;
      if (fbUser) {
        await firebaseUpdateProfile(fbUser, {
          displayName: nickname,
        });

        // Store user profile in Firestore 'users' collection
        const userDocRef = doc(db, "users", fbUser.uid);
        await setDoc(userDocRef, {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: nickname,
          photoURL: fbUser.photoURL || null, // Ensure photoURL is explicitly set or null
          createdAt: serverTimestamp(),
        });

        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: nickname,
          photoURL: fbUser.photoURL, 
        });
        setLoading(false);
        return '/guild-selection';
      }
      throw new Error("Signup failed, user not created.");
    } catch (error) {
      console.error("Erro no cadastro:", error);
      setLoading(false);
      throw error;
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
