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
    <div className="space-y-8">
      <div className="flex flex-col items-center mb-6">
        <img
          src={logoPath}
          alt="Event Logo"
          className="w-full max-w-md h-auto mb-4"
          onError={() => {
            if (eventTrackerId) {
              setLogoPath(`/${eventTrackerId}/Logo_123.png`);
            } else {
              setLogoPath('/Logo_123.png');
            }
          }}
        />
      </div>
      <div className="flex justify-end gap-2">
        <QRCodeViewer viewName="agenda" label="Agenda" />
      </div>

      {agendaItems.length > 0 && specialties.length > 0 && (
        <div className="w-full mt-8">
          <Tabs value={selectedSpecialty} onValueChange={setSelectedSpecialty} className="w-full">
            <div className="flex items-center justify-between mb-6 gap-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
                {specialties.map((specialty) => (
                  <TabsTrigger
                    key={specialty}
                    value={specialty}
                    className="text-sm sm:text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md data-[state=active]:bg-[#2E61FA] data-[state=active]:text-white data-[state=active]:shadow-md py-2 px-3"
                  >
                    {specialty}
                  </TabsTrigger>
                ))}
              </TabsList>
              {selectedSpecialty && specialtyPdfUrl && (
                <a
                  href={`/${eventTrackerId || ''}${specialtyPdfUrl}`}
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

      {selectedSpecialty && specialtyPdfUrl && (
        <div className="w-full mt-6">
          <PDFViewer
            pdfUrl={`/${eventTrackerId || ''}${specialtyPdfUrl}`}
            title={`Agenda - ${selectedSpecialty}`}
            height="800px"
            className="mb-8"
          />
        </div>
      )}
    </div>
  );
}
