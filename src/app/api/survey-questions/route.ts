import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/connect";
import { SurveyQuestion } from "@/lib/mongodb/models/SurveyQuestion";

const mapQuestion = (question: any) => {
  const { _id, ...rest } = question.toObject();
  return {
    id: question._id.toString(),
    ...rest,
  };
};

// GET /api/survey-questions - Obtener preguntas
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get("questionId") || searchParams.get("id");
    const surveyId = searchParams.get("surveyId");
    const day = searchParams.get("day");
    const questionType = searchParams.get("questionType");
    const enabledOnly = searchParams.get("enabled") === "true";

    if (questionId) {
      const question = await SurveyQuestion.findById(questionId);
      if (!question) {
        return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
      }
      return NextResponse.json(mapQuestion(question));
    }

    // Construir query
    const query: Record<string, any> = {};
    if (surveyId) query.survey_id = surveyId;
    if (day) query.day = parseInt(day, 10);
    if (questionType) query.question_type = questionType;
    if (enabledOnly) query.isEnabled = true;

    const questions = await SurveyQuestion.find(query).sort({ day: 1, question_number: 1 });
    return NextResponse.json(questions.map(mapQuestion));
  } catch (error: any) {
    console.error("Error en GET /api/survey-questions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/survey-questions - Crear pregunta
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const question = new SurveyQuestion(body);
    await question.save();

    return NextResponse.json(mapQuestion(question), { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/survey-questions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/survey-questions - Actualizar pregunta
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, questionId, ...updateData } = body;
    const targetId = id || questionId;

    if (!targetId) {
      return NextResponse.json({ error: "ID de pregunta requerido" }, { status: 400 });
    }

    const question = await SurveyQuestion.findByIdAndUpdate(targetId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!question) {
      return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(mapQuestion(question));
  } catch (error: any) {
    console.error("Error en PUT /api/survey-questions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/survey-questions - Eliminar pregunta
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get("questionId") || searchParams.get("id");

    if (!questionId) {
      return NextResponse.json({ error: "ID de pregunta requerido" }, { status: 400 });
    }

    const question = await SurveyQuestion.findByIdAndDelete(questionId);

    if (!question) {
      return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en DELETE /api/survey-questions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

