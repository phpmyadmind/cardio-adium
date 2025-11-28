/**
 * Normaliza la ruta de una imagen para asegurar que sea accesible desde Next.js
 * - Si la ruta ya es una URL completa (http/https), la devuelve tal cual
 * - Si la ruta es relativa y no empieza con "/", le agrega "/" para referenciar public/
 * - Si la ruta ya empieza con "/", la devuelve tal cual
 * 
 * @param imageUrl - La ruta de la imagen (puede ser URL completa, ruta relativa, o ruta absoluta)
 * @param fallbackName - Nombre del speaker para generar ruta automática si imageUrl está vacío
 * @returns La ruta normalizada
 */
export function normalizeImageUrl(imageUrl: string | undefined | null, fallbackName?: string): string {
  if (!imageUrl || imageUrl.trim() === '') {
    // Si no hay imageUrl pero hay un nombre, generar la ruta automáticamente
    if (fallbackName) {
      return getSpeakerImageUrl(fallbackName);
    }
    return '';
  }

  const trimmedUrl = imageUrl.trim();

  // Si ya es una URL completa (http/https), devolverla tal cual
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // Si ya empieza con "/", devolverla tal cual
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  // Si es una ruta relativa sin "/", agregar "/" al inicio para referenciar public/
  return `/${trimmedUrl}`;
}

/**
 * Genera la ruta de imagen de un speaker basándose en su nombre
 * Convierte el nombre a formato slug y busca en public/
 * 
 * @param speakerName - El nombre del speaker
 * @returns La ruta normalizada de la imagen
 */
export function getSpeakerImageUrl(speakerName: string): string {
  if (!speakerName || speakerName.trim() === '') {
    return '';
  }

  // Convertir nombre a formato slug: "Luis Echeverría" -> "speaker-luis-echeverria"
  const slug = speakerName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
    .trim()
    .replace(/\s+/g, '-'); // Reemplazar espacios con guiones

  return `/speaker-${slug}.png`;
}

