"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import { QRCodeViewer } from "./qr-code-viewer";
import { useAuthContext } from "@/contexts/auth.context";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Send } from "lucide-react";

interface SurveyQuestion {
  id: string;
  survey_id: string;
  day: number;
  date: string;
  question_number: number;
  question_type: string;
  question_text: string;
  scale: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
  speakers?: Array<{
    name: string;
    specialty: string;
  }>;
  isEnabled: boolean;
}

interface QuestionResponse {
  questionId: string;
  speakerName?: string;
  rating: number | null;
  textResponse?: string;
  submitted: boolean;
}

export function SurveysVotingView() {
  const { data: questions, isLoading } = useMongoCollection<SurveyQuestion>(
    "/api/survey-questions?enabled=true"
  );
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingKeys, setSubmittingKeys] = useState<Set<string>>(new Set());

  const questionsByDay = useMemo(() => {
    const grouped: Record<number, SurveyQuestion[]> = {};
    questions.forEach((q) => {
      if (q.isEnabled) {
        if (!grouped[q.day]) grouped[q.day] = [];
        grouped[q.day].push(q);
      }
    });
    Object.keys(grouped).forEach((day) => {
      grouped[parseInt(day, 10)].sort((a, b) => a.question_number - b.question_number);
    });
    return grouped;
  }, [questions]);

  const availableDays = useMemo(() => {
    return Object.keys(questionsByDay)
      .map(Number)
      .sort((a, b) => a - b);
  }, [questionsByDay]);

  // Inicializar respuestas vacías para todas las preguntas
  useEffect(() => {
    const newResponses = new Map<string, QuestionResponse>();
    questions.forEach((q) => {
      if (q.isEnabled) {
        if (q.speakers && q.speakers.length > 0) {
          // Para preguntas con conferencistas, crear una respuesta por conferencista
          q.speakers.forEach((speaker) => {
            const key = `${q.id}-${speaker.name}`;
            if (!newResponses.has(key)) {
              newResponses.set(key, {
                questionId: q.id,
                speakerName: speaker.name,
                rating: null,
                textResponse: "",
                submitted: false,
              });
            }
          });
        } else {
          // Para preguntas sin conferencistas, una sola respuesta
          const key = `${q.id}-`;
          if (!newResponses.has(key)) {
            newResponses.set(key, {
              questionId: q.id,
              rating: null,
              textResponse: "",
              submitted: false,
            });
          }
        }
      }
    });
    setResponses(newResponses);
  }, [questions]);

  const handleRatingChange = (questionId: string, speakerName: string | undefined, rating: number) => {
    const key = `${questionId}-${speakerName || ""}`;
    const existing = responses.get(key);
    setResponses(
      new Map(responses.set(key, {
        ...(existing || {
          questionId,
          speakerName,
          rating: null,
          textResponse: "",
          submitted: false,
        }),
        rating,
      }))
    );
  };

  const handleTextResponseChange = (questionId: string, speakerName: string | undefined, text: string) => {
    const key = `${questionId}-${speakerName || ""}`;
    const existing = responses.get(key);
    setResponses(
      new Map(responses.set(key, {
        ...(existing || {
          questionId,
          speakerName,
          rating: null,
          textResponse: "",
          submitted: false,
        }),
        textResponse: text,
      }))
    );
  };

  const handleSubmitQuestion = async (question: SurveyQuestion, speakerName?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debe iniciar sesión para votar.",
        variant: "destructive",
      });
      return;
    }

    const key = `${question.id}-${speakerName || ""}`;
    const response = responses.get(key);

    if (!response || response.rating === null) {
      toast({
        title: "Error",
        description: "Por favor seleccione una calificación.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingKeys((prev) => new Set(prev).add(key));
    setIsSubmitting(true);

    try {
      const submitResponse = await fetch("/api/surveys/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surveyId: question.survey_id,
          questionId: question.id,
          userId: user.id,
          userName: user.name,
          day: question.day,
          dayDate: question.date,
          questionNumber: question.question_number,
          questionType: question.question_type,
          speakerName: speakerName || undefined,
          rating: response.rating,
          textResponse: response.textResponse?.trim() || undefined,
        }),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(error.error || "Error al enviar respuesta");
      }

      setResponses(
        new Map(responses.set(key, {
          ...response,
          submitted: true,
        }))
      );

      toast({
        title: "¡Respuesta enviada!",
        description: "Su voto ha sido registrado exitosamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al enviar la respuesta.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setSubmittingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const renderRatingOptions = (question: SurveyQuestion, speakerName?: string) => {
    const key = `${question.id}-${speakerName || ""}`;
    const response = responses.get(key);
    const currentRating = response?.rating?.toString() || "";

    const scaleRange = Array.from(
      { length: question.scale.max - question.scale.min + 1 },
      (_, i) => question.scale.min + i
    );

    return (
      <RadioGroup
        value={currentRating}
        onValueChange={(value) => handleRatingChange(question.id, speakerName, parseInt(value, 10))}
        className="flex flex-wrap gap-4 justify-center"
      >
        {scaleRange.map((value) => (
          <div key={value} className="flex flex-col items-center gap-2">
            <RadioGroupItem
              value={value.toString()}
              id={`${key}-${value}`}
              className="h-6 w-6"
            />
            <Label
              htmlFor={`${key}-${value}`}
              className="text-sm font-medium cursor-pointer text-center min-w-[2rem]"
            >
              {value}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-lg font-semibold">No hay preguntas disponibles en este momento.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          El administrador puede habilitar preguntas cuando estén listas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Encuesta del Evento</h2>
          <p className="text-muted-foreground">
            Apreciado Doctor, su opinión es muy valiosa para nosotros, le agradecemos contestar esta pequeña encuesta
            que le tomará menos de 3 minutos
          </p>
        </div>
        <QRCodeViewer viewName="encuestas" label="Encuestas" />
      </div>

      {availableDays.map((day) => {
        const dayQuestions = questionsByDay[day];
        const dayDate = dayQuestions[0]?.date || "";

        return (
          <Card key={day} className="space-y-6">
            <CardHeader>
              <CardTitle className="text-2xl">Día {day}</CardTitle>
              <CardDescription>{dayDate}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {dayQuestions.map((question) => {
                if (question.speakers && question.speakers.length > 0) {
                  // Pregunta con conferencistas
                  return (
                    <div key={question.id} className="space-y-6 border-b pb-6 last:border-b-0">
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">
                          {question.question_number}. {question.question_text}
                        </Label>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{question.scale.min_label}</span>
                          <span>{question.scale.max_label}</span>
                        </div>
                      </div>

                      {question.speakers.map((speaker) => {
                        const key = `${question.id}-${speaker.name}`;
                        const response = responses.get(key);
                        const isSubmitted = response?.submitted || false;
                        const isSubmittingThis = submittingKeys.has(key);

                        return (
                          <div key={speaker.name} className="space-y-4 pl-4 border-l-2 border-primary/20">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-medium">
                                {speaker.name} ({speaker.specialty})
                              </Label>
                              {isSubmitted && (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-xs">Enviado</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              {renderRatingOptions(question, speaker.name)}

                              {question.question_type === "campus_feedback" && (
                                <div className="space-y-2">
                                  <Label className="text-sm">Temas sugeridos (opcional)</Label>
                                  <Textarea
                                    value={response?.textResponse || ""}
                                    onChange={(e) =>
                                      handleTextResponseChange(question.id, speaker.name, e.target.value)
                                    }
                                    placeholder="¿Qué temas sobre enfermedad cardiometabólica le gustaría incluir en esos niveles?"
                                    rows={3}
                                    className="resize-none"
                                    disabled={isSubmitted}
                                  />
                                </div>
                              )}

                              <Button
                                onClick={() => handleSubmitQuestion(question, speaker.name)}
                                disabled={
                                  isSubmittingThis ||
                                  isSubmitted ||
                                  !response ||
                                  response.rating === null
                                }
                                className="w-full sm:w-auto"
                                size="sm"
                              >
                                {isSubmittingThis ? (
                                  "Enviando..."
                                ) : isSubmitted ? (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Enviado
                                  </>
                                ) : (
                                  <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Enviar Respuesta
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  // Pregunta sin conferencistas
                  const key = `${question.id}-`;
                  const response = responses.get(key);
                  const isSubmitted = response?.submitted || false;
                  const isSubmittingThis = submittingKeys.has(key);

                  return (
                    <div key={question.id} className="space-y-6 border-b pb-6 last:border-b-0">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold">
                            {question.question_number}. {question.question_text}
                          </Label>
                          {isSubmitted && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Enviado</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{question.scale.min_label}</span>
                          <span>{question.scale.max_label}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {renderRatingOptions(question)}

                        {question.question_type === "campus_feedback" && (
                          <div className="space-y-2">
                            <Label className="text-sm">Temas sugeridos (opcional)</Label>
                            <Textarea
                              value={response?.textResponse || ""}
                              onChange={(e) => handleTextResponseChange(question.id, undefined, e.target.value)}
                              placeholder="¿Qué temas sobre enfermedad cardiometabólica le gustaría incluir en esos niveles?"
                              rows={3}
                              className="resize-none"
                              disabled={isSubmitted}
                            />
                          </div>
                        )}

                        <Button
                          onClick={() => handleSubmitQuestion(question)}
                          disabled={isSubmittingThis || isSubmitted || !response || response.rating === null}
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          {isSubmittingThis ? (
                            "Enviando..."
                          ) : isSubmitted ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Enviado
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar Respuesta
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                }
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
