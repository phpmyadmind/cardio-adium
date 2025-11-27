import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { EventTracker } from '@/lib/mongodb/models/EventTracker';

// GET /api/event-trackers - Obtener event trackers
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const eventTrackerId = searchParams.get('eventTrackerId');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    if (eventTrackerId) {
      // Obtener un event tracker específico
      const eventTracker = await EventTracker.findById(eventTrackerId);
      if (!eventTracker) {
        return NextResponse.json({ error: 'Event tracker no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ id: eventTracker._id.toString(), ...eventTracker.toObject() });
    }
    
    // Obtener todos los event trackers
    let query = {};
    if (activeOnly) {
      query = { isActive: true };
    }
    
    const eventTrackers = await EventTracker.find(query).sort({ createdAt: -1 });
    return NextResponse.json(eventTrackers.map(et => ({ id: et._id.toString(), ...et.toObject() })));
  } catch (error: any) {
    console.error('Error en GET /api/event-trackers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/event-trackers - Crear event tracker (solo admins)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Si se marca como activo, desactivar todos los demás
    if (body.isActive === true) {
      await EventTracker.updateMany({}, { isActive: false });
    }
    
    const eventTracker = new EventTracker(body);
    await eventTracker.save();
    
    return NextResponse.json({ id: eventTracker._id.toString(), ...eventTracker.toObject() }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/event-trackers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/event-trackers - Actualizar event tracker (solo admins)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de event tracker requerido' }, { status: 400 });
    }
    
    // Si se marca como activo, desactivar todos los demás
    if (updateData.isActive === true) {
      await EventTracker.updateMany({ _id: { $ne: id } }, { isActive: false });
    }
    
    const eventTracker = await EventTracker.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    if (!eventTracker) {
      return NextResponse.json({ error: 'Event tracker no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ id: eventTracker._id.toString(), ...eventTracker.toObject() });
  } catch (error: any) {
    console.error('Error en PUT /api/event-trackers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/event-trackers - Eliminar event tracker (solo admins)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const eventTrackerId = searchParams.get('eventTrackerId');
    
    if (!eventTrackerId) {
      return NextResponse.json({ error: 'ID de event tracker requerido' }, { status: 400 });
    }
    
    const eventTracker = await EventTracker.findByIdAndDelete(eventTrackerId);
    
    if (!eventTracker) {
      return NextResponse.json({ error: 'Event tracker no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /api/event-trackers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

