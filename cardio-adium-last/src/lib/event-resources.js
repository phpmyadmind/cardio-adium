export function getEventResourcePath(eventTrackerId) {
  if (!eventTrackerId) {
    return '';
  }
  return `/${eventTrackerId}`;
}

export function getEventResource(resourceName, eventTrackerId, fallbackToGeneral = true) {
  if (eventTrackerId) {
    const eventPath = getEventResourcePath(eventTrackerId);
    return `${eventPath}/${resourceName}`;
  }
  if (fallbackToGeneral) {
    return `/${resourceName}`;
  }
  return `/${resourceName}`;
}

export function getEventLogo(logoName, eventTrackerId) {
  return getEventResource(logoName, eventTrackerId, true);
}

export async function findEventLogo(eventTrackerId) {
  if (typeof window === 'undefined') {
    return null;
  }
  // En CRA los assets están en public/; usar ruta directa
  if (eventTrackerId) {
    return `/${eventTrackerId}/Logo_123.png`;
  }
  return '/Logo_123.png';
}
