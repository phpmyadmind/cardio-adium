import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { User } from '@/lib/mongodb/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { identifier, password, isAdmin } = await request.json();
    
    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Correo o número de identificación requerido' },
        { status: 400 }
      );
    }
    
    // Buscar usuario por email o medicalId (solo email para admin)
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = await User.findOne(
      isAdmin 
        ? { email: normalizedIdentifier } // Admin solo por email
        : {
            $or: [
              { email: normalizedIdentifier },
              { medicalId: identifier.trim() }
            ]
          }
    );
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: isAdmin 
            ? 'Usuario no encontrado. Por favor verifique su correo electrónico.' 
            : 'Usuario no encontrado. Por favor verifique su correo o número de identificación.' 
        },
        { status: 404 }
      );
    }
    
    // Si es login de admin, verificar contraseña y rol
    if (isAdmin) {
      if (!user.isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado. Se requieren privilegios de administrador.' },
          { status: 403 }
        );
      }
      
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Contraseña requerida para administradores' },
          { status: 400 }
        );
      }
      
      if (!user.password || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json(
          { success: false, error: 'Correo electrónico o contraseña inválidos.' },
          { status: 401 }
        );
      }
    } else {
      // Si es login de usuario normal, verificar que no sea admin
      if (user.isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Este usuario es un administrador. Por favor use el formulario de login de administrador.' },
          { status: 403 }
        );
      }
    }
    
    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();
    
    const userObj = user.toObject();
    delete userObj.password;
    
    return NextResponse.json({
      success: true,
      user: { id: user._id.toString(), ...userObj }
    });
  } catch (error: any) {
    console.error('Error en POST /api/auth/login:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al autenticar usuario.' },
      { status: 500 }
    );
  }
}

