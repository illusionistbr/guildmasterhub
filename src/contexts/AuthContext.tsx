
"use client";

import type { UserProfile } from '@/types/guildmaster';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth as firebaseAuth, firebaseUpdateProfile, db, collection, query, where, limit, getDocs, setDoc, serverTimestamp, doc, getDoc as getFirestoreDoc } from '@/lib/firebase'; 
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
        const userDocRef = doc(db, "users", currentFirebaseUser.uid);
        const userDocSnap = await getFirestoreDoc(userDocRef);
        
        let profileData: UserProfile = {
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email,
          displayName: currentFirebaseUser.displayName,
          photoURL: currentFirebaseUser.photoURL,
          // Initialize potentially missing fields to ensure type consistency
          guilds: [], 
          lastNotificationsCheckedTimestamp: {},
        };

        if (userDocSnap.exists()) {
          const firestoreData = userDocSnap.data();
          profileData = {
            ...profileData, // Base data from auth
            ...firestoreData, // Override with Firestore data
            // Ensure nested objects are properly merged or initialized
            lastNotificationsCheckedTimestamp: firestoreData.lastNotificationsCheckedTimestamp || {},
          } as UserProfile;
        }
        setUser(profileData);
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
        // User profile will be updated by onAuthStateChanged listener
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
      // User state will be set to null by onAuthStateChanged
    } catch (error) {
      console.error("Erro no logout:", error);
      throw error;
    } finally {
        setLoading(false); // Ensure loading is set to false in logout
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

        const userDocRef = doc(db, "users", fbUser.uid);
        const newUserProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: nickname,
          photoURL: fbUser.photoURL || null,
          createdAt: serverTimestamp(),
          guilds: [],
          lastNotificationsCheckedTimestamp: {},
        };
        await setDoc(userDocRef, newUserProfile);
        
        // setUser state will be updated by onAuthStateChanged listener with this new data
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
