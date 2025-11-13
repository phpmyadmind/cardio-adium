import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { User, Event, Speaker, Question } from '@/lib/mongodb';
import { speakers, agendaItems, users, questions } from '@/lib/placeholder-data';

/**
 * API Route para insertar datos iniciales en MongoDB
 * POST /api/seed - Inserta datos de placeholder-data.ts
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const results = {
      speakers: { inserted: 0, errors: [] as string[] },
      events: { inserted: 0, errors: [] as string[] },
      users: { inserted: 0, errors: [] as string[] },
      questions: { inserted: 0, errors: [] as string[] },
    };

    // Insertar Speakers
    for (const speakerData of speakers) {
      try {
        // Verificar si ya existe
        const existing = await Speaker.findOne({ name: speakerData.name });
        if (existing) {
          results.speakers.errors.push(`Speaker "${speakerData.name}" ya existe`);
          continue;
        }

        const speaker = new Speaker({
          name: speakerData.name,
          specialty: speakerData.specialty,
          specialization: speakerData.specialty, // Alias
          bio: speakerData.bio,
          imageUrl: speakerData.imageUrl,
          imageHint: speakerData.imageHint,
          qualifications: speakerData.qualifications || [],
        });
        
        await speaker.save();
        results.speakers.inserted++;
      } catch (error: any) {
        results.speakers.errors.push(`Error insertando "${speakerData.name}": ${error.message}`);
      }
    }

    // Crear mapa de IDs de placeholder a IDs de MongoDB para speakers
    const speakerIdMap: Record<string, string> = {};
    for (let i = 0; i < speakers.length; i++) {
      const placeholderId = (i + 1).toString(); // '1', '2', '3', etc.
      const speaker = await Speaker.findOne({ name: speakers[i].name });
      if (speaker) {
        speakerIdMap[placeholderId] = speaker._id.toString();
      }
    }

    // Insertar Events (AgendaItems)
    for (const agendaItem of agendaItems) {
      try {
        // Verificar si ya existe
        const existing = await Event.findOne({ 
          date: agendaItem.date,
          title: agendaItem.topic
        });
        if (existing) {
          results.events.errors.push(`Evento "${agendaItem.topic}" ya existe`);
          continue;
        }

        // Convertir fecha y hora a Date objects
        const dateStr = agendaItem.date; // '2025-11-14'
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // Parsear hora de inicio (formato '08:00')
        const [startHour, startMinute] = agendaItem.startTime.split(':').map(Number);
        const startTime = new Date(year, month - 1, day, startHour, startMinute);
        
        // Parsear hora de fin (formato '08:10')
        const [endHour, endMinute] = agendaItem.endTime.split(':').map(Number);
        const endTime = new Date(year, month - 1, day, endHour, endMinute);

        // Mapear speakerIds de placeholder a IDs de MongoDB
        const mappedSpeakerIds = (agendaItem.speakerIds || []).map(placeholderId => {
          return speakerIdMap[placeholderId] || placeholderId;
        }).filter(id => id); // Filtrar IDs no encontrados

        const event = new Event({
          title: agendaItem.topic,
          description: agendaItem.topic, // Usar topic como descripción por ahora
          startTime: startTime,
          endTime: endTime,
          speakerIds: mappedSpeakerIds,
          date: agendaItem.date,
          type: agendaItem.type,
          moderator: agendaItem.moderator,
          location: agendaItem.location,
          section: agendaItem.section,
          participants: agendaItem.participants || [],
        });
        
        await event.save();
        results.events.inserted++;
      } catch (error: any) {
        results.events.errors.push(`Error insertando "${agendaItem.topic}": ${error.message}`);
      }
    }

    // Insertar Users
    for (const userData of users) {
      try {
        // Verificar si ya existe por email o medicalId
        const existing = await User.findOne({
          $or: [
            { email: userData.email.toLowerCase() },
            { medicalId: userData.medicalId }
          ]
        });
        if (existing) {
          results.users.errors.push(`Usuario "${userData.email}" ya existe`);
          continue;
        }

        const user = new User({
          email: userData.email.toLowerCase(),
          medicalId: userData.medicalId,
          name: userData.name,
          city: userData.city,
          specialty: userData.specialty,
          isAdmin: false,
        });
        
        await user.save();
        results.users.inserted++;
      } catch (error: any) {
        results.users.errors.push(`Error insertando "${userData.email}": ${error.message}`);
      }
    }

    // Insertar Questions
    // Nota: Las preguntas en placeholder-data tienen speakers que no existen (Dr. Emily Carter, Dr. Ben Hanson)
    // Solo insertaremos preguntas si el speaker y usuario existen
    for (const questionData of questions) {
      try {
        // Buscar el speaker por nombre para obtener su ID
        const speaker = await Speaker.findOne({ name: questionData.speakerName });
        if (!speaker) {
          results.questions.errors.push(`Speaker "${questionData.speakerName}" no encontrado - se omite la pregunta`);
          continue;
        }

        // Buscar el usuario por nombre para obtener su ID
        const user = await User.findOne({ name: questionData.userName });
        if (!user) {
          results.questions.errors.push(`Usuario "${questionData.userName}" no encontrado - se omite la pregunta`);
          continue;
        }

        // Verificar si ya existe
        const existing = await Question.findOne({
          userId: user._id.toString(),
          text: questionData.question,
        });
        if (existing) {
          results.questions.errors.push(`Pregunta ya existe`);
          continue;
        }

        const question = new Question({
          userId: user._id.toString(),
          text: questionData.question,
          userName: questionData.userName,
          speakerName: questionData.speakerName,
          isApproved: true,
          isAnswered: questionData.isAnswered,
          submittedAt: questionData.submittedAt,
        });
        
        await question.save();
        results.questions.inserted++;
      } catch (error: any) {
        results.questions.errors.push(`Error insertando pregunta: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Datos insertados correctamente',
      results,
    });
  } catch (error: any) {
    console.error('Error en seed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al insertar datos' 
      },
      { status: 500 }
    );
  }
}

