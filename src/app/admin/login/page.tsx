"use client";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { LogoHead } from "@/components/logo";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminLoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 relative z-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-8">
            <LogoHead className="mb-4 w-[84px] h-[84px]" />
            <h1 className="text-4xl font-headline font-bold text-gray-800">
              Panel de Administración
            </h1>
            <p className="mt-2 text-gray-600">
              Por favor inicie sesión para continuar.
            </p>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Iniciar Sesión</CardTitle>
              <CardDescription>
                Ingrese sus credenciales de administrador a continuación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminLoginForm />
            </CardContent>
          </Card>
          <p className="px-8 text-center text-sm text-gray-600 mt-4">
            ¿Necesita crear una nueva cuenta de administrador?{" "}
            <Link
              href="/admin/register"
              className="underline underline-offset-4 hover:text-[#2E61FA] text-[#2E61FA] font-medium"
            >
              Regístrese aquí
            </Link>
            .
          </p>
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
