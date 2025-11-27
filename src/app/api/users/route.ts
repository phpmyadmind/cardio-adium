import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { User } from '@/lib/mongodb/models/User';
import { EventTracker } from '@/lib/mongodb/models/EventTracker';
import bcrypt from 'bcryptjs';

// GET /api/users - Obtener usuarios (solo admins)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const identifier = searchParams.get('identifier'); // email o medicalId
    
    if (userId) {
      // Obtener un usuario específico
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ id: user._id.toString(), ...user.toObject() });
    }
    
    if (identifier) {
      // Buscar por email o medicalId
      const normalizedIdentifier = identifier.trim().toLowerCase();
      const user = await User.findOne({
        $or: [
          { email: normalizedIdentifier },
          { medicalId: identifier.trim() }
        ]
      });
      
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }
      
      return NextResponse.json({ id: user._id.toString(), ...user.toObject() });
    }
    
    // Listar todos los usuarios (solo para admins - verificar en middleware)
    const users = await User.find({});
    return NextResponse.json(users.map(user => ({ id: user._id.toString(), ...user.toObject() })));
  } catch (error: any) {
    console.error('Error en GET /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/users - Crear usuario
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [
        { email: body.email?.toLowerCase().trim() },
        { medicalId: body.medicalId?.trim() }
      ]
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.email === body.email?.toLowerCase() 
          ? 'Este correo electrónico ya está registrado.' 
          : 'Este número de identificación ya está registrado.' },
        { status: 400 }
      );
    }
    
    // Hash de contraseña si se proporciona
    let hashedPassword = undefined;
    if (body.password) {
      hashedPassword = await bcrypt.hash(body.password, 10);
    }
    
    // Obtener el evento activo por defecto si no se proporciona event_tracker
    let eventTrackerId = body.event_tracker || body.eventTracker; // Soporte para ambos nombres
    if (!eventTrackerId && !body.isAdmin) {
      const activeEventTracker = await EventTracker.findOne({ isActive: true });
      if (activeEventTracker) {
        eventTrackerId = activeEventTracker._id.toString();
      }
    }
    
    const userData = {
      email: body.email?.toLowerCase().trim(),
      medicalId: body.medicalId?.trim(),
      name: body.name,
      city: body.city,
      specialty: body.specialty,
      isAdmin: body.isAdmin || false,
      password: hashedPassword,
      termsAccepted: body.termsAccepted,
      question: body.question,
      answer: body.answer,
      event_tracker: eventTrackerId,
    };
    
    const user = new User(userData);
    await user.save();
    
    const userObj = user.toObject();
    delete userObj.password; // No devolver la contraseña
    
    return NextResponse.json({ 
      id: user._id.toString(), 
      ...userObj 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/users - Actualizar usuario
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }
    
    // Si hay contraseña, hashearla
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    // Normalizar email si existe
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    const userObj = user.toObject();
    delete userObj.password;
    
    return NextResponse.json({ id: user._id.toString(), ...userObj });
  } catch (error: any) {
    console.error('Error en PUT /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/users - Eliminar usuario
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

