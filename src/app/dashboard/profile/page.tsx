"use client";

import { useAuthContext } from "@/contexts/auth.context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, User as UserIcon, Mail, Badge, MapPin, Stethoscope } from "lucide-react";
import { LogoHead } from "@/components/logo";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function ProfileDetail({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined }) {
    return (
        <div className="flex items-start gap-4">
            <Icon className="h-5 w-5 text-[#2E61FA] mt-1" />
            <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-600">{label}</p>
                {value ? <p className="text-base font-semibold text-gray-800">{value}</p> : <Skeleton className="h-6 w-48 mt-1" />}
            </div>
        </div>
    );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isUserLoading } = useAuthContext();

  // Redirigir al login si no hay usuario
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Header */}
      <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center">
          <LogoHead className="w-[88px] h-[88px]" />
        </div>
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-2"
        >
          <Menu className="h-6 w-6 text-gray-800" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-4 sm:px-6 md:px-8 py-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-2 text-gray-800">
                <UserIcon className="h-6 w-6 text-[#2E61FA]" /> Mi Perfil
              </CardTitle>
              <CardDescription className="text-gray-600">
                Esta es la información asociada con su cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <>
                  <ProfileDetail icon={UserIcon} label="Nombre Completo" value={undefined} />
                  <ProfileDetail icon={Mail} label="Correo Electrónico" value={undefined} />
                  <ProfileDetail icon={Badge} label="Número de Identificación" value={undefined} />
                  <ProfileDetail icon={Stethoscope} label="Especialidad" value={undefined} />
                  <ProfileDetail icon={MapPin} label="Ciudad" value={undefined} />
                </>
              ) : user ? (
                <>
                  <ProfileDetail icon={UserIcon} label="Nombre Completo" value={user.name} />
                  <ProfileDetail icon={Mail} label="Correo Electrónico" value={user.email} />
                  <ProfileDetail icon={Badge} label="Número de Identificación" value={user.medicalId} />
                  <ProfileDetail icon={Stethoscope} label="Especialidad" value={user.specialty} />
                  <ProfileDetail icon={MapPin} label="Ciudad" value={user.city} />
                </>
              ) : null}
            </CardContent>
          </Card>
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

