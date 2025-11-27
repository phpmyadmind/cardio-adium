import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Speaker } from '@/lib/mongodb/models/Speaker';

// GET /api/speakers - Obtener speakers
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const speakerId = searchParams.get('speakerId');
    const eventTrackerId = searchParams.get('eventTrackerId');
    
    if (speakerId) {
      const speaker = await Speaker.findById(speakerId);
      if (!speaker) {
        return NextResponse.json({ error: 'Speaker no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ id: speaker._id.toString(), ...speaker.toObject() });
    }
    
    // Construir query de filtrado
    let query: any = {};
    if (eventTrackerId) {
      query.event_tracker = eventTrackerId;
    }
    
    // Obtener todos los speakers
    const speakers = await Speaker.find(query);
    return NextResponse.json(speakers.map(speaker => ({ id: speaker._id.toString(), ...speaker.toObject() })));
  } catch (error: any) {
    console.error('Error en GET /api/speakers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/speakers - Crear speaker (solo admins)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const speaker = new Speaker(body);
    await speaker.save();
    
    return NextResponse.json({ id: speaker._id.toString(), ...speaker.toObject() }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/speakers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/speakers - Actualizar speaker (solo admins)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de speaker requerido' }, { status: 400 });
    }
    
    const speaker = await Speaker.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    if (!speaker) {
      return NextResponse.json({ error: 'Speaker no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ id: speaker._id.toString(), ...speaker.toObject() });
  } catch (error: any) {
    console.error('Error en PUT /api/speakers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/speakers - Eliminar speaker (solo admins)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const speakerId = searchParams.get('speakerId');
    
    if (!speakerId) {
      return NextResponse.json({ error: 'ID de speaker requerido' }, { status: 400 });
    }
    
    const speaker = await Speaker.findByIdAndDelete(speakerId);
    
    if (!speaker) {
      return NextResponse.json({ error: 'Speaker no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /api/speakers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

