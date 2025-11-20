import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connect';
import { User } from '@/lib/mongodb/models/User';
import { Event } from '@/lib/mongodb/models/Event';
import { Speaker } from '@/lib/mongodb/models/Speaker';
import { Question } from '@/lib/mongodb/models/Question';
import { SurveyResponse } from '@/lib/mongodb/models/SurveyResponse';
import { SurveyQuestion } from '@/lib/mongodb/models/SurveyQuestion';

// GET /api/reports/executive - Obtener datos agregados para informe gerencial
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Obtener todos los datos
    const [users, events, speakers, questions, surveyResponses, surveyQuestions] = await Promise.all([
      User.find({}),
      Event.find({}),
      Speaker.find({}),
      Question.find({}),
      SurveyResponse.find({}),
      SurveyQuestion.find({}),
    ]);

    // Crear un mapa de questionId y (day, questionNumber, questionType) a question_text
    const questionTextMap = new Map<string, string>();
    const questionTextByKeyMap = new Map<string, string>();
    
    surveyQuestions.forEach((sq) => {
      // Mapeo por _id
      questionTextMap.set(sq._id.toString(), sq.question_text);
      // Mapeo por combinación de day, questionNumber, questionType (como fallback)
      const key = `${sq.day}-${sq.question_number}-${sq.question_type}`;
      questionTextByKeyMap.set(key, sq.question_text);
    });

    // Métricas de usuarios
    const totalUsers = users.length;
    const totalAdmins = users.filter(u => u.isAdmin).length;
    const totalRegularUsers = totalUsers - totalAdmins;
    const usersWithLastLogin = users.filter(u => u.lastLogin).length;
    const usersBySpecialty = users.reduce((acc, user) => {
      const specialty = user.specialty || 'Sin especialidad';
      acc[specialty] = (acc[specialty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const usersByCity = users.reduce((acc, user) => {
      const city = user.city || 'Sin ciudad';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Métricas de eventos
    const totalEvents = events.length;
    const eventsByType = events.reduce((acc, event) => {
      const type = event.type || 'sin tipo';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const eventsByDate = events.reduce((acc, event) => {
      acc[event.date] = (acc[event.date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Métricas de preguntas
    const totalQuestions = questions.length;
    const approvedQuestions = questions.filter(q => q.isApproved).length;
    const pendingQuestions = totalQuestions - approvedQuestions;
    const answeredQuestions = questions.filter(q => q.isAnswered).length;
    const unansweredQuestions = totalQuestions - answeredQuestions;

    // Métricas de encuestas - Análisis detallado
    const totalSurveyResponses = surveyResponses.length;
    const uniqueSurveyUsers = new Set(surveyResponses.map(r => r.userId).filter(Boolean)).size;
    const averageRating = surveyResponses.length > 0
      ? surveyResponses.reduce((acc, r) => acc + r.rating, 0) / surveyResponses.length
      : 0;
    
    // Respuestas por día
    const responsesByDay = surveyResponses.reduce((acc, r) => {
      acc[r.day] = (acc[r.day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Respuestas por texto de pregunta (usando question_text en lugar de questionType)
    const responsesByQuestionText = surveyResponses.reduce((acc, r) => {
      // Obtener question_text del mapa
      const questionText = questionTextMap.get(r.questionId) || 
                          questionTextByKeyMap.get(`${r.day}-${r.questionNumber}-${r.questionType}`) ||
                          r.questionType || 
                          'Sin texto de pregunta';
      if (!acc[questionText]) {
        acc[questionText] = { 
          count: 0, 
          totalRating: 0, 
          ratings: [],
          questionNumber: r.questionNumber,
          dayDate: r.dayDate,
          day: r.day,
        };
      }
      acc[questionText].count += 1;
      acc[questionText].totalRating += r.rating;
      acc[questionText].ratings.push(r.rating);
      // Actualizar fecha si encontramos una más temprana
      if (r.dayDate < acc[questionText].dayDate || (r.dayDate === acc[questionText].dayDate && r.day < acc[questionText].day)) {
        acc[questionText].dayDate = r.dayDate;
        acc[questionText].day = r.day;
      }
      return acc;
    }, {} as Record<string, { 
      count: number; 
      totalRating: number; 
      ratings: number[];
      questionNumber: number;
      dayDate: string;
      day: number;
    }>);

    // Calcular promedio por texto de pregunta
    const responsesByQuestionTypeWithAvg = Object.entries(responsesByQuestionText).map(([questionText, data]) => {
      const typedData = data as { count: number; totalRating: number; questionNumber: number; dayDate: string; day: number };
      return {
        type: questionText, // Mantenemos 'type' para compatibilidad pero ahora contiene question_text
        count: typedData.count,
        averageRating: parseFloat((typedData.totalRating / typedData.count).toFixed(2)),
        questionNumber: typedData.questionNumber,
        dayDate: typedData.dayDate,
        day: typedData.day,
      };
    }).sort((a, b) => {
      // Ordenar por número de pregunta primero, luego por fecha
      if (a.questionNumber !== b.questionNumber) {
        return a.questionNumber - b.questionNumber;
      }
      return a.dayDate.localeCompare(b.dayDate);
    });

    // Respuestas por speaker
    const responsesBySpeaker = surveyResponses
      .filter(r => r.speakerName)
      .reduce((acc, r) => {
        const speaker = r.speakerName || 'Sin speaker';
        if (!acc[speaker]) {
          acc[speaker] = { count: 0, totalRating: 0, ratings: [] };
        }
        acc[speaker].count += 1;
        acc[speaker].totalRating += r.rating;
        acc[speaker].ratings.push(r.rating);
        return acc;
      }, {} as Record<string, { count: number; totalRating: number; ratings: number[] }>);

    // Calcular promedio por speaker
    const responsesBySpeakerWithAvg = Object.entries(responsesBySpeaker)
      .map(([speaker, data]) => {
        const typedData = data as { count: number; totalRating: number; ratings: number[] };
        return {
          speaker,
          count: typedData.count,
          averageRating: parseFloat((typedData.totalRating / typedData.count).toFixed(2)),
        };
      })
      .sort((a, b) => b.count - a.count);

    // Distribución de calificaciones (rating)
    const ratingDistribution = surveyResponses.reduce((acc, r) => {
      const rating = Math.round(r.rating);
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Respuestas por fecha (submittedAt)
    const responsesByDate = surveyResponses.reduce((acc, r) => {
      if (r.submittedAt) {
        const date = new Date(r.submittedAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Respuestas con texto vs sin texto
    const responsesWithText = surveyResponses.filter(r => r.textResponse && r.textResponse.trim().length > 0).length;
    const responsesWithoutText = totalSurveyResponses - responsesWithText;

    // Detalle de respuestas con texto
    const responsesWithTextDetail = surveyResponses
      .filter(r => r.textResponse && r.textResponse.trim().length > 0)
      .map(r => {
        // Obtener question_text
        const questionText = questionTextMap.get(r.questionId) || 
                            questionTextByKeyMap.get(`${r.day}-${r.questionNumber}-${r.questionType}`) ||
                            r.questionType || 
                            'Sin texto de pregunta';
        
        return {
          userId: r.userId || 'Anónimo',
          userName: r.userName || 'Sin nombre',
          day: r.day,
          dayDate: r.dayDate,
          questionNumber: r.questionNumber,
          questionType: questionText,
          speakerName: r.speakerName || null,
          rating: r.rating,
          textResponse: r.textResponse,
          submittedAt: r.submittedAt,
        };
      })
      .sort((a, b) => {
        // Ordenar por fecha de envío (más reciente primero)
        const dateA = new Date(a.submittedAt).getTime();
        const dateB = new Date(b.submittedAt).getTime();
        return dateB - dateA;
      });

    // Top 10 usuarios más activos en encuestas
    const userResponseCounts = surveyResponses
      .filter(r => r.userId)
      .reduce((acc, r) => {
        const userId = r.userId!;
        if (!acc[userId]) {
          acc[userId] = { userId, userName: r.userName || 'Sin nombre', count: 0 };
        }
        acc[userId].count += 1;
        return acc;
      }, {} as Record<string, { userId: string; userName: string; count: number }>);

    const topActiveUsers = Object.values(userResponseCounts)
      .sort((a, b) => {
        const userA = a as { userId: string; userName: string; count: number };
        const userB = b as { userId: string; userName: string; count: number };
        return userB.count - userA.count;
      })
      .slice(0, 20);

    // Estadísticas por día (promedio de rating por día)
    const dayStats = surveyResponses.reduce((acc, r) => {
      if (!acc[r.day]) {
        acc[r.day] = { count: 0, totalRating: 0, dayDate: r.dayDate };
      }
      acc[r.day].count += 1;
      acc[r.day].totalRating += r.rating;
      return acc;
    }, {} as Record<number, { count: number; totalRating: number; dayDate: string }>);

    const dayStatsWithAvg = Object.entries(dayStats).map(([day, data]) => {
      const typedData = data as { count: number; totalRating: number; dayDate: string };
      return {
        day: parseInt(day),
        dayDate: typedData.dayDate,
        count: typedData.count,
        averageRating: parseFloat((typedData.totalRating / typedData.count).toFixed(2)),
      };
    });

    // Calificaciones mínima, máxima y mediana
    const ratings = surveyResponses.map(r => r.rating).sort((a, b) => a - b);
    const minRating = ratings.length > 0 ? ratings[0] : 0;
    const maxRating = ratings.length > 0 ? ratings[ratings.length - 1] : 0;
    const medianRating = ratings.length > 0
      ? ratings.length % 2 === 0
        ? (ratings[ratings.length / 2 - 1] + ratings[ratings.length / 2]) / 2
        : ratings[Math.floor(ratings.length / 2)]
      : 0;

    // Detalle de votaciones por día y speaker
    const speakerVotesByDay = surveyResponses
      .filter(r => r.speakerName)
      .reduce((acc, r) => {
        const day = r.day;
        if (!acc[day]) {
          acc[day] = {};
        }
        const speaker = r.speakerName || 'Sin speaker';
        if (!acc[day][speaker]) {
          acc[day][speaker] = {
            speaker,
            day,
            dayDate: r.dayDate,
            votes: [],
            count: 0,
            totalRating: 0,
            ratings: [] as number[],
          };
        }
        // Obtener question_text
        const questionText = questionTextMap.get(r.questionId) || 
                            questionTextByKeyMap.get(`${r.day}-${r.questionNumber}-${r.questionType}`) ||
                            r.questionType || 
                            'Sin texto de pregunta';
        
        acc[day][speaker].votes.push({
          userId: r.userId || 'Anónimo',
          userName: r.userName || 'Sin nombre',
          rating: r.rating,
          questionType: questionText, // Ahora contiene question_text
          questionNumber: r.questionNumber,
          textResponse: r.textResponse,
          submittedAt: r.submittedAt,
        });
        acc[day][speaker].count += 1;
        acc[day][speaker].totalRating += r.rating;
        acc[day][speaker].ratings.push(r.rating);
        return acc;
      }, {} as Record<number, Record<string, {
        speaker: string;
        day: number;
        dayDate: string;
        votes: Array<{
          userId: string;
          userName: string;
          rating: number;
          questionType: string;
          questionNumber: number;
          textResponse?: string;
          submittedAt: Date;
        }>;
        count: number;
        totalRating: number;
        ratings: number[];
      }>>);

    // Convertir a array y calcular promedios
    const speakerVotesByDayArray = Object.entries(speakerVotesByDay).map(([day, speakers]) => {
      const typedSpeakers = speakers as Record<string, {
        speaker: string;
        day: number;
        dayDate: string;
        votes: Array<{
          userId: string;
          userName: string;
          rating: number;
          questionType: string;
          questionNumber: number;
          textResponse?: string;
          submittedAt: Date;
        }>;
        count: number;
        totalRating: number;
        ratings: number[];
      }>;
      return {
        day: parseInt(day),
        dayDate: Object.values(typedSpeakers)[0]?.dayDate || '',
        speakers: Object.values(typedSpeakers).map(s => ({
        speaker: s.speaker,
        day: s.day,
        dayDate: s.dayDate,
        votes: s.votes,
        count: s.count,
        averageRating: parseFloat((s.totalRating / s.count).toFixed(2)),
        minRating: Math.min(...s.ratings),
        maxRating: Math.max(...s.ratings),
        medianRating: s.ratings.length > 0
          ? s.ratings.length % 2 === 0
            ? (s.ratings[s.ratings.length / 2 - 1] + s.ratings[s.ratings.length / 2]) / 2
            : s.ratings[Math.floor(s.ratings.length / 2)]
          : 0,
        })),
      };
    });

    // Detalle de votaciones por día y texto de pregunta
    const questionVotesByDay = surveyResponses.reduce((acc, r) => {
      const day = r.day;
      if (!acc[day]) {
        acc[day] = {};
      }
      // Obtener question_text
      const questionText = questionTextMap.get(r.questionId) || 
                          questionTextByKeyMap.get(`${r.day}-${r.questionNumber}-${r.questionType}`) ||
                          r.questionType || 
                          'Sin texto de pregunta';
      
      if (!acc[day][questionText]) {
        acc[day][questionText] = {
          questionType: questionText, // Mantenemos el nombre 'questionType' pero contiene question_text
          day,
          dayDate: r.dayDate,
          votes: [],
          count: 0,
          totalRating: 0,
          ratings: [] as number[],
        };
      }
      acc[day][questionText].votes.push({
        userId: r.userId || 'Anónimo',
        userName: r.userName || 'Sin nombre',
        rating: r.rating,
        questionNumber: r.questionNumber,
        speakerName: r.speakerName,
        textResponse: r.textResponse,
        submittedAt: r.submittedAt,
      });
      acc[day][questionText].count += 1;
      acc[day][questionText].totalRating += r.rating;
      acc[day][questionText].ratings.push(r.rating);
      return acc;
    }, {} as Record<number, Record<string, {
      questionType: string;
      day: number;
      dayDate: string;
      votes: Array<{
        userId: string;
        userName: string;
        rating: number;
        questionNumber: number;
        speakerName?: string;
        textResponse?: string;
        submittedAt: Date;
      }>;
      count: number;
      totalRating: number;
      ratings: number[];
    }>>);

    // Convertir a array y calcular promedios
    const questionVotesByDayArray = Object.entries(questionVotesByDay).map(([day, questionTypes]) => {
      const typedQuestionTypes = questionTypes as Record<string, {
        questionType: string;
        day: number;
        dayDate: string;
        votes: Array<{
          userId: string;
          userName: string;
          rating: number;
          questionNumber: number;
          speakerName?: string;
          textResponse?: string;
          submittedAt: Date;
        }>;
        count: number;
        totalRating: number;
        ratings: number[];
      }>;
      return {
        day: parseInt(day),
        dayDate: Object.values(typedQuestionTypes)[0]?.dayDate || '',
        questionTypes: Object.values(typedQuestionTypes).map(q => ({
        questionType: q.questionType,
        day: q.day,
        dayDate: q.dayDate,
        votes: q.votes,
        count: q.count,
        averageRating: parseFloat((q.totalRating / q.count).toFixed(2)),
        minRating: Math.min(...q.ratings),
        maxRating: Math.max(...q.ratings),
        medianRating: q.ratings.length > 0
          ? q.ratings.length % 2 === 0
            ? (q.ratings[q.ratings.length / 2 - 1] + q.ratings[q.ratings.length / 2]) / 2
            : q.ratings[Math.floor(q.ratings.length / 2)]
          : 0,
        })),
      };
    });

    // Distribución de usuarios por fecha de registro (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = users.filter(u => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo);
    const usersByRegistrationDate = recentUsers.reduce((acc, user) => {
      if (user.createdAt) {
        const date = new Date(user.createdAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Top 5 especialidades
    const topSpecialties = Object.entries(usersBySpecialty)
      .sort(([, a], [, b]) => {
        const countA = a as number;
        const countB = b as number;
        return countB - countA;
      })
      .slice(0, 5)
      .map(([specialty, count]) => ({ specialty, count: count as number }));

    // Top 5 ciudades
    const topCities = Object.entries(usersByCity)
      .sort(([, a], [, b]) => {
        const countA = a as number;
        const countB = b as number;
        return countB - countA;
      })
      .slice(0, 5)
      .map(([city, count]) => ({ city, count: count as number }));

    // Usuarios que no participaron en ninguna votación
    const usersWithVotes = new Set(
      surveyResponses
        .map(r => r.userId)
        .filter(Boolean)
    );
    
    const usersWithoutVotes = users
      .filter(u => {
        const userId = u._id.toString();
        return !usersWithVotes.has(userId);
      })
      .map(u => ({
        userId: u._id.toString(),
        name: u.name,
        email: u.email,
        medicalId: u.medicalId,
        city: u.city || 'Sin ciudad',
        specialty: u.specialty || 'Sin especialidad',
        isAdmin: u.isAdmin || false,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
      }))
      .sort((a, b) => {
        // Ordenar por nombre
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      summary: {
        totalUsers,
        totalAdmins,
        totalRegularUsers,
        totalEvents,
        totalSpeakers: speakers.length,
        totalQuestions,
        totalSurveyResponses,
        uniqueSurveyUsers,
        averageRating: parseFloat(averageRating.toFixed(2)),
      },
      users: {
        total: totalUsers,
        admins: totalAdmins,
        regular: totalRegularUsers,
        withLastLogin: usersWithLastLogin,
        bySpecialty: usersBySpecialty,
        byCity: usersByCity,
        topSpecialties,
        topCities,
        byRegistrationDate: usersByRegistrationDate,
        withoutVotes: usersWithoutVotes,
        withoutVotesCount: usersWithoutVotes.length,
      },
      events: {
        total: totalEvents,
        byType: eventsByType,
        byDate: eventsByDate,
      },
      questions: {
        total: totalQuestions,
        approved: approvedQuestions,
        pending: pendingQuestions,
        answered: answeredQuestions,
        unanswered: unansweredQuestions,
      },
      surveys: {
        totalResponses: totalSurveyResponses,
        uniqueUsers: uniqueSurveyUsers,
        averageRating: parseFloat(averageRating.toFixed(2)),
        byDay: responsesByDay,
        byQuestionType: responsesByQuestionTypeWithAvg,
        bySpeaker: responsesBySpeakerWithAvg,
        ratingDistribution,
        byDate: responsesByDate,
        responsesWithText,
        responsesWithoutText,
        responsesWithTextDetail,
        topActiveUsers,
        dayStats: dayStatsWithAvg,
        minRating,
        maxRating,
        medianRating: parseFloat(medianRating.toFixed(2)),
        speakerVotesByDay: speakerVotesByDayArray,
        questionVotesByDay: questionVotesByDayArray,
      },
      speakers: {
        total: speakers.length,
      },
    });
  } catch (error: any) {
    console.error('Error en GET /api/reports/executive:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

