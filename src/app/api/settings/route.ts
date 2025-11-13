import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Settings } from '@/lib/mongodb/models/Settings';

// GET /api/settings - Obtener configuración
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');
    
    if (key) {
      // Obtener un setting específico
      const setting = await Settings.findOne({ key });
      if (!setting) {
        // Retornar valor por defecto si no existe
        return NextResponse.json({ key, value: getDefaultValue(key), exists: false });
      }
      return NextResponse.json({ 
        id: setting._id.toString(), 
        key: setting.key,
        value: setting.value,
        exists: true,
        ...setting.toObject() 
      });
    }
    
    // Obtener todos los settings
    const allSettings = await Settings.find({});
    const settingsMap = allSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(settingsMap);
  } catch (error: any) {
    console.error('Error en GET /api/settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/settings - Actualizar o crear configuración
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { key, value, description, updatedBy } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'Key requerida' }, { status: 400 });
    }
    
    // Buscar o crear el setting
    const setting = await Settings.findOneAndUpdate(
      { key },
      { 
        value,
        description,
        updatedBy,
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    );
    
    return NextResponse.json({ 
      id: setting._id.toString(), 
      ...setting.toObject() 
    });
  } catch (error: any) {
    console.error('Error en PUT /api/settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función helper para valores por defecto
function getDefaultValue(key: string): any {
  const defaults: Record<string, any> = {
    'showQaTitle': true, // Por defecto mostrar la leyenda
  };
  return defaults[key] ?? null;
}

