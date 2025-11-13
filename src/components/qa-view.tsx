"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { Question, Speaker } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/auth.context";
import { formatDistanceToNow } from "date-fns";

const qaSchema = z.object({
  speakerId: z.string({ required_error: "Por favor seleccione un ponente." }),
  question: z.string().min(10, {
    message: "La pregunta debe tener al menos 10 caracteres.",
  }),
});

export function QaView() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  
  // Construir endpoint con filtro de userId si el usuario está autenticado
  const questionsEndpoint = useMemo(() => {
    return user 
      ? `/api/questions?userId=${encodeURIComponent(user.id)}`
      : '/api/questions';
  }, [user?.id]);
  
  const { data: questions, isLoading: questionsLoading, refetch } = useMongoCollection<Question>(questionsEndpoint);
  const { data: speakers, isLoading: speakersLoading } = useMongoCollection<Speaker>('/api/speakers');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof qaSchema>>({
    resolver: zodResolver(qaSchema),
  });

  async function onSubmit(data: z.infer<typeof qaSchema>) {
    if (!user) {
      toast({
        title: "Error",
        description: "Debe iniciar sesión para enviar preguntas.",
        variant: "destructive",
      });
      return;
    }

    const speaker = speakers.find(s => s.id === data.speakerId);
    if (!speaker) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          text: data.question,
          userName: user.name,
          speakerName: speaker.name,
          isApproved: false,
          isAnswered: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar pregunta');
      }

      toast({
        title: "¡Pregunta Enviada!",
        description: "Su pregunta ha sido enviada al ponente.",
      });
      form.reset({ question: '', speakerId: '' });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al enviar la pregunta.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Convertir preguntas de MongoDB a formato Question
  const formattedQuestions: Question[] = questions.map(q => ({
    id: q.id,
    userName: q.userName || 'Usuario',
    speakerName: q.speakerName || '',
    question: q.text,
    isAnswered: q.isAnswered || false,
    submittedAt: q.submittedAt ? new Date(q.submittedAt) : new Date(),
  }));

  if (questionsLoading || speakersLoading) {
    return <div className="text-center py-8">Cargando preguntas...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Hacer una Pregunta</CardTitle>
            <CardDescription>¿Tiene una pregunta para uno de nuestros ponentes? Hágala aquí.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="speakerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ponente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un ponente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {speakers.map(speaker => (
                            <SelectItem key={speaker.id} value={speaker.id}>{speaker.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Su Pregunta</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escriba su pregunta..."
                          className="resize-none"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
                >
                  {isSubmitting ? "Enviando..." : "Enviar Pregunta"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
         <h2 className="text-3xl font-bold font-headline text-primary mb-2">Preguntas y Respuestas</h2>
         <p className="text-muted-foreground mb-6">Consulta tus preguntas.</p>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {formattedQuestions.map((q) => (
            <AccordionItem key={q.id} value={q.id} className="bg-card border-b-0 rounded-lg shadow-sm">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex flex-col sm:flex-row justify-between w-full sm:items-center text-left gap-2 pr-4">
                  <p className="font-semibold">{q.question}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {q.isAnswered ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Respondida</Badge>
                    ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <div className="text-muted-foreground">
                    <p><strong>Para:</strong> {q.speakerName}</p>
                    <p><strong>De:</strong> {q.userName}</p>
                    <p className="text-xs mt-2">{formatDistanceToNow(q.submittedAt, { addSuffix: true })}</p>
                    {q.isAnswered && (
                        <p className="mt-4 p-4 bg-muted/50 rounded-md">
                            <strong>Respuesta:</strong> Estamos preparando una respuesta detallada a esta excelente pregunta. Por favor, vuelva más tarde.
                        </p>
                    )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
