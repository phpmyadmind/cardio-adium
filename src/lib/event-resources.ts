/**
 * Helper para obtener rutas de recursos según el event_tracker
 * Los recursos específicos de un evento están en public/[eventTrackerId]/
 * Los recursos generales están en public/
 */

/**
 * Obtiene la ruta base de recursos para un evento específico
 * @param eventTrackerId - ID del evento tracker
 * @returns Ruta base para recursos del evento (ej: "/6928c443c96cf391f40ac142")
 */
export function getEventResourcePath(eventTrackerId?: string | null): string {
  if (!eventTrackerId) {
    return '';
  }
  return `/${eventTrackerId}`;
}

/**
 * Obtiene la ruta completa de un recurso específico del evento
 * Si el recurso no existe en la carpeta del evento, usa el recurso general
 * @param resourceName - Nombre del recurso (ej: "LOGO_123.png")
 * @param eventTrackerId - ID del evento tracker
 * @param fallbackToGeneral - Si es true, usa el recurso general si no existe en el evento
 * @returns Ruta completa del recurso
 */
export function getEventResource(
  resourceName: string,
  eventTrackerId?: string | null,
  fallbackToGeneral: boolean = true
): string {
  if (eventTrackerId) {
    const eventPath = getEventResourcePath(eventTrackerId);
    return `${eventPath}/${resourceName}`;
  }
  
  if (fallbackToGeneral) {
    return `/${resourceName}`;
  }
  
  return `/${resourceName}`;
}

/**
 * Obtiene la ruta de un logo específico del evento
 * Busca primero en la carpeta del evento, luego en recursos generales
 * @param logoName - Nombre del logo (ej: "LOGO_123.png", "Logo_123.jpg")
 * @param eventTrackerId - ID del evento tracker
 * @returns Ruta del logo
 */
export function getEventLogo(
  logoName: string,
  eventTrackerId?: string | null
): string {
  return getEventResource(logoName, eventTrackerId, true);
}

/**
 * Obtiene la ruta de una agenda PDF para descargar
 * @param agendaName - Nombre del archivo PDF (ej: "Agenda_Campus_1,2,3.pdf")
 * @param eventTrackerId - ID del evento tracker
 * @returns Ruta del PDF de agenda
 */
export function getEventAgendaPDF(
  agendaName: string,
  eventTrackerId?: string | null
): string {
  return getEventResource(agendaName, eventTrackerId, true);
}

/**
 * Lista de nombres comunes de logos que se buscan en la carpeta del evento
 * Prioridad: Logo_123.png primero, luego otras extensiones
 */
export const COMMON_LOGO_NAMES = [
  'Logo_123.png',
  'Logo_123.jpg',
  'Logo_123.jpeg',
  'LOGO_123.png',
  'logo.png',
  'logo.jpg',
  'Logo.png',
  'Logo.jpg',
];

/**
 * Lista de nombres comunes de agendas PDF
 */
export const COMMON_AGENDA_NAMES = [
  'Agenda_Campus_1,2,3.pdf',
  'Agenda.pdf',
  'agenda.pdf',
  'Cardiologos_Agenda_CardioSummit.pdf',
  'Endocrinologos_Agenda_CardioSummit.pdf',
];

/**
 * Busca un recurso en la carpeta del evento (solo cliente)
 * @param resourceName - Nombre del recurso a buscar
 * @param eventTrackerId - ID del evento tracker
 * @returns Ruta del recurso si existe, null si no
 */
export async function findEventResource(
  resourceName: string,
  eventTrackerId: string
): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null; // Solo funciona en el cliente
  }

  try {
    const response = await fetch(
      `/api/event-resources?eventTrackerId=${encodeURIComponent(eventTrackerId)}&type=all`
    );
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.exists && data.resources) {
      const resource = data.resources.find(
        (r: { name: string }) => r.name === resourceName
      );
      return resource ? resource.path : null;
    }

    return null;
  } catch (error) {
    console.error('Error buscando recurso:', error);
    return null;
  }
}

/**
 * Obtiene el logo Logo_123 de la carpeta del evento (solo cliente)
 * Busca primero Logo_123.png, luego Logo_123.jpg, luego otros logos
 * @param eventTrackerId - ID del evento tracker
 * @returns Ruta del logo o null si no se encuentra
 */
export async function findEventLogo(eventTrackerId: string): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null; // Solo funciona en el cliente
  }

  try {
    const response = await fetch(
      `/api/event-resources?eventTrackerId=${encodeURIComponent(eventTrackerId)}&type=logo`
    );
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.exists && data.resources && data.resources.length > 0) {
      // Buscar primero Logo_123 (cualquier extensión)
      const logo123 = data.resources.find((r: { name: string }) => 
        r.name.toLowerCase().startsWith('logo_123.')
      );
      if (logo123) {
        return logo123.path;
      }
      // Si no se encuentra Logo_123, retornar el primer logo encontrado
      return data.resources[0].path;
    }

    return null;
  } catch (error) {
    console.error('Error buscando logo:', error);
    return null;
  }
}

/**
 * Obtiene el primer PDF de agenda disponible en la carpeta del evento (solo cliente)
 * @param eventTrackerId - ID del evento tracker
 * @returns Ruta del PDF o null si no se encuentra
 */
export async function findEventAgendaPDF(eventTrackerId: string): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null; // Solo funciona en el cliente
  }

  try {
    const response = await fetch(
      `/api/event-resources?eventTrackerId=${encodeURIComponent(eventTrackerId)}&type=agenda`
    );
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.exists && data.resources && data.resources.length > 0) {
      // Retornar el primer PDF encontrado
      return data.resources[0].path;
    }

    return null;
  } catch (error) {
    console.error('Error buscando agenda PDF:', error);
    return null;
  }
}

/**
 * Obtiene todos los PDFs que contienen "_Agenda_" en el nombre (solo cliente)
 * @param eventTrackerId - ID del evento tracker
 * @returns Array de rutas de PDFs de agenda
 */
export async function findEventAgendaPDFs(eventTrackerId: string): Promise<Array<{ name: string; path: string }>> {
  if (typeof window === 'undefined') {
    return []; // Solo funciona en el cliente
  }

  try {
    const response = await fetch(
      `/api/event-resources?eventTrackerId=${encodeURIComponent(eventTrackerId)}&type=agenda`
    );
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (data.exists && data.resources && data.resources.length > 0) {
      // Filtrar solo los PDFs que contienen "_Agenda_" en el nombre
      const agendaPDFs = data.resources.filter((r: { name: string }) => 
        r.name.toLowerCase().includes('_agenda_')
      );
      
      // Si no hay PDFs con "_Agenda_", retornar todos los PDFs encontrados
      return agendaPDFs.length > 0 
        ? agendaPDFs.map((r: { name: string; path: string }) => ({ name: r.name, path: r.path }))
        : data.resources.map((r: { name: string; path: string }) => ({ name: r.name, path: r.path }));
    }

    return [];
  } catch (error) {
    console.error('Error buscando PDFs de agenda:', error);
    return [];
  }
}

