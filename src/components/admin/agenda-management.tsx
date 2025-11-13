"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { AgendaItem, Speaker } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "@/hooks/use-toast";

// Schema de validación para eventos
const eventSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (yyyy-mm-dd)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (hh:mm)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (hh:mm)"),
  speakerIds: z.array(z.string()).default([]),
  type: z.enum(['session', 'break', 'meal', 'welcome', 'closing', 'workshop', 'qna']).optional(),
  moderator: z.string().optional(),
  location: z.string().optional(),
  section: z.string().optional(),
  participants: z.array(z.string()).default([]),
});

type EventFormValues = z.infer<typeof eventSchema>;

export function AgendaManagement() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaItem | null>(null);
  const { data: events, isLoading: eventsLoading, refetch } = useMongoCollection('/api/events');
  const { data: speakers, isLoading: speakersLoading } = useMongoCollection<Speaker>('/api/speakers');
  const { toast } = useToast();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      speakerIds: [],
      type: 'session',
      moderator: "",
      location: "",
      section: "",
      participants: [],
    },
  });

  // Convertir eventos a formato AgendaItem (todo como strings)
  const agendaItems = useMemo(() => {
    return events.map((event: any) => ({
      id: event.id,
      date: event.date || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      topic: event.title || '',
      speakerIds: event.speakerIds || [],
      type: event.type,
      moderator: event.moderator || '',
      location: event.location || '',
      section: event.section || '',
      participants: event.participants || [],
    } as AgendaItem));
  }, [events]);

  const handleOpenDialog = (event?: AgendaItem) => {
    if (event) {
      setEditingEvent(event);
      form.reset({
        title: event.topic,
        description: "",
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        speakerIds: event.speakerIds || [],
        type: event.type || 'session',
        moderator: event.moderator || "",
        location: event.location || "",
        section: event.section || "",
        participants: event.participants || [],
      });
    } else {
      setEditingEvent(null);
      form.reset();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    form.reset();
  };

  const onSubmit = async (data: EventFormValues) => {
    try {
      // Guardar todo como strings (fecha y hora como texto)
      const eventData = {
        ...(editingEvent && { id: editingEvent.id }),
        title: data.title,
        description: data.description,
        startTime: data.startTime, // Formato: "HH:mm"
        endTime: data.endTime, // Formato: "HH:mm"
        date: data.date, // Formato: "yyyy-mm-dd"
        speakerIds: data.speakerIds || [],
        type: data.type,
        moderator: data.moderator || undefined,
        location: data.location || undefined,
        section: data.section || undefined,
        participants: data.participants || [],
      };

      const url = '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el evento');
      }

      toast({
        title: editingEvent ? "Evento actualizado" : "Evento creado",
        description: `El evento "${data.title}" ha sido ${editingEvent ? 'actualizado' : 'creado'} exitosamente.`,
      });

      refetch();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar el evento.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este evento?")) {
      return;
    }

    try {
      const response = await fetch(`/api/events?eventId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el evento');
      }

      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado exitosamente.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al eliminar el evento.",
        variant: "destructive",
      });
    }
  };

  if (eventsLoading || speakersLoading) {
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <TableHead><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agendaItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay eventos registrados.
                </TableCell>
              </TableRow>
            ) : (
              agendaItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.topic}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.startTime} - {item.endTime}</TableCell>
                  <TableCell>
                    {item.speakerIds.map(id => speakers.find(s => s.id === id)?.name).filter(Boolean).join(', ') || '-'}
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
