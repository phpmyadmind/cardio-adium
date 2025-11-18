import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/connect";
import { SurveyResponse } from "@/lib/mongodb/models/SurveyResponse";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const surveyId = searchParams.get("surveyId");
    const day = searchParams.get("day");
    const questionId = searchParams.get("questionId");
    const userId = searchParams.get("userId");

    const query: Record<string, any> = {};
    if (surveyId) query.surveyId = surveyId;
    if (day) query.day = parseInt(day, 10);
    if (questionId) query.questionId = questionId;
    if (userId) query.userId = userId;

    const responses = await SurveyResponse.find(query).sort({ createdAt: -1 });
    return NextResponse.json(
      responses.map((response) => ({
        id: response._id.toString(),
        ...response.toObject(),
      }))
    );
  } catch (error: any) {
    console.error("Error en GET /api/surveys/responses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      surveyId,
      questionId,
      userId,
      userName,
      day,
      dayDate,
      questionNumber,
      questionType,
      speakerName,
      rating,
      textResponse,
    } = body || {};

    if (
      !surveyId ||
      !questionId ||
      !day ||
      !dayDate ||
      !questionNumber ||
      !questionType ||
      typeof rating !== "number"
    ) {
      return NextResponse.json({ error: "Datos incompletos para registrar voto" }, { status: 400 });
    }

    const responseDoc = await SurveyResponse.create({
      surveyId,
      questionId,
      userId,
      userName,
      day: parseInt(day, 10),
      dayDate,
      questionNumber: parseInt(questionNumber, 10),
      questionType,
      speakerName,
      rating,
      textResponse,
      submittedAt: new Date(),
    });

    return NextResponse.json(
      { id: responseDoc._id.toString(), ...responseDoc.toObject() },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/surveys/responses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

