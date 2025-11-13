"use client";

import { useMemo } from "react";
import { agendaItems, speakers } from "@/lib/placeholder-data";
import type { Speaker, AgendaItem } from "@/lib/types";
import { Clock, Calendar, Download, Coffee, UtensilsCrossed, Users, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import Image from "next/image";

// Extend the jsPDF interface to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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

export function AgendaView() {
  const getSpeaker = (id: string): Speaker | undefined =>
    speakers.find((s) => s.id === id);

  // Agrupar agenda por día primero
  const agendaByDay = useMemo(() => agendaItems.reduce((acc, item) => {
    const dateKey = item.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, AgendaItem[]>), [agendaItems]);

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

  const handleDownload = () => {
    // Crear un enlace temporal para descargar el PDF existente
    const link = document.createElement('a');
    link.href = '/Agenda_Campus_1,2,3.pdf';
    link.download = 'Agenda_Campus_1,2,3.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          src="/LOGO_123.png"
          alt="Campus 123 Logo"
          width={400}
          height={200}
          className="w-full max-w-md h-auto mb-4"
          priority
        />
      </div>
      <div className="flex justify-end">
        <Button 
          onClick={handleDownload}
          className="h-12 text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md px-6"
        >
          <Download className="mr-2 h-5 w-5" />
          Descargar Agenda
        </Button>
      </div>

      <Tabs defaultValue={defaultDate} className="w-full">
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
                            <h4 className={`font-bold text-lg ${item.type === 'welcome' ? 'text-black' : ''}`}>{item.topic}</h4>
                          </div>

                          {/* Conferencistas */}
                          {(item.speakerIds.length > 0 || item.moderator || item.participants) && (
                            <div className="mb-2">
                              <p className={`text-sm font-semibold mb-2 ${item.type === 'welcome' ? 'text-black' : 'text-gray-700'}`}>Conferencista(s):</p>
                              <div className="flex flex-wrap gap-3 items-center">
                                {/* Speakers */}
                                {item.speakerIds.map((speakerId) => {
                                  const speaker = getSpeaker(speakerId);
                                  if (!speaker) return null;
                                  return (
                                    <div key={speaker.id} className="flex items-center gap-2">
                                      <Avatar className="h-10 w-10">
                                        <AvatarImage
                                          src={speaker.imageUrl}
                                          alt={speaker.name}
                                          data-ai-hint={speaker.imageHint}
                                        />
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
                                {/* Moderador si no está en la lista de speakers ni en participants */}
                                {item.moderator && !item.speakerIds.some(id => {
                                  const speaker = getSpeaker(id);
                                  return speaker?.name === item.moderator;
                                }) && !item.participants?.includes(item.moderator) && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage
                                        src={speakers.find(s => s.name === item.moderator)?.imageUrl || ''}
                                        alt={item.moderator}
                                      />
                                      <AvatarFallback className="text-xs">{item.moderator.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className={`text-sm font-medium ${item.type === 'welcome' ? 'text-black' : 'text-gray-800'}`}>{item.moderator}</span>
                                  </div>
                                )}
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
    </div>
  );
}
