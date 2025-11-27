"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuthContext } from "@/contexts/auth.context";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import { useMemo, useEffect, useState } from "react";
import { findEventLogo } from "@/lib/event-resources";

interface EventTracker {
  id: string;
  name: string;
  isActive: boolean;
}

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
  const { user } = useAuthContext();
  const { data: eventTrackers } = useMongoCollection<EventTracker>('/api/event-trackers');
  const [logoPath, setLogoPath] = useState<string>('/logo_adium.png');

  // Obtener el event_tracker del usuario o el evento activo
  const eventTrackerId = useMemo(() => {
    if (user?.event_tracker) {
      return user.event_tracker;
    }
    // Si el usuario no tiene event_tracker, usar el evento activo
    const activeEvent = eventTrackers.find(et => et.isActive);
    return activeEvent?.id;
  }, [user?.event_tracker, eventTrackers]);

  // Determinar el logo a usar según el evento
  useEffect(() => {
    const loadLogo = async () => {
      if (eventTrackerId) {
        const logo = await findEventLogo(eventTrackerId);
        if (logo) {
          setLogoPath(logo);
        } else {
          // Fallback: buscar Logo_123 en la carpeta del evento directamente
          setLogoPath(`/${eventTrackerId}/Logo_123.jpg`);
        }
      } else {
        setLogoPath('/logo_adium.png');
      }
    };
    loadLogo();
  }, [eventTrackerId]);

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
    >
      <Image
        src={logoPath}
        alt="Adium Logo"
        width={100}
        height={100}
        className="w-full h-auto"
        data-ai-hint="polygonal heart"
        onError={() => {
          // Si falla, intentar con Logo_123.png o logo general
          if (eventTrackerId) {
            setLogoPath(`/${eventTrackerId}/Logo_123.png`);
          } else {
            setLogoPath('/logo_adium.png');
          }
        }}
      />
    </div>
  );
}
