/**
 * Normaliza la ruta de una imagen para asegurar que sea accesible
 */
export function normalizeImageUrl(imageUrl, fallbackName) {
  if (!imageUrl || imageUrl.trim() === '') {
    if (fallbackName) {
      return getSpeakerImageUrl(fallbackName);
    }
    return '';
  }
  const trimmedUrl = imageUrl.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }
  return `/${trimmedUrl}`;
}

export function getSpeakerImageUrl(speakerName) {
  if (!speakerName || speakerName.trim() === '') {
    return '';
  }
  const slug = speakerName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `/speaker-${slug}.png`;
}
