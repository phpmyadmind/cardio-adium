import { useMemo, useState } from 'react';
import { useApiCollection } from '../../hooks/useApiCollection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { Loader2, PlusCircle, Power, Edit, Trash2 } from 'lucide-react';
import { QRCodeViewer } from '../qr-code-viewer';
import { getApiUrl } from '../../lib/api';

const questionTypes = [
  { value: 'conference_rating', label: 'Calificación de conferencias' },
  { value: 'practical_spaces', label: 'Espacios prácticos' },
  { value: 'incremental_learning', label: 'Aprendizaje incremental' },
  { value: 'recommendation_likelihood', label: 'Probabilidad de recomendación' },
  { value: 'pre_event_info', label: 'Información previa al evento' },
  { value: 'logistics', label: 'Logística' },
  { value: 'agenda_compliance', label: 'Cumplimiento de agenda' },
  { value: 'campus_feedback', label: 'Feedback Campus' },
];

const SCALE_PRESETS = [
  { value: 'custom', label: 'Escala personalizada', scale_min: 1, scale_max: 10, scale_min_label: 'Mínimo', scale_max_label: 'Máximo' },
  { value: 'malo_excelente', label: 'Opciones de respuesta: Malo / Regular / Bueno / Excelente', scale_min: 1, scale_max: 4, scale_min_label: 'Malo|Regular|Bueno|Excelente', scale_max_label: 'Excelente' },
  { value: 'si_no', label: 'Opciones de respuesta: Si / No', scale_min: 1, scale_max: 2, scale_min_label: 'Si|No', scale_max_label: 'No' },
  { value: 'respuesta_abierta', label: 'Opciones de respuesta: Respuesta Abierta y agrega un campo de texto para responder', scale_min: 0, scale_max: 0, scale_min_label: 'RESPUESTA_ABIERTA', scale_max_label: '' },
];

const buildDefaultFormState = () => ({
  survey_id: 'cardio_event_2025',
  day: 1,
  date: new Date().toISOString().split('T')[0],
  question_number: 1,
  question_type: 'practical_spaces',
  question_text: '',
  scale_preset: 'malo_excelente',
  scale_min: 1,
  scale_max: 4,
  scale_min_label: 'Malo|Regular|Bueno|Excelente',
  scale_max_label: 'Excelente',
  speakers: [],
  isEnabled: true,
});

export function SurveyManagement() {
  const { data: questions = [], isLoading, refetch } = useApiCollection('/api/survey-questions');
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState(() => buildDefaultFormState());
  const [actionInProgress, setActionInProgress] = useState(null);
  const [speakerName, setSpeakerName] = useState('');
  const [speakerSpecialty, setSpeakerSpecialty] = useState('');

  const activeQuestionCount = useMemo(
    () => questions.filter((q) => q.isEnabled).length,
    [questions]
  );

  const questionsByDay = useMemo(() => {
    const grouped = {};
    questions.forEach((q) => {
      if (!grouped[q.day]) grouped[q.day] = [];
      grouped[q.day].push(q);
    });
    Object.keys(grouped).forEach((day) => {
      grouped[parseInt(day, 10)].sort((a, b) => a.question_number - b.question_number);
    });
    return grouped;
  }, [questions]);

  const handleOpenCreateDialog = () => {
    setIsEditing(false);
    setEditingQuestionId(null);
    setFormState(buildDefaultFormState());
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (question) => {
    setIsEditing(true);
    setEditingQuestionId(question.id);
    const scale = question.scale || {};
    const preset = SCALE_PRESETS.find((p) => p.scale_min_label === scale.min_label && p.scale_max === scale.max) || { value: 'custom' };
    setFormState({
      survey_id: question.survey_id || 'cardio_event_2025',
      day: question.day ?? 1,
      date: question.date || new Date().toISOString().split('T')[0],
      question_number: question.question_number ?? 1,
      question_type: question.question_type || 'practical_spaces',
      question_text: question.question_text || '',
      scale_preset: preset.value,
      scale_min: scale.min ?? 1,
      scale_max: scale.max ?? 10,
      scale_min_label: scale.min_label || '',
      scale_max_label: scale.max_label || '',
      speakers: question.speakers || [],
      isEnabled: question.isEnabled !== false,
    });
    setIsDialogOpen(true);
  };

  const handleAddSpeaker = () => {
    if (speakerName.trim() && speakerSpecialty.trim()) {
      setFormState((prev) => ({
        ...prev,
        speakers: [...prev.speakers, { name: speakerName.trim(), specialty: speakerSpecialty.trim() }],
      }));
      setSpeakerName('');
      setSpeakerSpecialty('');
    }
  };

  const handleRemoveSpeaker = (index) => {
    setFormState((prev) => ({
      ...prev,
      speakers: prev.speakers.filter((_, i) => i !== index),
    }));
  };

  const handleSaveQuestion = async () => {
    if (!formState.question_text.trim()) {
      toast({
        title: 'Error',
        description: 'El texto de la pregunta es requerido.',
        variant: 'destructive',
      });
      return;
    }
    if (formState.scale_preset !== 'respuesta_abierta' && formState.scale_min >= formState.scale_max) {
      toast({
        title: 'Error',
        description: 'El valor mínimo debe ser menor que el máximo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const questionData = {
        survey_id: formState.survey_id,
        day: formState.day,
        date: formState.date,
        question_number: formState.question_number,
        question_type: formState.question_type,
        question_text: formState.question_text,
        scale: {
          min: formState.scale_min,
          max: formState.scale_max,
          min_label: formState.scale_min_label,
          max_label: formState.scale_max_label,
        },
        speakers: formState.speakers.length > 0 ? formState.speakers : undefined,
        isEnabled: formState.isEnabled,
      };

      const url = isEditing && editingQuestionId
        ? getApiUrl(`/api/survey-questions/${editingQuestionId}`)
        : getApiUrl('/api/survey-questions');
      const method = isEditing && editingQuestionId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'No se pudo guardar la pregunta');
      }

      toast({
        title: isEditing ? 'Pregunta actualizada' : 'Pregunta creada',
        description: isEditing ? 'La pregunta se actualizó correctamente.' : 'La nueva pregunta se creó correctamente.',
      });
      setIsDialogOpen(false);
      setFormState(buildDefaultFormState());
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la pregunta.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleQuestion = async (questionId, isEnabled) => {
    try {
      setActionInProgress(questionId);
      const response = await fetch(getApiUrl(`/api/survey-questions/${questionId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'No se pudo actualizar la pregunta');
      }

      toast({
        title: isEnabled ? 'Pregunta habilitada' : 'Pregunta deshabilitada',
        description: isEnabled
          ? 'Los usuarios ahora pueden ver esta pregunta.'
          : 'La pregunta ya no es visible para los usuarios.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la pregunta.',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('¿Desea eliminar esta pregunta?')) return;

    try {
      setActionInProgress(questionId);
      const response = await fetch(getApiUrl(`/api/survey-questions/${questionId}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'No se pudo eliminar la pregunta');
      }

      toast({
        title: 'Pregunta eliminada',
        description: 'La pregunta se eliminó correctamente.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la pregunta.',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Power className="h-5 w-5 text-primary" />
              Gestión de Preguntas de Encuesta
            </CardTitle>
            <CardDescription>
              Administre las preguntas individuales de las encuestas del evento.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <p className="text-muted-foreground">Preguntas activas</p>
              <p className="text-2xl font-bold text-primary">{activeQuestionCount}</p>
            </div>
            <QRCodeViewer viewName="estadisticas" label="Estadísticas" />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar pregunta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Editar pregunta' : 'Nueva pregunta'}</DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? 'Modifique los datos de la pregunta.'
                      : 'Complete los datos para crear una nueva pregunta de encuesta.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="survey-id">ID de Encuesta</Label>
                      <Input
                        id="survey-id"
                        value={formState.survey_id}
                        onChange={(e) => setFormState((prev) => ({ ...prev, survey_id: e.target.value }))}
                        placeholder="cardio_event_2025"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="day">Día</Label>
                      <Select
                        value={formState.day.toString()}
                        onValueChange={(value) => setFormState((prev) => ({ ...prev, day: parseInt(value, 10) }))}
                      >
                        <SelectTrigger id="day">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Día 1</SelectItem>
                          <SelectItem value="2">Día 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formState.date}
                        onChange={(e) => setFormState((prev) => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="question-number">Número de pregunta</Label>
                      <Input
                        id="question-number"
                        type="number"
                        min="1"
                        value={formState.question_number}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, question_number: parseInt(e.target.value, 10) || 1 }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="question-type">Tipo de pregunta</Label>
                      <Select
                        value={formState.question_type}
                        onValueChange={(value) => setFormState((prev) => ({ ...prev, question_type: value }))}
                      >
                        <SelectTrigger id="question-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="question-text">Texto de la pregunta</Label>
                    <Textarea
                      id="question-text"
                      value={formState.question_text}
                      onChange={(e) => setFormState((prev) => ({ ...prev, question_text: e.target.value }))}
                      placeholder="Escriba el texto completo de la pregunta..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scale-preset">Escala de calificación</Label>
                    <Select
                      value={formState.scale_preset || 'custom'}
                      onValueChange={(value) => {
                        const preset = SCALE_PRESETS.find((p) => p.value === value);
                        if (preset) {
                          setFormState((prev) => ({
                            ...prev,
                            scale_preset: value,
                            scale_min: preset.scale_min,
                            scale_max: preset.scale_max,
                            scale_min_label: preset.scale_min_label,
                            scale_max_label: preset.scale_max_label,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger id="scale-preset">
                        <SelectValue placeholder="Seleccione opciones" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCALE_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formState.scale_preset !== 'respuesta_abierta' && (
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="scale-min">Escala Mín</Label>
                        <Input
                          id="scale-min"
                          type="number"
                          value={formState.scale_min}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, scale_min: parseInt(e.target.value, 10) || 1 }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scale-max">Escala Máx</Label>
                        <Input
                          id="scale-max"
                          type="number"
                          value={formState.scale_max}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, scale_max: parseInt(e.target.value, 10) || 10 }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scale-min-label">Etiqueta Mín</Label>
                        <Input
                          id="scale-min-label"
                          value={formState.scale_min_label}
                          onChange={(e) => setFormState((prev) => ({ ...prev, scale_min_label: e.target.value }))}
                          placeholder="Ej: Calidad baja"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scale-max-label">Etiqueta Máx</Label>
                        <Input
                          id="scale-max-label"
                          value={formState.scale_max_label}
                          onChange={(e) => setFormState((prev) => ({ ...prev, scale_max_label: e.target.value }))}
                          placeholder="Ej: Calidad alta"
                        />
                      </div>
                    </div>
                  )}
                  {formState.question_type === 'conference_rating' && (
                    <div className="space-y-2 border rounded-lg p-4">
                      <Label>Conferencistas</Label>
                      <div className="space-y-2">
                        {formState.speakers.map((speaker, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input value={speaker.name} disabled />
                              <Input value={speaker.specialty} disabled />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveSpeaker(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Nombre del conferencista"
                            value={speakerName}
                            onChange={(e) => setSpeakerName(e.target.value)}
                          />
                          <Input
                            placeholder="Especialidad"
                            value={speakerSpecialty}
                            onChange={(e) => setSpeakerSpecialty(e.target.value)}
                          />
                          <Button type="button" onClick={handleAddSpeaker}>
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-md border p-2">
                    <Switch
                      id="question-enabled"
                      checked={formState.isEnabled}
                      onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isEnabled: checked }))}
                    />
                    <Label htmlFor="question-enabled" className="cursor-pointer">
                      Pregunta habilitada (visible para usuarios)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} type="button">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveQuestion} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Actualizar' : 'Crear'} pregunta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {Object.keys(questionsByDay).length > 0 ? (
        Object.entries(questionsByDay)
          .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
          .map(([day, dayQuestions]) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle>
                  Día {day} - {dayQuestions[0]?.date || ''}
                </CardTitle>
                <CardDescription>{dayQuestions.length} pregunta(s) para este día</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell">Pregunta</TableHead>
                      <TableHead>Escala</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium">{question.question_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{question.question_type}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-md truncate">
                          {question.question_text}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(question.scale?.min ?? 0)} - {(question.scale?.max ?? 10)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={question.isEnabled ? 'default' : 'secondary'}>
                            {question.isEnabled ? 'Habilitada' : 'Oculta'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDialog(question)}
                              disabled={actionInProgress === question.id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={question.isEnabled ? 'secondary' : 'default'}
                              size="sm"
                              onClick={() => handleToggleQuestion(question.id, !question.isEnabled)}
                              disabled={actionInProgress === question.id}
                            >
                              {actionInProgress === question.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteQuestion(question.id)}
                              disabled={actionInProgress === question.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {isLoading ? 'Cargando preguntas...' : 'No hay preguntas registradas. Cree una nueva para comenzar.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
