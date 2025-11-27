import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Agenda } from '@/lib/mongodb/models/Agenda';
import { EventTracker } from '@/lib/mongodb/models/EventTracker';
import { Speaker } from '@/lib/mongodb/models/Speaker';
import fs from 'fs';
import path from 'path';

// Importación dinámica de pdf-parse
let pdfParse: any;
async function getPdfParse() {
  if (!pdfParse) {
    const pdfParseModule = await import('pdf-parse');
    pdfParse = pdfParseModule;
  }
  return pdfParse;
}

// POST /api/agenda/upload-pdf - Cargar agenda desde PDF y reemplazar la existente
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { pdfPath, event_tracker, replaceExisting = true } = body;
    
    if (!pdfPath) {
      return NextResponse.json({ error: 'Ruta del PDF requerida' }, { status: 400 });
    }

    // Obtener el evento activo por defecto si no se proporciona
    let eventTrackerId = event_tracker;
    if (!eventTrackerId) {
      const activeEventTracker = await EventTracker.findOne({ isActive: true });
      if (activeEventTracker) {
        eventTrackerId = activeEventTracker._id.toString();
      } else {
        return NextResponse.json({ error: 'No hay un evento activo. Active un evento antes de cargar la agenda.' }, { status: 400 });
      }
    }

    // Leer el archivo PDF
    // Si la ruta es relativa (sin / al inicio), construir la ruta completa desde public/
    let fullPath: string;
    if (path.isAbsolute(pdfPath)) {
      fullPath = pdfPath;
    } else {
      // Si es relativa, asumir que está en public/
      fullPath = path.join(process.cwd(), 'public', pdfPath);
    }
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ 
        error: 'El archivo PDF no existe en la ruta especificada',
        providedPath: pdfPath,
        resolvedPath: fullPath
      }, { status: 404 });
    }

    const dataBuffer = fs.readFileSync(fullPath);
    const pdf = await getPdfParse();
    const pdfData = await pdf(dataBuffer);
    
    // Extraer texto del PDF
    const text = pdfData.text;
    
    // Procesar el texto para extraer eventos de agenda
    const agendaItems = await parseAgendaFromPDF(text, eventTrackerId);
    
    if (agendaItems.length === 0) {
      return NextResponse.json({ 
        error: 'No se pudieron extraer eventos de agenda del PDF. Verifique el formato del documento.',
        extractedText: text.substring(0, 500) // Primeros 500 caracteres para debugging
      }, { status: 400 });
    }

    // Si replaceExisting es true, eliminar todos los eventos existentes del evento
    let deletedCount = 0;
    if (replaceExisting) {
      const deleteResult = await Agenda.deleteMany({ event_tracker: eventTrackerId });
      deletedCount = deleteResult.deletedCount || 0;
    }

    // Guardar los nuevos eventos de agenda
    const savedItems = [];
    const errors = [];

    for (const itemData of agendaItems) {
      try {
        const agendaItem = new Agenda(itemData);
        await agendaItem.save();
        savedItems.push({ id: agendaItem._id.toString(), ...agendaItem.toObject() });
      } catch (error: any) {
        errors.push({ title: itemData.title, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      total: agendaItems.length,
      saved: savedItems.length,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      items: savedItems,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/agenda/upload-pdf:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Parsea el texto del PDF para extraer eventos de agenda
 * Este es un parser básico que puede necesitar ajustes según el formato específico del PDF
 */
async function parseAgendaFromPDF(text: string, eventTrackerId: string): Promise<Array<{
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  speakerIds: string[];
  type?: 'session' | 'break' | 'meal' | 'welcome' | 'closing' | 'workshop' | 'qna';
  moderator?: string;
  location?: string;
  section?: string;
  participants?: string[];
  event_tracker?: string;
  specialty?: string;
}>> {
  const agendaItems: Array<{
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    speakerIds: string[];
    type?: 'session' | 'break' | 'meal' | 'welcome' | 'closing' | 'workshop' | 'qna';
    moderator?: string;
    location?: string;
    section?: string;
    participants?: string[];
    event_tracker?: string;
    specialty?: string;
  }> = [];

  // Dividir el texto en líneas
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Obtener todos los speakers para buscar por nombre
  const allSpeakers = await Speaker.find({ event_tracker: eventTrackerId });
  const speakerMap = new Map<string, string>();
  allSpeakers.forEach(speaker => {
    speakerMap.set(speaker.name.toLowerCase(), speaker._id.toString());
  });

  let currentItem: any = null;
  let currentDate = '';
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar fecha (formato: "DD/MM/YYYY" o "DD-MM-YYYY" o "YYYY-MM-DD")
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/;
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      // Normalizar fecha a formato YYYY-MM-DD
      const dateStr = dateMatch[0];
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // Formato YYYY-MM-DD
          currentDate = dateStr.replace(/[\/\-]/g, '-');
        } else {
          // Formato DD/MM/YYYY o DD-MM-YYYY
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          currentDate = `${year}-${month}-${day}`;
        }
      }
    }

    // Detectar hora (formato: "HH:MM" o "H:MM")
    const timePattern = /(\d{1,2}):(\d{2})/;
    const timeMatch = line.match(timePattern);
    
    if (timeMatch && currentDate) {
      // Guardar el item anterior si existe
      if (currentItem && currentItem.title) {
        agendaItems.push({
          ...currentItem,
          event_tracker: eventTrackerId,
        });
      }

      // Crear nuevo item
      const time = timeMatch[0];
      const nextTimeMatch = lines[i + 1]?.match(timePattern);
      const endTime = nextTimeMatch ? nextTimeMatch[0] : time;

      currentItem = {
        title: '',
        description: '',
        date: currentDate,
        startTime: time.padStart(5, '0'), // Asegurar formato HH:MM
        endTime: endTime.padStart(5, '0'),
        speakerIds: [],
        type: 'session' as const,
        section: currentSection || undefined,
      };
    }

    // Detectar título de sesión (líneas que no son fechas ni horas y tienen texto significativo)
    if (currentItem && !currentItem.title && line.length > 5 && !timePattern.test(line) && !datePattern.test(line)) {
      // Buscar si la línea contiene nombres de speakers
      const foundSpeakerIds: string[] = [];
      for (const [speakerName, speakerId] of speakerMap.entries()) {
        if (line.toLowerCase().includes(speakerName)) {
          foundSpeakerIds.push(speakerId);
        }
      }

      if (foundSpeakerIds.length > 0) {
        currentItem.speakerIds = foundSpeakerIds;
        // El título puede ser la parte antes del nombre del speaker
        const speakerIndex = line.toLowerCase().indexOf(foundSpeakerIds[0] ? allSpeakers.find(s => s._id.toString() === foundSpeakerIds[0])?.name.toLowerCase() || '' : '');
        currentItem.title = speakerIndex > 0 ? line.substring(0, speakerIndex).trim() : line;
      } else {
        currentItem.title = line;
      }
    }

    // Detectar descripción (líneas adicionales después del título)
    if (currentItem && currentItem.title && line !== currentItem.title && line.length > 10) {
      if (!currentItem.description) {
        currentItem.description = line;
      } else {
        currentItem.description += ' ' + line;
      }
    }

    // Detectar secciones temáticas (líneas en mayúsculas o con formato especial)
    if (line.length > 5 && line === line.toUpperCase() && line.length < 100) {
      currentSection = line;
    }

    // Detectar tipos especiales
    if (currentItem) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('coffee') || lowerLine.includes('café') || lowerLine.includes('break')) {
        currentItem.type = 'break';
      } else if (lowerLine.includes('almuerzo') || lowerLine.includes('lunch') || lowerLine.includes('comida')) {
        currentItem.type = 'meal';
      } else if (lowerLine.includes('bienvenida') || lowerLine.includes('welcome')) {
        currentItem.type = 'welcome';
      } else if (lowerLine.includes('cierre') || lowerLine.includes('closing')) {
        currentItem.type = 'closing';
      } else if (lowerLine.includes('workshop') || lowerLine.includes('taller')) {
        currentItem.type = 'workshop';
      } else if (lowerLine.includes('preguntas') || lowerLine.includes('q&a') || lowerLine.includes('qna')) {
        currentItem.type = 'qna';
      }
    }
  }

  // Agregar el último item si existe
  if (currentItem && currentItem.title) {
    agendaItems.push({
      ...currentItem,
      event_tracker: eventTrackerId,
    });
  }

  // Si no se encontraron items con el parser básico, intentar un método alternativo
  if (agendaItems.length === 0) {
    // Buscar patrones de hora y texto asociado
    for (let i = 0; i < lines.length; i++) {
      const timeMatch = lines[i].match(/(\d{1,2}):(\d{2})/);
      if (timeMatch && i + 1 < lines.length) {
        const title = lines[i + 1];
        if (title && title.length > 5) {
          agendaItems.push({
            title,
            description: title,
            date: currentDate || new Date().toISOString().split('T')[0],
            startTime: timeMatch[0].padStart(5, '0'),
            endTime: timeMatch[0].padStart(5, '0'),
            speakerIds: [],
            type: 'session',
            event_tracker: eventTrackerId,
          });
        }
      }
    }
  }

  return agendaItems;
}

