import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useApiCollection } from '../hooks/useApiCollection';
import { useToast } from '../hooks/use-toast';
import { useAuthContext } from '../contexts/auth.context';
import { QRCodeViewer } from './qr-code-viewer';
import { getApiUrl } from '../lib/api';

const qaSchema = z.object({
  question: z.string().min(10, {
    message: 'La pregunta debe tener al menos 10 caracteres.',
  }),
});

export function QaView() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const questionsEndpoint = useMemo(() => {
    return user ? `/api/questions?userId=${encodeURIComponent(user.id)}` : '/api/questions';
  }, [user]);

  const { refetch } = useApiCollection(questionsEndpoint);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQaTitle, setShowQaTitle] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(getApiUrl('/api/settings/showQaTitle'));
        if (response.ok) {
          const data = await response.json();
          setShowQaTitle(data.value !== false);
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
        setShowQaTitle(true);
      }
    };
    loadSettings();
  }, []);

  const form = useForm({
    resolver: zodResolver(qaSchema),
    defaultValues: { question: '' },
  });

  async function onSubmit(data) {
    setIsSubmitting(true);
    try {
      const response = await fetch(getApiUrl('/api/questions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          text: data.question,
          userName: user?.name || 'Invitado',
          isApproved: false,
          isAnswered: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar pregunta');
      }

      toast({
        title: '¡Pregunta Enviada!',
        description: 'Su pregunta ha sido enviada exitosamente.',
      });
      form.reset({ question: '' });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al enviar la pregunta.',
        variant: 'destructive',
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
                  {isSubmitting ? 'Enviando...' : 'Enviar Pregunta'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
