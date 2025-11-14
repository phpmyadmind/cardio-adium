"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import { QRCodeViewer } from "./qr-code-viewer";
import { useAuthContext } from "@/contexts/auth.context";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

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

export function SurveysVotingView() {
  const { data: questions, isLoading, refetch: refetchQuestions } = useMongoCollection<SurveyQuestion>(
    "/api/survey-questions?enabled=true"
  );
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SurveyQuestion | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [textResponse, setTextResponse] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());

  const availableDays = useMemo(() => {
    const days = new Set<number>();
    questions.forEach((q) => {
      if (q.isEnabled) days.add(q.day);
    });
    return Array.from(days).sort();
  }, [questions]);

  const questionsByDay = useMemo(() => {
    const grouped: Record<number, SurveyQuestion[]> = {};
    questions.forEach((q) => {
      if (q.isEnabled && (!selectedDay || q.day === selectedDay)) {
        if (!grouped[q.day]) grouped[q.day] = [];
        grouped[q.day].push(q);
      }
    });
    Object.keys(grouped).forEach((day) => {
      grouped[parseInt(day, 10)].sort((a, b) => a.question_number - b.question_number);
    });
    return grouped;
  }, [questions, selectedDay]);

  useEffect(() => {
    if (availableDays.length && selectedDay === null) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  useEffect(() => {
    if (selectedDay && questionsByDay[selectedDay]?.length) {
      const firstQuestion = questionsByDay[selectedDay][0];
      setSelectedQuestion(firstQuestion);
      if (firstQuestion.speakers && firstQuestion.speakers.length > 0) {
        setSelectedSpeaker(firstQuestion.speakers[0].name);
      } else {
        setSelectedSpeaker(null);
      }
      const defaultValue = Math.min(
        firstQuestion.scale.max,
        Math.max(firstQuestion.scale.min, Math.round((firstQuestion.scale.min + firstQuestion.scale.max) / 2))
      );
      setRatingValue(defaultValue);
      setTextResponse("");
    }
  }, [selectedDay, questionsByDay]);

  useEffect(() => {
    if (selectedQuestion) {
      const defaultValue = Math.min(
        selectedQuestion.scale.max,
        Math.max(selectedQuestion.scale.min, Math.round((selectedQuestion.scale.min + selectedQuestion.scale.max) / 2))
      );
      setRatingValue(defaultValue);
      if (selectedQuestion.question_type !== "campus_feedback") {
        setTextResponse("");
      }
    }
  }, [selectedQuestion]);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debe iniciar sesión para votar.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedQuestion) {
      toast({
        title: "Error",
        description: "Por favor seleccione una pregunta.",
        variant: "destructive",
      });
      return;
    }

    if (selectedQuestion.question_type === "conference_rating" && !selectedSpeaker) {
      toast({
        title: "Error",
        description: "Por favor seleccione un conferencista.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/surveys/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surveyId: selectedQuestion.survey_id,
          questionId: selectedQuestion.id,
          userId: user.id,
          userName: user.name,
          day: selectedQuestion.day,
          dayDate: selectedQuestion.date,
          questionNumber: selectedQuestion.question_number,
          questionType: selectedQuestion.question_type,
          speakerName: selectedSpeaker || undefined,
          rating: ratingValue,
          textResponse: textResponse.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al enviar respuesta");
      }

      const responseKey = `${selectedQuestion.id}-${selectedSpeaker || ""}`;
      setSubmittedQuestions((prev) => new Set(prev).add(responseKey));

      toast({
        title: "¡Respuesta enviada!",
        description: "Su voto ha sido registrado exitosamente.",
      });

      // Resetear formulario
      setRatingValue(
        Math.min(
          selectedQuestion.scale.max,
          Math.max(selectedQuestion.scale.min, Math.round((selectedQuestion.scale.min + selectedQuestion.scale.max) / 2))
        )
      );
      setTextResponse("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al enviar la respuesta.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const currentDayQuestions = selectedDay ? questionsByDay[selectedDay] || [] : [];

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

      <Card>
        <CardHeader>
          <CardTitle>Seleccione el día</CardTitle>
          <CardDescription>Elija el día para el cual desea responder la encuesta</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedDay?.toString() || ""}
            onValueChange={(value) => setSelectedDay(parseInt(value, 10))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccione un día" />
            </SelectTrigger>
            <SelectContent>
              {availableDays.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Día {day} - {questionsByDay[day]?.[0]?.date || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDay && currentDayQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccione la pregunta</CardTitle>
            <CardDescription>Elija la pregunta que desea responder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              value={selectedQuestion?.id || ""}
              onValueChange={(value) => {
                const question = currentDayQuestions.find((q) => q.id === value);
                setSelectedQuestion(question || null);
                if (question?.speakers && question.speakers.length > 0) {
                  setSelectedSpeaker(question.speakers[0].name);
                } else {
                  setSelectedSpeaker(null);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione una pregunta" />
              </SelectTrigger>
              <SelectContent>
                {currentDayQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    Pregunta {q.question_number}: {q.question_text.substring(0, 60)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedQuestion && (
              <>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{selectedQuestion.question_text}</Label>
                  {selectedQuestion.speakers && selectedQuestion.speakers.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <Label className="text-sm">Seleccione el conferencista:</Label>
                      <Select value={selectedSpeaker || ""} onValueChange={setSelectedSpeaker}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccione un conferencista" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedQuestion.speakers.map((speaker) => (
                            <SelectItem key={speaker.name} value={speaker.name}>
                              {speaker.name} ({speaker.specialty})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{selectedQuestion.scale.min_label}</span>
                      <span>{selectedQuestion.scale.max_label}</span>
                    </div>
                    <Slider
                      value={[ratingValue]}
                      onValueChange={(value) => setRatingValue(value[0])}
                      min={selectedQuestion.scale.min}
                      max={selectedQuestion.scale.max}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-center">
                      <span className="text-2xl font-bold text-primary">{ratingValue}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        / {selectedQuestion.scale.max}
                      </span>
                    </div>
                  </div>

                  {selectedQuestion.question_type === "campus_feedback" && (
                    <div className="space-y-2">
                      <Label>Temas sugeridos (opcional)</Label>
                      <Textarea
                        value={textResponse}
                        onChange={(e) => setTextResponse(e.target.value)}
                        placeholder="¿Qué temas sobre enfermedad cardiometabólica le gustaría incluir en esos niveles?"
                        rows={4}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (selectedQuestion.question_type === "conference_rating" && !selectedSpeaker)}
                    className="w-full h-12 text-lg font-bold"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Respuesta"}
                  </Button>

                  {submittedQuestions.has(`${selectedQuestion.id}-${selectedSpeaker || ""}`) && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm">Respuesta enviada exitosamente</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

