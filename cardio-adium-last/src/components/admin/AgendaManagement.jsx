import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiCollection } from '../../hooks/useApiCollection';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useToast } from '../../hooks/use-toast';
import { getApiUrl, parseJsonResponse } from '../../lib/api';

const eventSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (yyyy-mm-dd)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (hh:mm)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (hh:mm)'),
  speakerIds: z.array(z.string()).default([]),
  type: z.enum(['session', 'break', 'meal', 'welcome', 'closing', 'workshop', 'qna']).optional(),
  moderator: z.string().optional(),
  location: z.string().optional(),
  section: z.string().optional(),
  participants: z.array(z.string()).default([]),
  event_tracker: z.string().optional().or(z.literal('none')),
  specialty: z.string().optional(),
  pdfUrl: z.string().optional(),
});

export function AgendaManagement() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const { data: agendaItems = [], isLoading: agendaLoading, refetch } = useApiCollection('/api/agenda');
  const { data: speakers = [], isLoading: speakersLoading } = useApiCollection('/api/speakers');
  const { data: eventTrackers = [], isLoading: eventTrackersLoading } = useApiCollection('/api/event-trackers');
  const { toast } = useToast();

  const activeEventTracker = useMemo(() => eventTrackers.find((et) => et.isActive), [eventTrackers]);

  const eventTrackerMap = useMemo(() => {
    const map = new Map();
    eventTrackers.forEach((et) => map.set(et.id, et.name));
    return map;
  }, [eventTrackers]);

  const speakerMap = useMemo(() => {
    const map = new Map();
    speakers.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [speakers]);

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      speakerIds: [],
      type: 'session',
      moderator: '',
      location: '',
      section: '',
      participants: [],
      event_tracker: activeEventTracker?.id || 'none',
      specialty: '',
      pdfUrl: '',
    },
  });

  const handleOpenDialog = (event) => {
    if (event) {
      setEditingEvent(event);
      form.reset({
        title: event.title || event.topic || '',
        description: event.description || '',
        date: event.date || '',
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        speakerIds: event.speakerIds || [],
        type: event.type || 'session',
        moderator: event.moderator || '',
        location: event.location || '',
        section: event.section || '',
        participants: event.participants || [],
        event_tracker: event.event_tracker || activeEventTracker?.id || 'none',
        specialty: event.specialty || '',
        pdfUrl: event.pdfUrl || '',
      });
    } else {
      setEditingEvent(null);
      form.reset({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        speakerIds: [],
        type: 'session',
        moderator: '',
        location: '',
        section: '',
        participants: [],
        event_tracker: activeEventTracker?.id || 'none',
        specialty: '',
        pdfUrl: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    form.reset();
  };

  const onSubmit = async (data) => {
    try {
      const eventTrackerId =
        data.event_tracker === 'none' || !data.event_tracker ? activeEventTracker?.id : data.event_tracker;

      const eventData = {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        date: data.date,
        speakerIds: data.speakerIds || [],
        type: data.type,
        moderator: data.moderator || undefined,
        location: data.location || undefined,
        section: data.section || undefined,
        participants: data.participants || [],
        event_tracker: eventTrackerId || undefined,
        specialty: data.specialty || undefined,
        pdfUrl: data.pdfUrl || undefined,
      };

      const url = editingEvent
        ? getApiUrl(`/api/agenda/${editingEvent.id}`)
        : getApiUrl('/api/agenda');
      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const error = await parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Error al guardar el evento');
      }

      toast({
        title: editingEvent ? 'Evento actualizado' : 'Evento creado',
        description: `El evento "${data.title}" ha sido ${editingEvent ? 'actualizado' : 'creado'} exitosamente.`,
      });

      refetch();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al guardar el evento.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('¿Está seguro de que desea eliminar este evento?')) return;

    try {
      const response = await fetch(getApiUrl(`/api/agenda/${id}`), { method: 'DELETE' });

      if (!response.ok) {
        const error = await parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Error al eliminar el evento');
      }

      toast({
        title: 'Evento eliminado',
        description: 'El evento ha sido eliminado exitosamente.',
      });

      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al eliminar el evento.',
        variant: 'destructive',
      });
    }
  };

  const isLoadingData = agendaLoading || speakersLoading || eventTrackersLoading;

  if (isLoadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Agenda</CardTitle>
          <CardDescription>Ver, agregar o editar sesiones del evento.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando agenda...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestión de Agenda</CardTitle>
          <CardDescription>Ver, agregar o editar sesiones del evento.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              size="sm"
              className="gap-1 h-12 text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md px-4"
            >
              <PlusCircle className="h-4 w-4" />
              Agregar Sesión
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Editar Sesión' : 'Agregar Nueva Sesión'}</DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Modifique los detalles del evento.' : 'Complete los detalles para el nuevo elemento de agenda.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título de la sesión" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción de la sesión" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Fin</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="session">Sesión</SelectItem>
                          <SelectItem value="break">Break</SelectItem>
                          <SelectItem value="meal">Comida</SelectItem>
                          <SelectItem value="welcome">Bienvenida</SelectItem>
                          <SelectItem value="closing">Cierre</SelectItem>
                          <SelectItem value="workshop">Taller</SelectItem>
                          <SelectItem value="qna">Q&A</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sección Temática</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Riesgo CV, Dislipidemia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="moderator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moderador</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del moderador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input placeholder="Ubicación del evento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Cardiología, Medicina Interna" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="speakerIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ponentes</FormLabel>
                      <div className="rounded-md border p-3 max-h-40 overflow-y-auto space-y-2">
                        {speakers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No hay ponentes registrados.</p>
                        ) : (
                          speakers.map((speaker) => (
                            <div key={speaker.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`speaker-${speaker.id}`}
                                checked={field.value?.includes(speaker.id) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, speaker.id]);
                                  } else {
                                    field.onChange(current.filter((id) => id !== speaker.id));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`speaker-${speaker.id}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {speaker.name}
                                {speaker.specialty && (
                                  <span className="text-muted-foreground font-normal"> ({speaker.specialty})</span>
                                )}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="event_tracker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evento Tracker</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un evento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin evento</SelectItem>
                          {eventTrackers.map((et) => (
                            <SelectItem key={et.id} value={et.id}>
                              {et.name} {et.isActive && '(Activo)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="h-12 text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
                  >
                    {editingEvent ? 'Actualizar' : 'Guardar'} Sesión
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tema</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Ponentes</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agendaItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay eventos registrados.
                </TableCell>
              </TableRow>
            ) : (
              agendaItems.map((item) => {
                const eventTrackerName = item.event_tracker
                  ? eventTrackerMap.get(item.event_tracker) || '-'
                  : '-';
                const speakerNames = (item.speakerIds || [])
                  .map((id) => speakerMap.get(id))
                  .filter(Boolean)
                  .join(', ') || '-';
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title || item.topic}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>
                      {item.startTime} - {item.endTime}
                    </TableCell>
                    <TableCell>{speakerNames}</TableCell>
                    <TableCell>{item.specialty || '-'}</TableCell>
                    <TableCell>{eventTrackerName}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
