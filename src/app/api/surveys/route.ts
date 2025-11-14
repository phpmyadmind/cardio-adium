import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/connect";
import { Survey } from "@/lib/mongodb/models/Survey";

const mapSurvey = (survey: any) => {
  const { _id, ...rest } = survey.toObject();
  return {
    id: survey._id.toString(),
    ...rest,
  };
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const surveyId = searchParams.get("surveyId") || searchParams.get("id");
    const activeOnly = searchParams.get("active");
    const isEnabledParam = searchParams.get("isEnabled");

    if (surveyId) {
      const survey = await Survey.findById(surveyId);
      if (!survey) {
        return NextResponse.json(
          { error: "Encuesta no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json(mapSurvey(survey));
    }

    const query: Record<string, any> = {};
    if (activeOnly === "true") {
      query.isEnabled = true;
    } else if (isEnabledParam) {
      query.isEnabled = isEnabledParam === "true";
    }

    const surveys = await Survey.find(query).sort({ updatedAt: -1 });
    return NextResponse.json(surveys.map(mapSurvey));
  } catch (error: any) {
    console.error("Error en GET /api/surveys:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { title, description, surveyData, isEnabled = false, createdBy } =
      body || {};

    if (!title || !surveyData) {
      return NextResponse.json(
        { error: "Título y datos de la encuesta son requeridos" },
        { status: 400 }
      );
    }

    const survey = new Survey({
      title,
      description,
      surveyData,
      isEnabled,
      createdBy,
      updatedBy: createdBy,
    });
    await survey.save();

    return NextResponse.json(mapSurvey(survey), { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/surveys:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, surveyId, ...updateData } = body || {};
    const targetId = id || surveyId;

    if (!targetId) {
      return NextResponse.json(
        { error: "ID de la encuesta requerido" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const survey = await Survey.findByIdAndUpdate(targetId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!survey) {
      return NextResponse.json(
        { error: "Encuesta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapSurvey(survey));
  } catch (error: any) {
    console.error("Error en PUT /api/surveys:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const surveyId = searchParams.get("surveyId") || searchParams.get("id");

    if (!surveyId) {
      return NextResponse.json(
        { error: "ID de la encuesta requerido" },
        { status: 400 }
      );
    }

    const survey = await Survey.findByIdAndDelete(surveyId);

    if (!survey) {
      return NextResponse.json(
        { error: "Encuesta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en DELETE /api/surveys:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

