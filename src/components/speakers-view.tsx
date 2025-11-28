"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { Speaker } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import { QRCodeViewer } from "./qr-code-viewer";
import { useAuthContext } from "@/contexts/auth.context";
import { findEventLogo } from "@/lib/event-resources";
import { normalizeImageUrl } from "@/lib/image-utils";

interface EventTracker {
  id: string;
  name: string;
  isActive: boolean;
}

export function SpeakersView() {
  const { user } = useAuthContext();
  const { data: eventTrackers } = useMongoCollection<EventTracker>('/api/event-trackers');
  const [logoPath, setLogoPath] = useState<string>('/Logo_123.jpg');

  // Obtener el event_tracker del usuario o el evento activo
  const eventTrackerId = useMemo(() => {
    if (user?.event_tracker) {
      return user.event_tracker;
    }
    // Si el usuario no tiene event_tracker, usar el evento activo
    const activeEvent = eventTrackers.find(et => et.isActive);
    return activeEvent?.id;
  }, [user?.event_tracker, eventTrackers]);

  // Construir endpoint con filtro de eventTrackerId
  const speakersEndpoint = useMemo(() => {
    return eventTrackerId 
      ? `/api/speakers?eventTrackerId=${encodeURIComponent(eventTrackerId)}`
      : '/api/speakers';
  }, [eventTrackerId]);

  const { data: speakers, isLoading } = useMongoCollection<Speaker>(speakersEndpoint);

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
        setLogoPath('/Logo_123.jpg');
      }
    };
    loadLogo();
  }, [eventTrackerId]);
  
  if (isLoading) {
    return <div className="text-center py-8">Cargando ponentes...</div>;
  }
  
  if (!speakers || speakers.length === 0) {
    return <div className="text-center py-8">No hay ponentes disponibles.</div>;
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="flex items-center justify-between w-full mb-4">
          <div className="flex-1"></div>
          <Image
            src={logoPath}
            alt="Event Logo"
            width={400}
            height={200}
            className="w-full max-w-md h-auto"
            priority
            onError={() => {
              // Si falla, intentar con Logo_123.png o logo general
              if (eventTrackerId) {
                setLogoPath(`/${eventTrackerId}/Logo_123.png`);
              } else {
                setLogoPath('/Logo_123.jpg');
              }
            }}
          />
          <div className="flex-1 flex justify-end">
            <QRCodeViewer viewName="speakers" label="Speakers" />
          </div>
        </div>
        <h2 className="text-3xl font-bold font-headline text-primary">Ponentes Destacados</h2>
        <p className="text-muted-foreground mt-1 text-center">Conozca a los expertos que compartirán su conocimiento.</p>
      </div>
      <div className="space-y-6">
        {speakers.map((speaker) => (
          <Card 
            key={speaker.speakerId} 
            className="bg-white rounded-lg p-6 flex items-start gap-6 shadow-md hover:shadow-lg transition-shadow"
          >
            {/* Foto circular */}
            <div className="flex-shrink-0">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#2E61FA]">
                <Image
                  src={normalizeImageUrl(speaker.imageUrl, speaker.name)}
                  alt={`Portrait of ${speaker.name}`}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={speaker.imageHint}
                  className="rounded-full"
                />
              </div>
            </div>
            
            {/* Información */}
            <CardContent className="flex-grow p-0">
              {/* Nombre en azul subrayado en rojo */}
              <h3 className="text-xl sm:text-2xl font-bold text-[#2E61FA] mb-4">
                <span className="border-b-2 border-[#FD0233] pb-1">
                  {speaker.name}
                </span>
              </h3>
              
              {/* Lista de calificaciones */}
              {speaker.qualifications && speaker.qualifications.length > 0 ? (
                <ul className="space-y-2 text-gray-800 text-sm sm:text-base">
                  {speaker.qualifications.map((qualification, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#2E61FA] mr-2">•</span>
                      <span>{qualification}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-800 text-sm sm:text-base">{speaker.bio}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
