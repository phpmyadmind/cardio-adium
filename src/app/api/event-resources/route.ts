import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * API para obtener recursos disponibles en la carpeta de un evento
 * GET /api/event-resources?eventTrackerId=xxx&type=logo|agenda|all
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventTrackerId = searchParams.get('eventTrackerId');
    const resourceType = searchParams.get('type') || 'all'; // 'logo', 'agenda', 'all'

    if (!eventTrackerId) {
      return NextResponse.json(
        { error: 'eventTrackerId es requerido' },
        { status: 400 }
      );
    }

    const publicDir = join(process.cwd(), 'public');
    const eventDir = join(publicDir, eventTrackerId);

    // Verificar si la carpeta del evento existe
    if (!existsSync(eventDir)) {
      return NextResponse.json({
        exists: false,
        resources: [],
        message: `La carpeta del evento ${eventTrackerId} no existe`
      });
    }

    // Leer archivos en la carpeta del evento
    const files = await readdir(eventDir);
    const resources: Array<{ name: string; path: string; type: string }> = [];

    for (const file of files) {
      const filePath = join(eventDir, file);
      const fileStat = await stat(filePath);
      
      if (fileStat.isFile()) {
        const lowerName = file.toLowerCase();
        let type = 'other';

        // Determinar el tipo de recurso
        if (lowerName.includes('logo') || lowerName.match(/\.(png|jpg|jpeg|svg|webp)$/i)) {
          type = 'logo';
        } else if (lowerName.includes('agenda') || lowerName.endsWith('.pdf')) {
          type = 'agenda';
        }

        // Filtrar por tipo si se especifica
        if (resourceType === 'all' || resourceType === type) {
          resources.push({
            name: file,
            path: `/${eventTrackerId}/${file}`,
            type
          });
        }
      }
    }

    return NextResponse.json({
      exists: true,
      eventTrackerId,
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('Error obteniendo recursos del evento:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener recursos del evento',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

