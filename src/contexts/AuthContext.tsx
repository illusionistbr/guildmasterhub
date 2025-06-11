
"use client";

import type { UserProfile } from '@/types/guildmaster';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth as firebaseAuth, firebaseUpdateProfile, db, collection, query, where, limit, getDocs } from '@/lib/firebase'; 
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

async function getUserGuildRedirectPath(userId: string): Promise<string> {
  const qOwned = query(collection(db, "guilds"), where("ownerId", "==", userId), limit(1));
  const qMember = query(collection(db, "guilds"), where("memberIds", "array-contains", userId), limit(1));

  const [ownedSnapshot, memberSnapshot] = await Promise.all([getDocs(qOwned), getDocs(qMember)]);

  if (ownedSnapshot.empty && memberSnapshot.empty) {
    return '/guild-selection';
  }
  if (!ownedSnapshot.empty) return `/dashboard?guildId=${ownedSnapshot.docs[0].id}`;
  if (!memberSnapshot.empty) return `/dashboard?guildId=${memberSnapshot.docs[0].id}`;
  return '/dashboard'; // Fallback, should ideally have a guildId
}

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
        // User state will be set by onAuthStateChanged
        // Determine redirect path after user state is confirmed
        const redirectPath = await getUserGuildRedirectPath(userCredential.user.uid);
        setLoading(false);
        return redirectPath;
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
      // User state will be set by onAuthStateChanged
    } catch (error) {
      console.error("Erro no logout:", error);
      throw error;
    } finally {
      // setLoading(false); // onAuthStateChanged handles this
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
        // Manually update user state here because onAuthStateChanged might not be fast enough
        // or might not pick up profile update immediately for the redirect logic.
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: nickname,
          photoURL: userCredential.user.photoURL, 
        });
        // Since it's a new user, they won't have guilds yet.
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
