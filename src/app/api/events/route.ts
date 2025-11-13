import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Event } from '@/lib/mongodb/models/Event';

// GET /api/events - Obtener eventos
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ id: event._id.toString(), ...event.toObject() });
    }
    
    // Obtener todos los eventos ordenados por fecha y hora (como strings)
    const events = await Event.find({}).sort({ date: 1, startTime: 1 });
    return NextResponse.json(events.map(event => ({ id: event._id.toString(), ...event.toObject() })));
  } catch (error: any) {
    console.error('Error en GET /api/events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/events - Crear evento (solo admins)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const event = new Event(body);
    await event.save();
    
    return NextResponse.json({ id: event._id.toString(), ...event.toObject() }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/events - Actualizar evento (solo admins)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 });
    }
    
    const event = await Event.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ id: event._id.toString(), ...event.toObject() });
  } catch (error: any) {
    console.error('Error en PUT /api/events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/events - Eliminar evento (solo admins)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 });
    }
    
    const event = await Event.findByIdAndDelete(eventId);
    
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /api/events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

