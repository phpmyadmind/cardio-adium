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
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { Question } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/auth.context";
import { QRCodeViewer } from "./qr-code-viewer";

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
  
  const { refetch } = useMongoCollection<Question>(questionsEndpoint);
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


  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          {showQaTitle && (
            <div>
              <h2 className="text-3xl font-bold font-headline text-primary mb-2">Hacer una Pregunta</h2>
              <p className="text-muted-foreground">¿Tiene una pregunta? Hágala aquí.</p>
            </div>
          )}
          <div className="flex-shrink-0 ml-auto">
            <QRCodeViewer viewName="preguntas" label="Preguntas" />
          </div>
        </div>
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
                          rows={8}
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
    </div>
  );
}
