"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { Question } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/auth.context";

const qaSchema = z.object({
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQaTitle, setShowQaTitle] = useState(true);
  
  // Cargar configuración de visibilidad de la leyenda
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings?key=showQaTitle');
        if (response.ok) {
          const data = await response.json();
          setShowQaTitle(data.value !== false); // Por defecto true si no existe
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
        // En caso de error, mostrar por defecto
        setShowQaTitle(true);
      }
    };
    
    loadSettings();
  }, []);

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
        description: "Su pregunta ha sido enviada exitosamente.",
      });
      form.reset({ question: '' });
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

  if (questionsLoading) {
    return <div className="text-center py-8">Cargando preguntas...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Hacer una Pregunta</CardTitle>
            <CardDescription>¿Tiene una pregunta? Hágala aquí.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

      <div className="lg:col-span-2" hidden>
         {showQaTitle && (
           <>
             <h2 className="text-3xl font-bold font-headline text-primary mb-2">Preguntas y Respuestas</h2>
             <p className="text-muted-foreground mb-6">Consulta tus preguntas.</p>
           </>
         )}
        <div className="w-full space-y-4">
          {formattedQuestions.map((q) => (
            <div key={q.id} className="bg-card border-b-0 rounded-lg shadow-sm p-4">
              <div className="flex flex-col sm:flex-row justify-between w-full sm:items-center text-left gap-2">
                <p className="font-semibold">{q.question}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {q.isAnswered ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Respondida</Badge>
                  ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
