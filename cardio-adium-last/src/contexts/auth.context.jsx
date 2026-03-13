import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile } from '../services/auth.service';

const AuthContext = createContext(undefined);
const SESSION_STORAGE_KEY = 'campus_connect_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
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
            if (timestamp && Date.now() - timestamp > SESSION_DURATION) {
              window.localStorage.removeItem(SESSION_STORAGE_KEY);
              setUser(null);
              setIsUserLoading(false);
              return;
            }
            if (userId) {
              const userProfile = await getUserProfile(userId);
              if (userProfile) {
                setUser(userProfile);
                setUserError(null);
              } else {
                window.localStorage.removeItem(SESSION_STORAGE_KEY);
                setUser(null);
              }
            }
          } catch (error) {
            console.error('Error cargando sesión:', error);
            window.localStorage.removeItem(SESSION_STORAGE_KEY);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
        setUserError(error);
      } finally {
        setIsUserLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = (userProfile) => {
    try {
      setUser(userProfile);
      setUserError(null);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          userId: userProfile.id,
          email: userProfile.email,
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      console.error('Error guardando sesión:', error);
      setUserError(error);
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
      console.error('Error cerrando sesión:', error);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const userProfile = await getUserProfile(user.id);
      if (userProfile) setUser(userProfile);
      else logout();
    } catch (error) {
      console.error('Error refrescando usuario:', error);
      setUserError(error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isUserLoading, userError, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
