import { useState, useEffect, useMemo } from 'react';
import { useApiCollection } from '../hooks/useApiCollection';
import { Card, CardContent } from './ui/card';
import { QRCodeViewer } from './qr-code-viewer';
import { useAuthContext } from '../contexts/auth.context';
import { findEventLogo } from '../lib/event-resources';
import { normalizeImageUrl } from '../lib/image-utils';

export function SpeakersView() {
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

  const { data: speakers = [], isLoading } = useApiCollection(speakersEndpoint);

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
          <div className="flex-1" />
          <img
            src={logoPath}
            alt="Event Logo"
            className="w-full max-w-md h-auto"
            onError={() => {
              if (eventTrackerId) {
                setLogoPath(`/${eventTrackerId}/Logo_123.png`);
              } else {
                setLogoPath('/Logo_123.png');
              }
            }}
          />
          <div className="flex-1 flex justify-end">
            <QRCodeViewer viewName="speakers" label="Speakers" />
          </div>
        </div>
        <h2 className="text-3xl font-bold font-headline text-primary">Ponentes Destacados</h2>
        <p className="text-muted-foreground mt-1 text-center">
          Conozca a los expertos que compartirán su conocimiento.
        </p>
      </div>
      <div className="space-y-6">
        {speakers.map((speaker) => (
          <Card
            key={speaker.id || speaker.speakerId}
            className="bg-white rounded-lg p-6 flex items-start gap-6 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex-shrink-0">
              <div
                className="relative aspect-square rounded-full overflow-hidden border-4 border-[#2E61FA] bg-gray-100"
                style={{ width: 'clamp(80px, 12vw, 128px)', height: 'auto' }}
              >
                <img
                  src={normalizeImageUrl(speaker.imageUrl, speaker.name)}
                  alt={`Portrait of ${speaker.name}`}
                  className="w-full h-full object-cover rounded-full"
                  style={{ objectFit: 'fill', objectPosition: 'center', transform: 'scale(0.97)' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
            <CardContent className="flex-grow p-0">
              <h3 className="text-xl sm:text-2xl font-bold text-[#2E61FA] mb-4">
                <span className="border-b-2 border-[#FD0233] pb-1">{speaker.name}</span>
              </h3>
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
