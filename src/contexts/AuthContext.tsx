"use client";

import type { UserProfile } from '@/types/guildmaster';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { auth as firebaseAuth } from '@/lib/firebase'; // In a real app
// import type { User as FirebaseUser } from 'firebase/auth'; // In a real app

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  signup?: (email?: string, password?: string) => Promise<void>; // Optional for this mock
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock an authenticated user for development
    // In a real app, you'd use onAuthStateChanged here
    const mockAuthCheck = setTimeout(() => {
      // To test unauthenticated state, set this to null
      setUser({ 
        uid: 'user-owner-123', // Matches ownerId in one of the mock guilds
        email: 'testuser@example.com', 
        displayName: 'Test User',
        photoURL: 'https://placehold.co/100x100.png?text=TU'
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(mockAuthCheck);
  }, []);

  const login = async (email?: string, password?: string) => {
    setLoading(true);
    // Mock login
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({ 
        uid: 'user-owner-123', 
        email: email || 'testuser@example.com', 
        displayName: 'Logged In User',
        photoURL: 'https://placehold.co/100x100.png?text=LI' 
    });
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    // Mock logout
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setLoading(false);
  };
  
  const signup = async (email?: string, password?: string) => {
    setLoading(true);
    // Mock signup
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({ 
        uid: 'new-user-uid', 
        email: email || 'newuser@example.com', 
        displayName: 'New User',
        photoURL: 'https://placehold.co/100x100.png?text=NU' 
    });
    setLoading(false);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
