'use client';

import React, { type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth.context';

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Provider principal de la aplicación
 * Ahora solo maneja autenticación, ya que MongoDB se accede a través de API routes
 */
export function AppProvider({ children }: AppProviderProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

// Mantener el nombre anterior para compatibilidad
export const FirebaseClientProvider = AppProvider;