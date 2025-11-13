import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { Question } from '@/lib/mongodb/models/Question';

// GET /api/questions - Obtener preguntas
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get('questionId');
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');
    
    if (questionId) {
      const question = await Question.findById(questionId);
      if (!question) {
        return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ id: question._id.toString(), ...question.toObject() });
    }
    
    // Construir query
    const query: any = {};
    if (eventId) query.eventId = eventId;
    if (userId) query.userId = userId;
    
    const questions = await Question.find(query).sort({ submittedAt: -1 });
    return NextResponse.json(questions.map(question => ({ id: question._id.toString(), ...question.toObject() })));
  } catch (error: any) {
    console.error('Error en GET /api/questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/questions - Crear pregunta (usuarios autenticados)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const question = new Question({
      ...body,
      submittedAt: new Date(),
      isApproved: false,
    });
    await question.save();
    
    return NextResponse.json({ id: question._id.toString(), ...question.toObject() }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/questions - Actualizar pregunta (solo admins)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de pregunta requerido' }, { status: 400 });
    }
    
    const question = await Question.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    if (!question) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({ id: question._id.toString(), ...question.toObject() });
  } catch (error: any) {
    console.error('Error en PUT /api/questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/questions - Eliminar pregunta (solo admins)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get('questionId');
    
    if (!questionId) {
      return NextResponse.json({ error: 'ID de pregunta requerido' }, { status: 400 });
    }
    
    const question = await Question.findByIdAndDelete(questionId);
    
    if (!question) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /api/questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

