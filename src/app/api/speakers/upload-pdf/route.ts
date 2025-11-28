import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Speaker } from '@/lib/mongodb/models/Speaker';
import { EventTracker } from '@/lib/mongodb/models/EventTracker';
import fs from 'fs';
import path from 'path';

// Importación dinámica de pdf-parse para evitar problemas en el build
let pdfParse: any;
async function getPdfParse() {
  if (!pdfParse) {
    const pdfParseModule = await import('pdf-parse');
    // pdf-parse exporta la función directamente, no como default
    pdfParse = pdfParseModule;
  }
  return pdfParse;
}

// POST /api/speakers/upload-pdf - Cargar speakers desde PDF
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { pdfPath, event_tracker } = body;
    
    if (!pdfPath) {
      return NextResponse.json({ error: 'Ruta del PDF requerida' }, { status: 400 });
    }

    // Obtener el evento activo por defecto si no se proporciona
    let eventTrackerId = event_tracker;
    if (!eventTrackerId) {
      const activeEventTracker = await EventTracker.findOne({ isActive: true });
      if (activeEventTracker) {
        eventTrackerId = activeEventTracker._id.toString();
      }
    }

    // Leer el archivo PDF
    const fullPath = path.resolve(pdfPath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'El archivo PDF no existe en la ruta especificada' }, { status: 404 });
    }

    const dataBuffer = fs.readFileSync(fullPath);
    const pdf = await getPdfParse();
    const pdfData = await pdf(dataBuffer);
    
    // Extraer texto del PDF
    const text = pdfData.text;
    
    // Procesar el texto para extraer información de doctores
    // Este es un parser básico - puede necesitar ajustes según el formato del PDF
    const speakers = parseDoctorsFromPDF(text, eventTrackerId);
    
    if (speakers.length === 0) {
      return NextResponse.json({ 
        error: 'No se pudieron extraer doctores del PDF. Verifique el formato del documento.',
        extractedText: text.substring(0, 500) // Primeros 500 caracteres para debugging
      }, { status: 400 });
    }

    // Guardar los speakers en la base de datos
    const savedSpeakers = [];
    const errors = [];

    for (const speakerData of speakers) {
      try {
        // Verificar si el speaker ya existe por nombre
        const existingSpeaker = await Speaker.findOne({ 
          name: speakerData.name,
          event_tracker: eventTrackerId 
        });

        if (existingSpeaker) {
          // Actualizar el speaker existente
          Object.assign(existingSpeaker, speakerData);
          await existingSpeaker.save();
          savedSpeakers.push({ speakerId: existingSpeaker._id.toString(), ...existingSpeaker.toObject(), action: 'updated' });
        } else {
          // Crear nuevo speaker
          const speaker = new Speaker(speakerData);
          await speaker.save();
          savedSpeakers.push({ speakerId: speaker._id.toString(), ...speaker.toObject(), action: 'created' });
        }
      } catch (error: any) {
        errors.push({ name: speakerData.name, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      total: speakers.length,
      saved: savedSpeakers.length,
      created: savedSpeakers.filter(s => s.action === 'created').length,
      updated: savedSpeakers.filter(s => s.action === 'updated').length,
      errors: errors.length > 0 ? errors : undefined,
      speakers: savedSpeakers,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/speakers/upload-pdf:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Parsea el texto del PDF para extraer información de doctores
 * Este es un parser básico que puede necesitar ajustes según el formato específico del PDF
 */
function parseDoctorsFromPDF(text: string, eventTrackerId?: string): Array<{
  name: string;
  specialty: string;
  bio: string;
  imageUrl: string;
  imageHint: string;
  qualifications?: string[];
  event_tracker?: string;
}> {
  const speakers: Array<{
    name: string;
    specialty: string;
    bio: string;
    imageUrl: string;
    imageHint: string;
    qualifications?: string[];
    event_tracker?: string;
  }> = [];

  // Dividir el texto en líneas
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentSpeaker: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar inicio de un nuevo doctor (puede ser un nombre seguido de especialidad)
    // Patrones comunes: "Dr. Nombre Apellido" o "Nombre Apellido, Especialidad"
    const doctorPattern = /^(Dr\.?|Dra\.?|Doctor|Doctora)\s+(.+?)(?:\s*,\s*(.+))?$/i;
    const namePattern = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+)+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/;
    
    if (doctorPattern.test(line) || (namePattern.test(line) && line.split(' ').length >= 2)) {
      // Guardar el speaker anterior si existe
      if (currentSpeaker && currentSpeaker.name) {
        speakers.push({
          ...currentSpeaker,
          event_tracker: eventTrackerId,
        });
      }

      // Crear nuevo speaker
      const match = line.match(doctorPattern);
      if (match) {
        currentSpeaker = {
          name: match[2].trim(),
          specialty: match[3]?.trim() || 'Medicina',
          bio: '',
          imageUrl: '',
          imageHint: currentSpeaker?.name || match[2].trim(),
          qualifications: [],
        };
      } else {
        // Intentar extraer nombre y especialidad de diferentes formatos
        const parts = line.split(',').map(p => p.trim());
        currentSpeaker = {
          name: parts[0].replace(/^(Dr\.?|Dra\.?|Doctor|Doctora)\s+/i, '').trim(),
          specialty: parts[1] || 'Medicina',
          bio: '',
          imageUrl: '',
          imageHint: parts[0].replace(/^(Dr\.?|Dra\.?|Doctor|Doctora)\s+/i, '').trim(),
          qualifications: [],
        };
      }
    } else if (currentSpeaker) {
      // Agregar información adicional al speaker actual
      if (line.toLowerCase().includes('especialidad') || line.toLowerCase().includes('especialización')) {
        const specialtyMatch = line.match(/[Ee]specialidad[:\s]+(.+)/i);
        if (specialtyMatch) {
          currentSpeaker.specialty = specialtyMatch[1].trim();
        }
      } else if (line.length > 20 && !currentSpeaker.bio) {
        // Si la línea es larga y no hay bio, usarla como bio
        currentSpeaker.bio = line;
      } else if (currentSpeaker.bio && line.length > 10) {
        // Agregar más texto a la bio
        currentSpeaker.bio += ' ' + line;
      }
    }
  }

  // Agregar el último speaker si existe
  if (currentSpeaker && currentSpeaker.name) {
    speakers.push({
      ...currentSpeaker,
      event_tracker: eventTrackerId,
    });
  }

  // Si no se encontraron speakers con el parser básico, intentar un método alternativo
  if (speakers.length === 0) {
    // Buscar líneas que parezcan nombres de doctores
    const nameLines = lines.filter(line => {
      const words = line.split(/\s+/);
      return words.length >= 2 && words.length <= 5 && 
             /^[A-ZÁÉÍÓÚÑ]/.test(line) &&
             !line.match(/^\d+/) &&
             line.length < 100;
    });

    for (const nameLine of nameLines) {
      const cleanName = nameLine.replace(/^(Dr\.?|Dra\.?|Doctor|Doctora)\s+/i, '').trim();
      if (cleanName.length > 5) {
        speakers.push({
          name: cleanName,
          specialty: 'Medicina',
          bio: `Ponente en el evento`,
          imageUrl: '',
          imageHint: cleanName,
          qualifications: [],
          event_tracker: eventTrackerId,
        });
      }
    }
  }

  return speakers;
}

