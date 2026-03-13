import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useApiCollection } from '../hooks/useApiCollection';
import { QRCodeViewer } from './qr-code-viewer';
import { useAuthContext } from '../contexts/auth.context';
import { useToast } from '../hooks/use-toast';
import { CheckCircle2, Send } from 'lucide-react';
import { getApiUrl } from '../lib/api';

export function SurveysVotingView() {
  const { data: questions = [], isLoading } = useApiCollection('/api/survey-questions?enabled=true');
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [responses, setResponses] = useState(new Map());
  const [submittingKeys, setSubmittingKeys] = useState(new Set());

  const questionsByDay = useMemo(() => {
    const grouped = {};
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

  useEffect(() => {
    const newResponses = new Map();
    questions.forEach((q) => {
      if (q.isEnabled) {
        if (q.speakers && q.speakers.length > 0) {
          q.speakers.forEach((speaker) => {
            const key = `${q.id}-${speaker.name}`;
            if (!newResponses.has(key)) {
              newResponses.set(key, {
                questionId: q.id,
                speakerName: speaker.name,
                rating: null,
                textResponse: '',
                submitted: false,
              });
            }
          });
        } else {
          const key = `${q.id}-`;
          if (!newResponses.has(key)) {
            newResponses.set(key, {
              questionId: q.id,
              rating: null,
              textResponse: '',
              submitted: false,
            });
          }
        }
      }
    });
    setResponses(newResponses);
  }, [questions]);

  const handleRatingChange = (questionId, speakerName, rating) => {
    const key = `${questionId}-${speakerName || ''}`;
    const existing = responses.get(key);
    setResponses(
      new Map(
        responses.set(key, {
          ...(existing || {
            questionId,
            speakerName,
            rating: null,
            textResponse: '',
            submitted: false,
          }),
          rating,
        })
      )
    );
  };

  const handleTextResponseChange = (questionId, speakerName, text) => {
    const key = `${questionId}-${speakerName || ''}`;
    const existing = responses.get(key);
    setResponses(
      new Map(
        responses.set(key, {
          ...(existing || {
            questionId,
            speakerName,
            rating: null,
            textResponse: '',
            submitted: false,
          }),
          textResponse: text,
        })
      )
    );
  };

  const isRespuestaAbierta = (question) =>
    question?.scale?.min_label === 'RESPUESTA_ABIERTA' || (question?.scale?.min === 0 && question?.scale?.max === 0);

  const handleSubmitQuestion = async (question, speakerName) => {
    const key = `${question.id}-${speakerName || ''}`;
    const response = responses.get(key);
    const isOpenResponse = isRespuestaAbierta(question);

    if (!response) return;

    if (isOpenResponse) {
      if (!response.textResponse?.trim()) {
        toast({
          title: 'Error',
          description: 'Por favor escriba su respuesta en el campo de texto.',
          variant: 'destructive',
        });
        return;
      }
    } else if (response.rating === null) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione una calificación.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingKeys((prev) => new Set(prev).add(key));

    try {
      const submitResponse = await fetch(getApiUrl('/api/surveys/responses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: question.survey_id,
          questionId: question.id,
          userId: user?.id || null,
          userName: user?.name || 'Invitado',
          day: question.day,
          dayDate: question.date,
          questionNumber: question.question_number,
          questionType: question.question_type,
          questionText: question.question_text || undefined,
          speakerName: speakerName || undefined,
          rating: isRespuestaAbierta(question) ? null : response.rating,
          textResponse: response.textResponse?.trim() || undefined,
        }),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(error.error || 'Error al enviar respuesta');
      }

      setResponses(
        new Map(
          responses.set(key, {
            ...response,
            submitted: true,
          })
        )
      );

      toast({
        title: '¡Respuesta enviada!',
        description: 'Su voto ha sido registrado exitosamente.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al enviar la respuesta.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const renderRatingOptions = (question, speakerName) => {
    const key = `${question.id}-${speakerName || ''}`;
    const response = responses.get(key);
    const currentRating = response?.rating?.toString() || '';
    const isOpenResponse = isRespuestaAbierta(question);

    if (isOpenResponse) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Opciones de respuesta: Respuesta Abierta y agrega un campo de texto para responder</p>
          <Textarea
            value={response?.textResponse || ''}
            onChange={(e) => handleTextResponseChange(question.id, speakerName, e.target.value)}
            placeholder="Escriba su respuesta aquí..."
            rows={4}
            className="resize-none"
            disabled={response?.submitted}
          />
        </div>
      );
    }

    const scaleRange = Array.from(
      { length: question.scale.max - question.scale.min + 1 },
      (_, i) => question.scale.min + i
    );

    // Si scale.min_label contiene "|", son etiquetas personalizadas (ej: Malo|Regular|Bueno|Excelente, Si|No)
    const labels = question.scale.min_label?.includes('|')
      ? question.scale.min_label.split('|')
      : null;
    const isMaloExcelente = labels && labels.length === 4 && labels[0]?.trim() === 'Malo';
    const isSiNo = labels && labels.length === 2 && labels[0]?.trim() === 'Si' && labels[1]?.trim() === 'No';

    return (
      <div className="space-y-2">
        {isMaloExcelente && (
          <p className="text-sm text-muted-foreground">Opciones de respuesta: Malo / Regular / Bueno / Excelente</p>
        )}
        {isSiNo && (
          <p className="text-sm text-muted-foreground">Opciones de respuesta: Si / No</p>
        )}
        <RadioGroup
          value={currentRating}
          onValueChange={(value) => handleRatingChange(question.id, speakerName, parseInt(value, 10))}
          className="flex flex-wrap gap-6 justify-center"
        >
          {scaleRange.map((value, index) => {
            const label = labels && labels[index] ? labels[index].trim() : value;
            return (
              <div key={value} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={value.toString()} id={`${key}-${value}`} className="h-6 w-6 shrink-0" />
                  <Label htmlFor={`${key}-${value}`} className="text-sm font-medium cursor-pointer whitespace-nowrap min-w-[5rem]">
                    {label}
                  </Label>
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </div>
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
        const dayDate = dayQuestions[0]?.date || '';

        return (
          <Card key={day} className="space-y-6">
            <CardHeader>
              <CardTitle className="text-2xl">Día {day}</CardTitle>
              <CardDescription>{dayDate}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {dayQuestions.map((question) => {
                if (question.speakers && question.speakers.length > 0) {
                  return (
                    <div key={question.id} className="space-y-6 border-b pb-6 last:border-b-0">
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">
                          {question.question_number}. {question.question_text}
                        </Label>
                        {!isRespuestaAbierta(question) && !question.scale.min_label?.includes('|') && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{question.scale.min_label}</span>
                            <span>{question.scale.max_label}</span>
                          </div>
                        )}
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

                              {question.question_type === 'campus_feedback' && (
                                <div className="space-y-2">
                                  <Label className="text-sm">Temas sugeridos (opcional)</Label>
                                  <Textarea
                                    value={response?.textResponse || ''}
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
                                  (isRespuestaAbierta(question) ? !response.textResponse?.trim() : response.rating === null)
                                }
                                className="w-full sm:w-auto"
                                size="sm"
                              >
                                {isSubmittingThis ? (
                                  'Enviando...'
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
                        {!isRespuestaAbierta(question) && !question.scale.min_label?.includes('|') && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{question.scale.min_label}</span>
                            <span>{question.scale.max_label}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {renderRatingOptions(question)}

                        {question.question_type === 'campus_feedback' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Temas sugeridos (opcional)</Label>
                            <Textarea
                              value={response?.textResponse || ''}
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
                          disabled={
                            isSubmittingThis ||
                            isSubmitted ||
                            !response ||
                            (isRespuestaAbierta(question) ? !response.textResponse?.trim() : response.rating === null)
                          }
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          {isSubmittingThis ? (
                            'Enviando...'
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
