import { LogoHead } from "../components/logo";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <main className="relative z-10 flex flex-col min-h-screen">
        <div className="flex-shrink-0 pt-12 sm:pt-16 pb-8">
          <div className="flex justify-center px-8 sm:px-12">
            <div className="w-full max-w-sm">
              <LogoHead className="w-full" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center px-8 sm:px-12">
          <div className="w-full max-w-sm space-y-4">
            <Button
              className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#FD0233] hover:bg-[#d00707] text-white shadow-md"
              asChild
            >
              <Link to="/dashboard">INICIAR</Link>
            </Button>
          </div>
        </div>

        <div className="flex-shrink-0 relative w-full pt-8 sm:pt-12 pb-20 sm:pb-24">
          <div className="relative z-10 flex justify-center">
            <img
              src="/corazon.gif"
              alt="Polygonal Heart"
              width={100}
              height={100}
              className="w-56 sm:w-64 md:w-72 h-auto drop-shadow-lg"
              data-ai-hint="polygonal heart"
            />
          </div>
        </div>

        <footer className="flex-shrink-0 w-full px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="max-w-4xl mx-auto text-center text-gray-600 text-[10px] sm:text-xs leading-tight">
            <p>
              Este evento está dirigido exclusivamente al cuerpo médico y es de carácter personal e intransferible. Adium no promociona ni promueve el uso de sus productos / medicamentos en forma diferente al aprobado por la Autoridad regulatoria e incluida en la información de prescripción o ficha técnica. Para mayor información comunicarse con el departamento médico de Adium S.A.S. Carrera 16 No. 85-96. Bogotá D.C. - Teléfono: +601 6460505 Si usted conoce un evento adverso/incidente de nuestros medicamentos / dispositivos médicos, por favor reportarlo a farmacovigilancia@adium.com.co
            </p>
            <p className="mt-2">
              <Link to="/terms" className="text-[#2E61FA] hover:underline font-medium">Política de Privacidad</Link>
              {' · '}
              <span className="font-medium">CO-2600050</span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
