import { useMemo, useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { QRCodeViewer } from './qr-code-viewer';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useAuthContext } from '../contexts/auth.context';
import { findEventLogo } from '../lib/event-resources';
import { useApiCollection } from '../hooks/useApiCollection';
import { PDFViewer } from './pdf-viewer';

export function AgendaView() {
  const { user } = useAuthContext();
  const { data: eventTrackers = [] } = useApiCollection('/api/event-trackers');
  const [logoPath, setLogoPath] = useState('/Logo_123.png');

  const eventTrackerId = useMemo(() => {
    if (user?.event_tracker) {
      return user.event_tracker;
    }
    const activeEvent = eventTrackers.find((et) => et.isActive || et.is_active);
    return activeEvent?.id;
  }, [user?.event_tracker, eventTrackers]);

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

  useApiCollection(speakersEndpoint);
  const { data: agendaItems = [] } = useApiCollection(agendaEndpoint);

  useEffect(() => {
    const loadLogo = async () => {
      if (eventTrackerId) {
        const logo = await findEventLogo(eventTrackerId);
        if (logo) {
          setLogoPath(logo);
        } else {
          setLogoPath(`/${eventTrackerId}/Logo_123.png`);
        }
      } else {
        setLogoPath('/Logo_123.png');
      }
    };
    loadLogo();
  }, [eventTrackerId]);

  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  const specialties = useMemo(() => {
    const specialtySet = new Set();
    agendaItems.forEach((item) => {
      const specialty = item.specialty || 'Sin especialidad';
      specialtySet.add(specialty);
    });
    return Array.from(specialtySet).sort((a, b) => {
      if (a === 'Sin especialidad') return 1;
      if (b === 'Sin especialidad') return -1;
      return a.localeCompare(b);
    });
  }, [agendaItems]);

  useEffect(() => {
    if (specialties.length > 0 && !selectedSpecialty) {
      setSelectedSpecialty(specialties[0]);
    }
  }, [specialties, selectedSpecialty]);

  const filteredAgendaItems = useMemo(() => {
    if (!selectedSpecialty) return [];
    return agendaItems.filter((item) => {
      const itemSpecialty = item.specialty || 'Sin especialidad';
      return itemSpecialty === selectedSpecialty;
    });
  }, [agendaItems, selectedSpecialty]);

  const specialtyPdfUrl = useMemo(() => {
    if (!selectedSpecialty) return null;
    const itemWithPdf = filteredAgendaItems.find((item) => item.pdfUrl);
    return itemWithPdf?.pdfUrl || null;
  }, [selectedSpecialty, filteredAgendaItems]);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-6 sm:pb-8 max-w-7xl mx-auto w-full">
      {/* Header: logo + QR - compacto en móvil */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col items-center sm:items-start">
          <img
            src={logoPath}
            alt="Event Logo"
            className="w-full max-w-[200px] sm:max-w-[280px] md:max-w-md h-auto"
            onError={() => {
              if (eventTrackerId) {
                setLogoPath(`/${eventTrackerId}/Logo_123.png`);
              } else {
                setLogoPath('/Logo_123.png');
              }
            }}
          />
        </div>
        <div className="flex justify-center sm:justify-end">
          <QRCodeViewer viewName="agenda" label="Agenda" />
        </div>
      </div>

      {agendaItems.length > 0 && specialties.length > 0 && (
        <Tabs value={selectedSpecialty} onValueChange={setSelectedSpecialty} className="w-full">
          {/* Selector de especialidad + botón descargar - responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto h-auto gap-2 bg-transparent p-0 flex-nowrap sm:flex-wrap">
                {specialties.map((specialty) => (
                  <TabsTrigger
                    key={specialty}
                    value={specialty}
                    className="text-xs sm:text-sm md:text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md data-[state=active]:bg-[#2E61FA] data-[state=active]:text-white data-[state=active]:shadow-md py-2 px-3 flex-shrink-0"
                  >
                    {specialty}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {selectedSpecialty && specialtyPdfUrl && (
              <a
                href={`/${eventTrackerId || ''}${specialtyPdfUrl}`}
                download
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-[#2E61FA] hover:bg-[#365899] text-white rounded-lg font-semibold shadow-md transition-colors whitespace-nowrap flex-shrink-0"
              >
                <Download className="h-4 w-4" />
                <span>Descargar PDF</span>
              </a>
            )}
          </div>

          {/* Sección principal: Agenda en PDF - enfatizada */}
          {selectedSpecialty && specialtyPdfUrl && (
            <div className="w-full">
              <div className="mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2E61FA] flex items-center gap-2">
                  <span className="inline-block w-1 h-6 sm:h-8 bg-[#2E61FA] rounded-full" />
                  Agenda en formato PDF
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualice la agenda de {selectedSpecialty} directamente en su dispositivo
                </p>
              </div>
              <div className="w-full rounded-xl overflow-hidden border-2 border-[#2E61FA]/20 shadow-lg bg-white">
                <PDFViewer
                  pdfUrl={`/${eventTrackerId || ''}${specialtyPdfUrl}`}
                  title={`Agenda - ${selectedSpecialty}`}
                  height="800px"
                  className="agenda-pdf-viewer"
                  hideTitle
                />
              </div>
            </div>
          )}
        </Tabs>
      )}
    </div>
  );
}
