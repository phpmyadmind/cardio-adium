import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Speaker } from '@/lib/mongodb/models/Speaker';
import mongoose from 'mongoose';

// GET /api/speakers - Obtener speakers
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const speakerId = searchParams.get('speakerId');
    const eventTrackerId = searchParams.get('eventTrackerId');
    
    if (speakerId) {
      // Validar que el ID sea un ObjectId válido
      if (!mongoose.Types.ObjectId.isValid(speakerId)) {
        return NextResponse.json({ 
          error: `ID de speaker inválido: "${speakerId}". El ID debe ser un ObjectId válido de MongoDB.` 
        }, { status: 400 });
      }
      
      const speaker = await Speaker.findById(speakerId);
      if (!speaker) {
        return NextResponse.json({ error: 'Speaker no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ speakerId: speaker._id.toString(), ...speaker.toObject() });
    }
    
    // Construir query de filtrado
    let query: any = {};
    if (eventTrackerId) {
      query.event_tracker = eventTrackerId;
    }
    
    // Obtener todos los speakers
    const speakers = await Speaker.find(query);
    return NextResponse.json(speakers.map(speaker => ({ speakerId: speaker._id.toString(), ...speaker.toObject() })));
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
    
    return NextResponse.json({ speakerId: speaker._id.toString(), ...speaker.toObject() }, { status: 201 });
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
    const { speakerId, ...updateData } = body;
    
    if (!speakerId) {
      return NextResponse.json({ error: 'ID de speaker requerido' }, { status: 400 });
    }
    
    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(speakerId)) {
      console.error(`ID de speaker inválido recibido: "${speakerId}" (tipo: ${typeof speakerId})`);
      // Intentar buscar el speaker por nombre si el ID no es válido (para compatibilidad con datos antiguos)
      if (updateData.name) {
        const speakerByName = await Speaker.findOneAndUpdate(
          { name: updateData.name },
          updateData,
          { new: true, runValidators: true }
        );
        if (speakerByName) {
          console.log(`Speaker encontrado por nombre: ${speakerByName._id.toString()}`);
          return NextResponse.json({ speakerId: speakerByName._id.toString(), ...speakerByName.toObject() });
        }
      }
      
      return NextResponse.json({ 
        error: `ID de speaker inválido: "${speakerId}". El ID debe ser un ObjectId válido de MongoDB (24 caracteres hexadecimales). Por favor, recargue la página para obtener los IDs actualizados.` 
      }, { status: 400 });
    }
    
    const speaker = await Speaker.findByIdAndUpdate(speakerId, updateData, { new: true, runValidators: true });
    
    if (!speaker) {
      return NextResponse.json({ error: 'Speaker no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ speakerId: speaker._id.toString(), ...speaker.toObject() });
  } catch (error: any) {
    console.error('Error en PUT /api/speakers:', error);
    // Si el error es de casting de ObjectId, proporcionar un mensaje más claro
    if (error.name === 'CastError' && error.path === '_id') {
      return NextResponse.json({ 
        error: `ID de speaker inválido: "${error.value}". El ID debe ser un ObjectId válido de MongoDB. Por favor, verifique que está editando un speaker existente y recargue la página si es necesario.` 
      }, { status: 400 });
    }
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
    
    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(speakerId)) {
      return NextResponse.json({ 
        error: `ID de speaker inválido: "${speakerId}". El ID debe ser un ObjectId válido de MongoDB.` 
      }, { status: 400 });
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

