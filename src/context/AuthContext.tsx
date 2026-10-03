'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from '@/lib/firebase';
import api from '@/lib/axios';

export type UserRole = 'developer' | 'dealer' | 'admin' | 'user';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  mongoId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isDeveloper: boolean;
  isDealer: boolean;        // true for dealer AND developer
  isAdmin: boolean;         // true for both admin AND developer
  isUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDeveloper: false,
  isDealer: false,
  isAdmin: false,
  isUser: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  register: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
});

// After Firebase login → sync to MongoDB to get the stored role
async function syncRoleFromDB(firebaseUser: User): Promise<AuthUser> {
  try {
    const res = await api.post('/users/sync', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || '',
    });
    const data = res.data.data;
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      role: data.role as UserRole,
      mongoId: data._id,
    };
  } catch {
    // Fallback if backend not reachable
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      role: 'user',
    };
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const appUser = await syncRoleFromDB(firebaseUser);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const appUser = await syncRoleFromDB(res.user);
    setUser(appUser);
  };

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    const appUser = await syncRoleFromDB(res.user);
    setUser(appUser);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(res.user, { displayName });
    const appUser = await syncRoleFromDB(res.user);
    setUser(appUser);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const isDeveloper = user?.role === 'developer';
  const isDealer = user?.role === 'dealer' || user?.role === 'developer';
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';
  const isUser = !!user;

  // Sync Firebase UID to axios headers so backend can identify the caller
  React.useEffect(() => {
    if (user?.uid) {
      api.defaults.headers.common['x-user-uid'] = user.uid;
    } else {
      delete api.defaults.headers.common['x-user-uid'];
    }
  }, [user?.uid]);

  return (
    <AuthContext.Provider
      value={{ user, loading, isDeveloper, isDealer, isAdmin, isUser, login, loginWithGoogle, register, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
