import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
    >
      <Image
        src="/corazon_cardio.png"
        alt="Adium Logo"
        width={100}
        height={100}
        className="w-full h-auto"
        data-ai-hint="polygonal heart"
      />
    </div>
  );
}

export function LogoHead({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
    >
      <Image
        src="/logo_adium.png"
        alt="Adium Logo"
        width={100}
        height={100}
        className="w-full h-auto"
        data-ai-hint="polygonal heart"
      />
    </div>
  );
}
