"use client";

import { useMemo, useState, useEffect } from "react";
import type { Speaker, AgendaItem } from "@/lib/types";
import { Clock, Calendar, Coffee, UtensilsCrossed, Users, MessageSquare, Download } from "lucide-react";
import { QRCodeViewer } from "./qr-code-viewer";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import Image from "next/image";
import { useAuthContext } from "@/contexts/auth.context";
import { findEventLogo } from "@/lib/event-resources";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import { normalizeImageUrl } from "@/lib/image-utils";

const getTypeIcon = (type?: string) => {
  switch (type) {
    case 'break':
      return <Coffee className="h-4 w-4" />;
    case 'meal':
      return <UtensilsCrossed className="h-4 w-4" />;
    case 'workshop':
      return <Users className="h-4 w-4" />;
    case 'qna':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getTypeColor = (type?: string) => {
  switch (type) {
    case 'break':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'meal':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'workshop':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'qna':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'welcome':
      return 'bg-white text-black border-gray-300';
    case 'closing':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-white text-gray-800 border-gray-300';
  }
};

interface EventTracker {
  id: string;
  name: string;
  isActive: boolean;
}

export function AgendaView() {
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

  // Construir endpoints con filtro de eventTrackerId
  const speakersEndpoint = useMemo(() => {
    return eventTrackerId 
      ? `/api/speakers?eventTrackerId=${encodeURIComponent(eventTrackerId)}`
      : '/api/speakers';
  }, [eventTrackerId]);

  const agendaEndpoint = useMemo(() => {
    return eventTrackerId 
      ? `/api/agenda?eventTrackerId=${encodeURIComponent(eventTrackerId)}`
      : '/api/agenda';
  }, [eventTrackerId]);

  // Cargar datos reales de MongoDB
  const { data: speakers = [] } = useMongoCollection<Speaker>(speakersEndpoint);
  const { data: agendaItems = [] } = useMongoCollection<AgendaItem>(agendaEndpoint);

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


  const getSpeaker = (id: string): Speaker | undefined => {
    if (!id || !speakers || speakers.length === 0) {
      return undefined;
    }
    // Normalizar el ID (eliminar espacios y convertir a string)
    const normalizedId = String(id).trim();
    // Buscar por speakerId exacto
    let speaker = speakers.find((s) => s.speakerId === normalizedId);
    // Si no se encuentra, intentar buscar por _id o id (compatibilidad)
    if (!speaker) {
      speaker = speakers.find((s) => (s as any)._id === normalizedId || (s as any).id === normalizedId);
    }
    // Debug: verificar si el speaker tiene imageUrl
    if (speaker && (!speaker.imageUrl || speaker.imageUrl.trim() === '')) {
      console.log(`Speaker "${speaker.name}" no tiene imageUrl, se generará automáticamente`);
    }
    return speaker;
  };

  // Estado para la especialidad seleccionada
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  // Obtener lista única de especialidades
  const specialties = useMemo(() => {
    const specialtySet = new Set<string>();
    agendaItems.forEach((item) => {
      const specialty = item.specialty || 'Sin especialidad';
      specialtySet.add(specialty);
    });
    const specialtyList = Array.from(specialtySet).sort((a, b) => {
      // "Sin especialidad" al final
      if (a === 'Sin especialidad') return 1;
      if (b === 'Sin especialidad') return -1;
      return a.localeCompare(b);
    });
    return specialtyList;
  }, [agendaItems]);

  // Establecer la primera especialidad como valor por defecto
  useEffect(() => {
    if (specialties.length > 0 && !selectedSpecialty) {
      setSelectedSpecialty(specialties[0]);
    }
  }, [specialties, selectedSpecialty]);

  // Filtrar agenda por especialidad seleccionada
  const filteredAgendaItems = useMemo(() => {
    if (!selectedSpecialty) return [];
    return agendaItems.filter((item) => {
      const itemSpecialty = item.specialty || 'Sin especialidad';
      return itemSpecialty === selectedSpecialty;
    });
  }, [agendaItems, selectedSpecialty]);

  // Obtener el pdfUrl de la especialidad seleccionada (tomar el primero que tenga pdfUrl)
  const specialtyPdfUrl = useMemo(() => {
    if (!selectedSpecialty) return null;
    const itemWithPdf = filteredAgendaItems.find((item) => item.pdfUrl);
    return itemWithPdf?.pdfUrl || null;
  }, [selectedSpecialty, filteredAgendaItems]);

  // Agrupar agenda filtrada por día
  const agendaByDay = useMemo(() => {
    return filteredAgendaItems.reduce((acc, item) => {
      const dateKey = item.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {} as Record<string, AgendaItem[]>);
  }, [filteredAgendaItems]);

  // Ordenar cada día por hora
  const sortedAgendaByDay = useMemo(() => {
    const sorted = { ...agendaByDay };
    Object.keys(sorted).forEach(date => {
      sorted[date].sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
      });
    });
    return sorted;
  }, [agendaByDay]);

  // Obtener las fechas ordenadas para las pestañas
  const sortedDates = useMemo(() => {
    return Object.keys(sortedAgendaByDay).sort((a, b) => a.localeCompare(b));
  }, [sortedAgendaByDay]);

  // Obtener la primera fecha como valor por defecto
  const defaultDate = sortedDates[0] || '';

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center mb-6">
        <Image
          src={logoPath}
          alt="Event Logo"
          width={400}
          height={200}
          className="w-full max-w-md h-auto mb-4"
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
      </div>
      <div className="flex justify-end gap-2">
        <QRCodeViewer viewName="agenda" label="Agenda" />
      </div>

      {/* Pestañas de especialidades (nivel superior) */}
      {agendaItems.length > 0 && specialties.length > 0 && (
        <div className="w-full mt-8">
          <Tabs 
            value={selectedSpecialty} 
            onValueChange={setSelectedSpecialty}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-6 gap-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
                {specialties.map((specialty) => {
                  return (
                    <TabsTrigger 
                      key={specialty} 
                      value={specialty}
                      className="text-sm sm:text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md data-[state=active]:bg-[#2E61FA] data-[state=active]:text-white data-[state=active]:shadow-md py-2 px-3"
                    >
                      {specialty}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {/* Botón de descarga PDF */}
              {selectedSpecialty && specialtyPdfUrl && (
                <a
                  href={`/${eventTrackerId}${specialtyPdfUrl}`}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-[#2E61FA] hover:bg-[#365899] text-white rounded-lg font-semibold shadow-md transition-colors whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Descargar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </a>
              )}
            </div>
          </Tabs>
        </div>
      )}

      {/* Pestañas de días (nivel inferior) - se muestran cuando hay una especialidad seleccionada */}
      {selectedSpecialty && filteredAgendaItems.length > 0 ? (
        <Tabs defaultValue={defaultDate} className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto mb-6 gap-2 bg-transparent p-0">
          {sortedDates.map((date) => {
            const formattedDate = format(parseISO(date), "EEE dd/MM", { locale: es });
            // Capitalizar la primera letra del día
            const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
            
            return (
              <TabsTrigger 
                key={date} 
                value={date}
                className="text-sm sm:text-base font-bold rounded-xl bg-[#F00808] hover:bg-[#d00707] text-white shadow-md data-[state=active]:bg-[#F00808] data-[state=active]:text-white data-[state=active]:shadow-md py-2 px-3"
              >
                {capitalizedDate}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sortedDates.map((date) => {
          const items = sortedAgendaByDay[date];
          // Agrupar items por sección temática
          const itemsBySection: Record<string, AgendaItem[]> = {};
          let currentSection: string | null = null;
          let sectionCounter = 0;
          
          items.forEach((item) => {
            if (item.section) {
              currentSection = item.section;
              if (!itemsBySection[currentSection]) {
                itemsBySection[currentSection] = [];
              }
              itemsBySection[currentSection].push(item);
            } else {
              // Items sin sección (bienvenida, breaks, comidas, cierre)
              // Los colocamos en una sección "general" con un contador para mantener el orden
              const sectionKey = `general-${sectionCounter++}`;
              if (!itemsBySection[sectionKey]) {
                itemsBySection[sectionKey] = [];
              }
              itemsBySection[sectionKey].push(item);
            }
          });

          return (
            <TabsContent key={date} value={date} className="space-y-4 mt-0">
              <div className="bg-[#2E61FA] text-white rounded-lg p-4">
                <h3 className="text-2xl font-bold font-headline">
                  {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                </h3>
              </div>

              {Object.entries(itemsBySection).map(([section, sectionItems]) => (
                <div key={section} className="space-y-3">
                  {/* Encabezado de sección temática */}
                  {!section.startsWith('general') && (
                    <div className="bg-[#2E61FA]/10 border-l-4 border-[#2E61FA] rounded-lg p-3 mb-2">
                      <h4 className="text-lg font-bold text-[#2E61FA]">{section}</h4>
                      {sectionItems[0]?.moderator && (
                        <p className="text-sm text-gray-600 mt-1">
                          Moderado por: <span className="font-semibold">{sectionItems[0].moderator}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Items de la sección */}
                  {sectionItems.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-lg p-4 border-2 ${getTypeColor(item.type)} shadow-md`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Hora */}
                        <div className={`flex-shrink-0 flex items-center gap-2 text-sm font-semibold ${item.type === 'welcome' ? 'text-black' : ''}`}>
                          <Clock className="h-4 w-4" />
                          <span>{item.startTime} - {item.endTime}</span>
                        </div>

                        {/* Contenido */}
                        <div className="flex-grow">
                          <div className="flex items-start gap-2 mb-2">
                            {getTypeIcon(item.type)}
                            <h4 className={`font-bold text-lg ${item.type === 'welcome' ? 'text-black' : ''}`}>{item.title || item.topic}</h4>
                          </div>

                          {/* Conferencistas */}
                          {(item.speakerIds.length > 0 || item.participants) && (
                            <div className="mb-2">
                              <p className={`text-sm font-semibold mb-2 ${item.type === 'welcome' ? 'text-black' : 'text-gray-700'}`}>Conferencista(s):</p>
                              <div className="flex flex-wrap gap-3 items-center">
                                {/* Speakers */}
                                {item.speakerIds.map((speakerId) => {
                                  const speaker = getSpeaker(speakerId);
                                  if (!speaker) {
                                    // Si no se encuentra el speaker, mostrar el ID como fallback para debugging
                                    console.warn(`Speaker no encontrado para ID: ${speakerId}`, {
                                      availableSpeakers: speakers.map(s => ({ speakerId: s.speakerId, name: s.name })),
                                      speakerIds: item.speakerIds,
                                      eventTrackerId
                                    });
                                    return (
                                      <div key={`missing-${speakerId}`} className="flex items-center gap-2">
                                        <Avatar className="h-10 w-10">
                                          <AvatarFallback className="text-xs bg-gray-200 text-gray-600">?</AvatarFallback>
                                        </Avatar>
                                        <span className={`text-sm font-medium ${item.type === 'welcome' ? 'text-black' : 'text-gray-800'}`}>
                                          Speaker ID: {speakerId}
                                        </span>
                                      </div>
                                    );
                                  }
                                  // Normalizar la URL de la imagen con fallback al nombre
                                  const imageSrc = normalizeImageUrl(speaker.imageUrl || '', speaker.name);
                                  // Asegurarse de que imageSrc no esté vacío
                                  const finalImageSrc = imageSrc || normalizeImageUrl('', speaker.name);
                                  
                                  return (
                                    <div key={speaker.speakerId} className="flex items-center gap-2">
                                      <Avatar className="h-10 w-10">
                                        {finalImageSrc ? (
                                          <AvatarImage
                                            src={finalImageSrc}
                                            alt={speaker.name}
                                            data-ai-hint={speaker.imageHint}
                                            onError={(e) => {
                                              // Si la imagen falla, ocultar el AvatarImage para mostrar el fallback
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                            }}
                                          />
                                        ) : null}
                                        <AvatarFallback className="text-xs">{speaker.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className={`text-sm font-medium ${item.type === 'welcome' ? 'text-black' : 'text-gray-800'}`}>{speaker.name}</span>
                                    </div>
                                  );
                                })}
                                {/* Participantes que no son speakers */}
                                {item.participants && item.participants.map((participantName, index) => (
                                  <div key={`participant-${index}`} className="flex items-center gap-2">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="text-xs bg-gray-200 text-gray-600">{participantName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className={`text-sm font-medium ${item.type === 'welcome' ? 'text-black' : 'text-gray-800'}`}>{participantName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ubicación */}
                          {item.location && (
                            <p className={`text-xs mt-2 ${item.type === 'welcome' ? 'text-black' : 'text-gray-500'}`}>
                              📍 {item.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </TabsContent>
          );
        })}
        </Tabs>
      ) : selectedSpecialty && filteredAgendaItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay eventos de agenda disponibles para la especialidad "{selectedSpecialty}".</p>
        </div>
      ) : null}

      {agendaItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay eventos de agenda disponibles para este evento.</p>
        </div>
      )}

    </div>
  );
}
