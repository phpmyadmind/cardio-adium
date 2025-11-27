import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Agenda } from '@/lib/mongodb/models/Agenda';

// GET /api/agenda - Obtener eventos de agenda
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const agendaId = searchParams.get('agendaId');
    const eventTrackerId = searchParams.get('eventTrackerId');
    const date = searchParams.get('date');
    
    if (agendaId) {
      // Obtener un evento de agenda específico
      const agendaItem = await Agenda.findById(agendaId);
      if (!agendaItem) {
        return NextResponse.json({ error: 'Evento de agenda no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ id: agendaItem._id.toString(), ...agendaItem.toObject() });
    }
    
    // Construir query de filtrado
    let query: any = {};
    if (eventTrackerId) {
      query.event_tracker = eventTrackerId;
    }
    if (date) {
      query.date = date;
    }
    
    // Obtener todos los eventos de agenda ordenados por fecha y hora
    const agendaItems = await Agenda.find(query).sort({ date: 1, startTime: 1 });
    return NextResponse.json(agendaItems.map(item => ({ id: item._id.toString(), ...item.toObject() })));
  } catch (error: any) {
    console.error('Error en GET /api/agenda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/agenda - Crear evento de agenda (solo admins)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const agendaItem = new Agenda(body);
    await agendaItem.save();
    
    return NextResponse.json({ id: agendaItem._id.toString(), ...agendaItem.toObject() }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/agenda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/agenda - Actualizar evento de agenda (solo admins)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de evento de agenda requerido' }, { status: 400 });
    }
    
    const agendaItem = await Agenda.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!agendaItem) {
      return NextResponse.json({ error: 'Evento de agenda no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ id: agendaItem._id.toString(), ...agendaItem.toObject() });
  } catch (error: any) {
    console.error('Error en PUT /api/agenda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/agenda - Eliminar evento de agenda (solo admins)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const agendaId = searchParams.get('agendaId');
    
    if (!agendaId) {
      return NextResponse.json({ error: 'ID de evento de agenda requerido' }, { status: 400 });
    }
    
    const agendaItem = await Agenda.findByIdAndDelete(agendaId);
    
    if (!agendaItem) {
      return NextResponse.json({ error: 'Evento de agenda no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /api/agenda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

