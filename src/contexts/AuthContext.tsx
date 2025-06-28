
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
  Auth,
} from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<string>; // Returns redirect path
  logout: () => Promise<void>;
  signup?: (nickname: string, email?: string, password?: string) => Promise<string>; // Returns redirect path
  auth: Auth; // Expose the auth object
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // [App Prototyper Note]: Firebase App Check is required for features like file uploads to Firebase Storage.
    // It has been temporarily disabled because it requires a reCAPTCHA v3 site key.
    // To enable it, you need to:
    // 1. Create a reCAPTCHA v3 site key in the Google Cloud or reCAPTCHA admin console.
    // 2. Add it to a .env.local file in your project root: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=YOUR_KEY_HERE`
    // 3. Uncomment the code block below.
    /*
    if (typeof window !== 'undefined') {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (siteKey) {
        try {
          initializeAppCheck(firebaseAuth.app, {
            provider: new ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: true,
          });
          console.log("Firebase App Check initialized.");
        } catch (e: any) {
          if (e.name !== 'FirebaseError' || e.code !== 'appCheck/already-initialized') {
            console.error("Error initializing Firebase App Check:", e);
          }
        }
      } else {
        console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. App Check is required for some Firebase features like file uploads.");
      }
    }
    */
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentFirebaseUser: FirebaseUser | null) => {
      if (currentFirebaseUser) {
        // ======================================================================
        // INSTRUÇÃO IMPORTANTE PARA O ADMINISTRADOR
        // Para ter acesso ao painel de administração, você precisa adicionar
        // seu User ID (UID) do Firebase a esta lista.
        //
        // COMO FAZER:
        // 1. Vá para o Firebase Console > Authentication > Users.
        // 2. Encontre sua conta de usuário e copie o "User UID".
        // 3. Cole o UID dentro das aspas abaixo, substituindo o texto de exemplo.
        //
        // Exemplo: const ADMIN_UIDS = ['AbCdeFgHiJkLmNoPqRsTuVwXyZ12345'];
        // Você pode adicionar mais administradores separando por vírgula:
        // Exemplo: const ADMIN_UIDS = ['UID_ADMIN_1', 'UID_ADMIN_2'];
        // ======================================================================
        const ADMIN_UIDS = ['Y3W5w0EcrMQOtep8OzqxJnrbrdj2'];
        const isAdmin = ADMIN_UIDS.includes(currentFirebaseUser.uid);
        
        const userDocRef = doc(db, "users", currentFirebaseUser.uid);
        const userDocSnap = await getFirestoreDoc(userDocRef);

        let profileData: UserProfile;

        if (userDocSnap.exists()) {
          const firestoreData = userDocSnap.data();
          profileData = {
            uid: currentFirebaseUser.uid,
            email: currentFirebaseUser.email,
            displayName: currentFirebaseUser.displayName,
            photoURL: currentFirebaseUser.photoURL,
            ...firestoreData, // Firestore data overrides auth data
            isAdmin: isAdmin, // Ensure admin status from code overrides DB
          } as UserProfile;
        } else {
           // If the user doc doesn't exist, create it.
           // This handles cases where a user was created in Auth but not Firestore.
           const newProfileData: Omit<UserProfile, 'isAdmin'> = {
              uid: currentFirebaseUser.uid,
              email: currentFirebaseUser.email,
              displayName: currentFirebaseUser.displayName,
              photoURL: currentFirebaseUser.photoURL,
              createdAt: serverTimestamp(), // Add creation timestamp
              guilds: [],
              lastNotificationsCheckedTimestamp: {},
              proTrialUsed: false
           };
           await setDoc(userDocRef, newProfileData);
           profileData = { ...newProfileData, isAdmin } as UserProfile;
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
      throw new Error("E-mail e senha são obrigatórios para o login.");
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
      throw new Error("Nickname, e-mail e senha são obrigatórios para o cadastro.");
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
          proTrialUsed: false,
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
    <AuthContext.Provider value={{ user, loading, login, logout, signup, auth: firebaseAuth }}>
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
