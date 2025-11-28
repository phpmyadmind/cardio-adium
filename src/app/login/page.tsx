"use client";

import { UserLoginForm } from "@/components/user-login-form";
import { LogoHead } from "@/components/logo";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/auth.context";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function LoginPage() {
  const router = useRouter();
  const { user, isUserLoading } = useAuthContext();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Verificar sesión antes de mostrar el formulario de login
    const checkSession = async () => {
      // Si hay usuario autenticado, redirigir al dashboard
      if (user) {
        router.replace("/dashboard");
        return;
      }

      // Si hay sesión en localStorage, redirigir al dashboard
      // El contexto de autenticación se encargará de cargar el usuario
      if (hasSession()) {
        router.replace("/dashboard");
        return;
      }

      // Si ya terminó de cargar y no hay usuario ni sesión, mostrar el formulario
      if (!isUserLoading) {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [user, isUserLoading, router]);

  // Mostrar skeleton mientras se verifica la sesión
  if (isChecking || isUserLoading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
        {/* Header */}
        <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <LogoHead className="w-[88px] h-[88px]" />
          </div>
          <button className="p-2">
            <Menu className="h-6 w-6 text-gray-800" />
          </button>
        </header>

        {/* Main Content - Loading */}
        <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 relative z-10">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </main>

        {/* Heart and ECG Section - Bottom */}
        <div className="flex-shrink-0 relative w-full pb-20 sm:pb-24 mt-auto">
          <div className="absolute inset-0 flex justify-center items-center -z-10">
            <svg 
              viewBox="0 0 700 100" 
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <path 
                d="M0 50 H 50 C 60 50, 65 40, 70 50 L 80 50 L 85 55 L 95 10 L 105 90 L 115 50 C 125 50, 130 60, 140 50 H 180 C 190 50, 195 40, 200 50 L 210 50 L 215 55 L 225 10 L 235 90 L 245 50 C 255 50, 260 60, 270 50 H 310 C 320 50, 325 40, 330 50 L 340 50 L 345 55 L 355 10 L 365 90 L 375 50 C 385 50, 390 60, 400 50 H 440 C 450 50, 455 40, 460 50 L 470 50 L 475 55 L 485 10 L 495 90 L 505 50 C 515 50, 520 60, 530 50 H 570 C 580 50, 585 40, 590 50 L 600 50 L 605 55 L 615 10 L 625 90 L 635 50 C 645 50, 650 60, 660 50 H 800" 
                stroke="#2E61FA" 
                strokeWidth="6" 
                fill="none"
                className="heart-beat-line"
              />
            </svg>
          </div>
          
          <div className="relative z-10 flex justify-center">
            <Image
              src="/corazon_cardio.png"
              alt="Polygonal Heart"
              width={100}
              height={100}
              className="w-40 sm:w-48 md:w-56 h-auto drop-shadow-lg"
              data-ai-hint="polygonal heart"
              priority
            />
          </div>
        </div>
      </div>
    );
  }

  // Si no hay sesión, mostrar el formulario de login
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Header */}
      <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          <LogoHead className="w-[88px] h-[88px]" />
        </div>
        <button className="p-2">
          <Menu className="h-6 w-6 text-gray-800" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold font-headline text-gray-800 mb-2">
                Iniciar Sesión
              </h1>
              <p className="text-gray-600">
                Ingrese sus credenciales para acceder
              </p>
            </div>
            <UserLoginForm />
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿No tiene una cuenta?{" "}
                <Link href="/register" className="text-[#4267B2] hover:underline font-medium">
                  Regístrese aquí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Heart and ECG Section - Bottom */}
      <div className="flex-shrink-0 relative w-full pb-20 sm:pb-24 mt-auto">
        {/* ECG Line - Behind heart */}
        <div className="absolute inset-0 flex justify-center items-center -z-10">
          <svg 
            viewBox="0 0 700 100" 
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            <path 
              d="M0 50 H 50 C 60 50, 65 40, 70 50 L 80 50 L 85 55 L 95 10 L 105 90 L 115 50 C 125 50, 130 60, 140 50 H 180 C 190 50, 195 40, 200 50 L 210 50 L 215 55 L 225 10 L 235 90 L 245 50 C 255 50, 260 60, 270 50 H 310 C 320 50, 325 40, 330 50 L 340 50 L 345 55 L 355 10 L 365 90 L 375 50 C 385 50, 390 60, 400 50 H 440 C 450 50, 455 40, 460 50 L 470 50 L 475 55 L 485 10 L 495 90 L 505 50 C 515 50, 520 60, 530 50 H 570 C 580 50, 585 40, 590 50 L 600 50 L 605 55 L 615 10 L 625 90 L 635 50 C 645 50, 650 60, 660 50 H 800" 
              stroke="#2E61FA" 
              strokeWidth="6" 
              fill="none" 
              className="heart-beat-line"
            />
          </svg>
        </div>
        
        {/* Heart Image */}
        <div className="relative z-10 flex justify-center">
          <Image
            src="/corazon_cardio.png"
            alt="Polygonal Heart"
            width={100}
            height={100}
            className="w-40 sm:w-48 md:w-56 h-auto drop-shadow-lg"
            data-ai-hint="polygonal heart"
            priority
          />
        </div>
      </div>

      {/* Footer - Disclaimer */}
      <footer className="flex-shrink-0 w-full px-4 sm:px-6 pb-6 sm:pb-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-gray-600 text-[10px] sm:text-xs leading-tight">
          <p>
            Este evento está dirigido exclusivamente al cuerpo médico y es de carácter personal e intransferible. Adium no promociona ni promueve el uso de sus productos / medicamentos en forma diferente al aprobado por la Autoridad regulatoria e incluida en la información de prescripción o ficha técnica. Para mayor información comunicarse con el departamento médico de Adium S.A.S. Carrera 16 No. 85-96. Bogotá D.C. - Teléfono: +601 6460505 Si usted conoce un evento adverso/incidente de nuestros medicamentos / dispositivos médicos, por favor reportarlo a farmacovigilancia@adium.com.co
          </p>
          <p className="mt-2 font-medium">CO-2500362</p>
        </div>
      </footer>
    </div>
  );
}

