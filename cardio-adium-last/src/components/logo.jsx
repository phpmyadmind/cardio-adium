import { cn } from "../lib/utils";
import { useAuthContext } from "../contexts/auth.context";
import { useApiCollection } from "../hooks/useApiCollection";
import { useEffect, useState } from "react";
import { findEventLogo } from "../lib/event-resources";

export function Logo({ className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
    >
      <img
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

export function LogoHead({ className }) {
  const { user } = useAuthContext();
  const { data: eventTrackers } = useApiCollection('/api/event-trackers');
  const [logoPath, setLogoPath] = useState('/logo_adium.png');

  const eventTrackerId = (() => {
    if (user?.event_tracker) {
      return user.event_tracker;
    }
    const activeEvent = eventTrackers?.find((et) => et.is_active || et.isActive);
    return activeEvent?.id;
  })();

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
      <img
        src={logoPath}
        alt="Adium Logo"
        width={100}
        height={100}
        className="w-full h-auto"
        data-ai-hint="polygonal heart"
        onError={() => {
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
