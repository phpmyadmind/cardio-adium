"use client";

import { LogoHead } from "@/components/logo";
import { Menu, LogOut } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgendaView } from "@/components/agenda-view";
import { SpeakersView } from "@/components/speakers-view";
import { QaView } from "@/components/qa-view";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/auth.context";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DashboardPage() {
  const router = useRouter();
  const { logout } = useAuthContext();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"agenda" | "speakers" | "preguntas" | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Ha cerrado sesión exitosamente.",
    });
    router.push("/login");
  };

  if (activeView) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
        {/* Header */}
        <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center">
            <LogoHead className="w-[88px] h-[88px]" />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveView(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver al menú"
            >
              <Menu className="h-6 w-6 text-gray-800" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar sesión"
                  disabled={isLoggingOut}
                >
                  <LogOut className="h-6 w-6 text-gray-800" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Está seguro de que desea cerrar su sesión? Tendrá que iniciar sesión nuevamente para acceder al dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Cerrar sesión
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        {/* Content */}
        <main className="flex-grow px-4 sm:px-6 md:px-8 py-8 relative z-10">
          {activeView === "agenda" && <AgendaView />}
          {activeView === "speakers" && <SpeakersView />}
          {activeView === "preguntas" && <QaView />}
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

        {/* Footer */}
        <footer className="flex-shrink-0 w-full px-4 sm:px-6 pb-6 sm:pb-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-gray-600 text-[10px] sm:text-xs leading-tight">
            <p>
              Este evento está dirigido exclusivamente al cuerpo médico y es de carácter personal e intransferible. Adium no promociona ni promueve el uso de sus productos / medicamentos en forma diferente al aprobado por la Autoridad regulatoria e incluida en la información de prescripción o ficha técnica. Para mayor información comunicarse con el departamento médico de Adium S.A.S. Carrera 16 No. 85-96. Bogotá D.C. - Teléfono: +601 6460505 Si usted conoce un evento adverso/incidente de nuestros medicamentos / dispositivos médicos, por favor reportarlo a farmacovigilancia@adium.com.co
            </p>
            <p className="mt-2 font-medium">CO-2500361</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Header */}
      <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center">
          <LogoHead className="w-[84px] h-[84px]" />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar sesión"
              disabled={isLoggingOut}
            >
              <LogOut className="h-6 w-6 text-gray-800" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Está seguro de que desea cerrar su sesión? Tendrá que iniciar sesión nuevamente para acceder al dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700"
              >
                Cerrar sesión
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      {/* Main Content - Buttons */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 relative z-10">
        <div className="w-full max-w-sm space-y-4">
          <Button 
            onClick={() => setActiveView("agenda")}
            className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#F00808] hover:bg-[#d00707] text-white shadow-md"
          >
            AGENDA
          </Button>
          <Button 
            onClick={() => setActiveView("speakers")}
            className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
          >
            SPEAKERS
          </Button>
          <Button 
            onClick={() => setActiveView("preguntas")}
            className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
          >
            PREGUNTAS
          </Button>
          <Button 
            onClick={() => router.push('/dashboard/profile')}
            className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
          >
            MI PERFIL
          </Button>
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
          <p className="mt-2 font-medium">CO-2500361</p>
        </div>
      </footer>
    </div>
  );
}
