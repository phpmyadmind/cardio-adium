"use client";

import { useMemo, useState, useEffect } from "react";
import type { Speaker, AgendaItem } from "@/lib/types";
import { Clock, Calendar, Download, Coffee, UtensilsCrossed, Users, MessageSquare, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { QRCodeViewer } from "./qr-code-viewer";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import Image from "next/image";
import { useAuthContext } from "@/contexts/auth.context";
import { findEventLogo, findEventAgendaPDFs } from "@/lib/event-resources";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

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

interface EventTracker {
  id: string;
  name: string;
  isActive: boolean;
}

interface AgendaPDF {
  name: string;
  path: string;
}

export function AgendaView() {
  const { user } = useAuthContext();
  const { data: eventTrackers } = useMongoCollection<EventTracker>('/api/event-trackers');
  const [logoPath, setLogoPath] = useState<string>('/Logo_123.jpg');
  const [agendaPDFs, setAgendaPDFs] = useState<AgendaPDF[]>([]);
  const [selectedAgendaIndex, setSelectedAgendaIndex] = useState<number>(0);
  const [numPages, setNumPages] = useState<Record<number, number>>({});
  const [pageNumber, setPageNumber] = useState<Record<number, number>>({});
  const [scale, setScale] = useState<Record<number, number>>({});

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

  // Inyectar estilos CSS personalizados para el PDF responsive
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const pdfStyles = `
        .react-pdf__Page {
          max-width: 100% !important;
          height: auto !important;
        }
        
        .react-pdf__Page__canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
        }
        
        .react-pdf__Page__textContent {
          max-width: 100% !important;
        }
        
        .react-pdf__Page__annotations {
          max-width: 100% !important;
        }
        
        @media (max-width: 640px) {
          .react-pdf__Page {
            margin: 0 auto;
          }
        }
      `;
      
      const styleElement = document.createElement('style');
      styleElement.textContent = pdfStyles;
      document.head.appendChild(styleElement);
      
      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, []);

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

  // Cargar todos los PDFs de agenda que contienen "_Agenda_" en el nombre
  useEffect(() => {
    const loadAgendas = async () => {
      if (eventTrackerId) {
        const pdfs = await findEventAgendaPDFs(eventTrackerId);
        if (pdfs.length > 0) {
          setAgendaPDFs(pdfs);
          // Inicializar estados para cada PDF
          const initialNumPages: Record<number, number> = {};
          const initialPageNumber: Record<number, number> = {};
          const initialScale: Record<number, number> = {};
          pdfs.forEach((_, index) => {
            initialNumPages[index] = 0;
            initialPageNumber[index] = 1;
            initialScale[index] = 1.0;
          });
          setNumPages(initialNumPages);
          setPageNumber(initialPageNumber);
          setScale(initialScale);
        } else {
          // Fallback: usar agenda general si no hay PDFs en la carpeta del evento
          setAgendaPDFs([{ name: 'Agenda_Campus_1,2,3.pdf', path: '/Agenda_Campus_1,2,3.pdf' }]);
          setNumPages({ 0: 0 });
          setPageNumber({ 0: 1 });
          setScale({ 0: 1.0 });
        }
      } else {
        // Fallback: usar agenda general
        setAgendaPDFs([{ name: 'Agenda_Campus_1,2,3.pdf', path: '/Agenda_Campus_1,2,3.pdf' }]);
        setNumPages({ 0: 0 });
        setPageNumber({ 0: 1 });
        setScale({ 0: 1.0 });
      }
    };
    loadAgendas();
  }, [eventTrackerId]);

  const getSpeaker = (id: string): Speaker | undefined => {
    if (!id || !speakers || speakers.length === 0) {
      return undefined;
    }
    // Normalizar el ID (eliminar espacios y convertir a string)
    const normalizedId = String(id).trim();
    // Buscar por id exacto
    let speaker = speakers.find((s) => s.id === normalizedId);
    // Si no se encuentra, intentar buscar por _id (por si acaso)
    if (!speaker) {
      speaker = speakers.find((s) => (s as any)._id === normalizedId);
    }
    return speaker;
  };

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

  const handleDownload = (pdfPath: string, pdfName: string) => {
    // Crear un enlace temporal para descargar el PDF
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = pdfName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onDocumentLoadSuccess = (index: number) => ({ numPages }: { numPages: number }) => {
    setNumPages(prev => ({ ...prev, [index]: numPages }));
  };

  const goToPrevPage = (index: number) => {
    setPageNumber(prev => ({ ...prev, [index]: Math.max(1, (prev[index] || 1) - 1) }));
  };

  const goToNextPage = (index: number) => {
    setPageNumber(prev => {
      const currentPage = prev[index] || 1;
      const maxPages = numPages[index] || 1;
      return { ...prev, [index]: Math.min(maxPages, currentPage + 1) };
    });
  };

  const zoomIn = (index: number) => {
    setScale(prev => ({ ...prev, [index]: Math.min(3.0, (prev[index] || 1.0) + 0.2) }));
  };

  const zoomOut = (index: number) => {
    setScale(prev => ({ ...prev, [index]: Math.max(0.5, (prev[index] || 1.0) - 0.2) }));
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
        {agendaPDFs.length > 0 && (
          <Button 
            onClick={() => handleDownload(agendaPDFs[selectedAgendaIndex].path, agendaPDFs[selectedAgendaIndex].name)}
            className="h-12 text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md px-6"
          >
            <Download className="mr-2 h-5 w-5" />
            Descargar Agenda
          </Button>
        )}
      </div>

      {/* Pestañas para PDFs de agenda */}
      {agendaPDFs.length > 0 && (
        <Tabs 
          value={selectedAgendaIndex.toString()} 
          onValueChange={(value) => setSelectedAgendaIndex(parseInt(value))}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto mb-6 gap-2 bg-transparent p-0">
            {agendaPDFs.map((pdf, index) => {
              // Extraer nombre legible del archivo (sin extensión y sin _Agenda_)
              const displayName = pdf.name
                .replace(/_Agenda_/gi, ' ')
                .replace(/\.pdf$/i, '')
                .replace(/_/g, ' ')
                .trim();
              
              return (
                <TabsTrigger 
                  key={index}
                  value={index.toString()}
                  className="text-sm sm:text-base font-bold rounded-xl bg-[#F00808] hover:bg-[#d00707] text-white shadow-md data-[state=active]:bg-[#F00808] data-[state=active]:text-white data-[state=active]:shadow-md py-2 px-3"
                >
                  {displayName || `Agenda ${index + 1}`}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {agendaPDFs.map((pdf, index) => (
            <TabsContent key={index} value={index.toString()} className="space-y-4 mt-0">
              <div className="bg-white rounded-lg p-4 shadow-md">
                {/* Controles del PDF */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => goToPrevPage(index)}
                      disabled={(pageNumber[index] || 1) <= 1}
                      size="sm"
                      variant="outline"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Página {(pageNumber[index] || 1)} de {numPages[index] || 0}
                    </span>
                    <Button
                      onClick={() => goToNextPage(index)}
                      disabled={(pageNumber[index] || 1) >= (numPages[index] || 1)}
                      size="sm"
                      variant="outline"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => zoomOut(index)}
                      size="sm"
                      variant="outline"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[60px] text-center">
                      {Math.round((scale[index] || 1.0) * 100)}%
                    </span>
                    <Button
                      onClick={() => zoomIn(index)}
                      size="sm"
                      variant="outline"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDownload(pdf.path, pdf.name)}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </div>

                {/* Visor de PDF */}
                <div className="flex justify-center items-start border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[800px]">
                  <Document
                    file={pdf.path}
                    onLoadSuccess={onDocumentLoadSuccess(index)}
                    loading={
                      <div className="flex items-center justify-center py-20">
                        <div className="text-sm text-gray-600">Cargando documento...</div>
                      </div>
                    }
                    error={
                      <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="text-red-600 mb-4 text-center">
                          <p className="font-semibold mb-2">Error al cargar el documento</p>
                          <p className="text-xs text-gray-600">No se pudo cargar el PDF: {pdf.name}</p>
                        </div>
                      </div>
                    }
                    options={{
                      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "3.11.174"}/cmaps/`,
                      cMapPacked: true,
                      standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "3.11.174"}/standard_fonts/`,
                    }}
                  >
                    <Page
                      pageNumber={pageNumber[index] || 1}
                      scale={scale[index] || 1.0}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="max-w-full"
                    />
                  </Document>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Pestañas para agenda por días (si hay items de agenda en la base de datos) */}
      {agendaItems.length > 0 && (
        <Tabs defaultValue={defaultDate} className="w-full mt-8">
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
                                      availableSpeakers: speakers.map(s => ({ id: s.id, name: s.name })),
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
      )}

    </div>
  );
}
