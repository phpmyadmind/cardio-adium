"use client";

import { useAuthContext } from "@/contexts/auth.context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Skeleton } from "./ui/skeleton";

const SESSION_STORAGE_KEY = 'campus_connect_session';

// Función helper para verificar si hay sesión en localStorage
const hasSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const sessionData = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      return !!session.userId;
    }
  } catch (error) {
    return false;
  }
  return false;
};

export function UserAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);
  const isDashboardRoute = pathname?.startsWith('/dashboard') ?? false;

  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // REGLA CRÍTICA: Si hay sesión en localStorage, NUNCA redirigir
    // Esto previene redirecciones durante transiciones dentro del dashboard
    const sessionExists = hasSession();
    if (sessionExists) {
      hasRedirectedRef.current = false;
      // No hacer nada más, confiar en que el contexto cargará el usuario
      return;
    }

    // Si hay usuario, cancelar cualquier redirección pendiente
    if (user) {
      hasRedirectedRef.current = false;
      return;
    }

    // Solo redirigir si NO hay sesión en localStorage y ya terminó de cargar
    // Para rutas del dashboard, usar un delay más largo para evitar redirecciones durante transiciones
    if (!isUserLoading && !user && !sessionExists && !hasRedirectedRef.current) {
      const delay = isDashboardRoute ? 500 : 200;
      
      redirectTimeoutRef.current = setTimeout(() => {
        // Verificar una última vez antes de redirigir
        // Si ahora hay sesión o usuario, cancelar la redirección
        const finalSessionCheck = hasSession();
        if (!finalSessionCheck && !user) {
          hasRedirectedRef.current = true;
          router.replace("/login");
        } else {
          hasRedirectedRef.current = false;
        }
      }, delay);
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [user, isUserLoading, router, isDashboardRoute]);

  // PRIORIDAD 1: Si hay usuario cargado, siempre renderizar
  if (user) {
    return <>{children}</>;
  }

  // PRIORIDAD 2: Si hay sesión en localStorage, siempre renderizar
  // Esto es CRÍTICO para evitar redirecciones durante transiciones dentro del dashboard
  // El contexto de autenticación se encargará de cargar el usuario eventualmente
  if (hasSession()) {
    return <>{children}</>;
  }

  // PRIORIDAD 3: Si está cargando (primera carga), mostrar skeleton
  if (isUserLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // PRIORIDAD 4: Solo mostrar skeleton mientras redirige si realmente no hay sesión
  // Este caso solo debería ocurrir cuando el usuario no está autenticado
  if (!user && !isUserLoading && !hasSession()) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Por defecto, renderizar contenido (nunca debería llegar aquí si la lógica está correcta)
  return <>{children}</>;
}

