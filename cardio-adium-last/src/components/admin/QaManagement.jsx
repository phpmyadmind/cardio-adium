import { useState, useMemo, useEffect } from 'react';
import { useApiCollection } from '../../hooks/useApiCollection';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { MoreHorizontal, Eye, EyeOff } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useAuthContext } from '../../contexts/auth.context';
import { useToast } from '../../hooks/use-toast';
import { getApiUrl } from '../../lib/api';

export function QaManagement() {
  const { data: questionsData = [], isLoading, refetch } = useApiCollection('/api/questions');
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [showQaTitle, setShowQaTitle] = useState(true);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);

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
      }
    };
    loadSettings();
  }, []);

  const handleToggleQaTitle = async (checked) => {
    setIsUpdatingSetting(true);
    try {
      const response = await fetch(getApiUrl('/api/settings/showQaTitle'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: checked,
          description: 'Controla la visibilidad de la leyenda "Preguntas y Respuestas"',
          updatedBy: user?.id,
        }),
      });

      if (response.ok) {
        setShowQaTitle(checked);
        toast({
          title: 'Configuración actualizada',
          description: checked
            ? "La leyenda 'Preguntas y Respuestas' ahora es visible"
            : "La leyenda 'Preguntas y Respuestas' ahora está oculta",
        });
      } else if (response.status === 404) {
        const createRes = await fetch(getApiUrl('/api/settings'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'showQaTitle',
            value: checked,
            description: 'Controla la visibilidad de la leyenda "Preguntas y Respuestas"',
            updatedBy: user?.id,
          }),
        });
        if (createRes.ok) {
          setShowQaTitle(checked);
          toast({ title: 'Configuración creada', description: 'La configuración se ha guardado.' });
        } else {
          throw new Error('Error al crear configuración');
        }
      } else {
        throw new Error('Error al actualizar configuración');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  const questions = useMemo(() => {
    return questionsData.map((q) => ({
      id: q.id,
      userName: q.userName || q.user_name || 'Usuario',
      speakerName: q.speakerName || q.speaker_name || '',
      question: q.text,
      isAnswered: q.isAnswered ?? q.is_answered ?? false,
      submittedAt: q.submittedAt || q.submitted_at ? new Date(q.submittedAt || q.submitted_at) : new Date(),
    }));
  }, [questionsData]);

  const toggleAnswered = async (id) => {
    try {
      const question = questionsData.find((q) => q.id === id);
      if (!question) return;

      const isAnswered = question.isAnswered ?? question.is_answered ?? false;

      const response = await fetch(getApiUrl(`/api/questions/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnswered: !isAnswered }),
      });

      if (response.ok) {
        refetch();
        toast({
          title: 'Estado actualizado',
          description: isAnswered ? 'Pregunta marcada como pendiente' : 'Pregunta marcada como respondida',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('¿Está seguro de que desea eliminar esta pregunta?')) return;

    try {
      const response = await fetch(getApiUrl(`/api/questions/${id}`), { method: 'DELETE' });

      if (response.ok) {
        refetch();
        toast({
          title: 'Pregunta eliminada',
          description: 'La pregunta ha sido eliminada exitosamente.',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la pregunta',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Preguntas y Respuestas</CardTitle>
          <CardDescription>Moderar y gestionar preguntas de los asistentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando preguntas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Configuración de Visibilidad
          </CardTitle>
          <CardDescription>Controla qué elementos pueden ver los usuarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="show-qa-title" className="text-base">
                Mostrar leyenda &quot;Preguntas y Respuestas&quot;
              </Label>
              <p className="text-sm text-muted-foreground">
                Controla si los usuarios ven la leyenda en la sección de preguntas
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showQaTitle ? (
                <Eye className="h-5 w-5 text-muted-foreground" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <Switch
                id="show-qa-title"
                checked={showQaTitle}
                onCheckedChange={handleToggleQaTitle}
                disabled={isUpdatingSetting}
                aria-label="Mostrar leyenda de preguntas y respuestas"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Preguntas y Respuestas</CardTitle>
          <CardDescription>Moderar y gestionar preguntas de los asistentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Pregunta</TableHead>
                <TableHead>De</TableHead>
                <TableHead>Para Ponente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay preguntas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.question}</TableCell>
                    <TableCell>{q.userName}</TableCell>
                    <TableCell>{q.speakerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={q.isAnswered}
                          onCheckedChange={() => toggleAnswered(q.id)}
                          aria-label="Alternar estado de respuesta"
                        />
                        <Badge variant={q.isAnswered ? 'default' : 'secondary'}>
                          {q.isAnswered ? 'Respondida' : 'Pendiente'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(q.id)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
