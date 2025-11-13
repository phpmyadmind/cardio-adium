"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, getUserProfile } from '@/services/auth.service';

interface AuthContextState {
  user: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
  login: (user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

const SESSION_STORAGE_KEY = 'campus_connect_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  // Cargar sesión desde localStorage al inicializar
  useEffect(() => {
    // Verificar que estamos en el cliente antes de acceder a localStorage
    if (typeof window === 'undefined') {
      setIsUserLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        setIsUserLoading(true);
        const sessionData = window.localStorage.getItem(SESSION_STORAGE_KEY);
        
        if (sessionData) {
          try {
            const session = JSON.parse(sessionData);
            const userId = session.userId;
            const timestamp = session.timestamp;
            
            // Verificar si la sesión ha expirado (30 días)
            if (timestamp && Date.now() - timestamp > SESSION_DURATION) {
              window.localStorage.removeItem(SESSION_STORAGE_KEY);
              setUser(null);
              setIsUserLoading(false);
              return;
            }
            
            if (userId) {
              // Verificar que el usuario aún existe en MongoDB
              const userProfile = await getUserProfile(userId);
              
              if (userProfile) {
                setUser(userProfile);
                setUserError(null);
              } else {
                // Si el usuario no existe, limpiar la sesión
                window.localStorage.removeItem(SESSION_STORAGE_KEY);
                setUser(null);
              }
            }
          } catch (error) {
            console.error("Error cargando sesión:", error);
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(SESSION_STORAGE_KEY);
            }
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error inicializando autenticación:", error);
        setUserError(error as Error);
      } finally {
        setIsUserLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = (userProfile: UserProfile) => {
    try {
      setUser(userProfile);
      setUserError(null);
      
      // Guardar sesión en localStorage (solo en el cliente)
      if (typeof window !== 'undefined') {
        const sessionData = {
          userId: userProfile.id,
          email: userProfile.email,
          timestamp: Date.now()
        };
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error("Error guardando sesión:", error);
      setUserError(error as Error);
    }
  };

  const logout = () => {
    try {
      setUser(null);
      setUserError(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error cerrando sesión:", error);
      setUserError(error as Error);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const userProfile = await getUserProfile(user.id);
      if (userProfile) {
        setUser(userProfile);
      } else {
        // Si el usuario no existe, cerrar sesión
        logout();
      }
    } catch (error) {
      console.error("Error refrescando usuario:", error);
      setUserError(error as Error);
    }
  };

  const value: AuthContextState = {
    user,
    isUserLoading,
    userError,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

