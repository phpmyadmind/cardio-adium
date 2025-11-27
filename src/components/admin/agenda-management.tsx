"use client";

import { useState, useMemo, useEffect } from "react";
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "@/hooks/use-toast";
import { findEventAgendaPDF } from "@/lib/event-resources";

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
  event_tracker: z.string().optional().or(z.literal("none")),
  specialty: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventTracker {
  id: string;
  name: string;
  isActive: boolean;
}

export function AgendaManagement() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaItem | null>(null);
  const { data: agendaItems, isLoading: agendaLoading, refetch } = useMongoCollection<AgendaItem>('/api/agenda');
  const { data: speakers, isLoading: speakersLoading } = useMongoCollection<Speaker>('/api/speakers');
  const { data: eventTrackers, isLoading: eventTrackersLoading } = useMongoCollection<EventTracker>('/api/event-trackers');
  const { toast } = useToast();

  // Obtener el evento activo por defecto
  const activeEventTracker = useMemo(() => {
    return eventTrackers.find(et => et.isActive);
  }, [eventTrackers]);

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
      event_tracker: activeEventTracker?.id || "none",
      specialty: "",
    },
  });

  // Actualizar el valor por defecto cuando cambie el evento activo
  useEffect(() => {
    if (activeEventTracker && !editingEvent && !isDialogOpen) {
      form.setValue('event_tracker', activeEventTracker.id);
    }
  }, [activeEventTracker, editingEvent, isDialogOpen, form]);

  const handleOpenDialog = (event?: AgendaItem) => {
    if (event) {
      setEditingEvent(event);
      form.reset({
        title: event.title || event.topic || "",
        description: event.description || "",
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        speakerIds: event.speakerIds || [],
        type: event.type || 'session',
        moderator: event.moderator || "",
        location: event.location || "",
        section: event.section || "",
        participants: event.participants || [],
        event_tracker: (event.event_tracker || event.eventTracker) || activeEventTracker?.id || "none",
        specialty: event.specialty || "",
      });
    } else {
      setEditingEvent(null);
      form.reset({
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
        event_tracker: activeEventTracker?.id || "none",
        specialty: "",
      });
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
      // Si no se especifica event_tracker, usar el activo por defecto
      const eventTrackerId = data.event_tracker === "none" || !data.event_tracker 
        ? activeEventTracker?.id 
        : data.event_tracker;

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
        event_tracker: eventTrackerId || undefined,
        specialty: data.specialty || undefined,
      };

      const url = '/api/agenda';
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

  const handleUploadPDF = async () => {
    const eventTrackerId = activeEventTracker?.id;

    if (!eventTrackerId) {
      toast({
        title: "Error",
        description: "No hay un evento activo. Active un evento antes de cargar la agenda.",
        variant: "destructive",
      });
      return;
    }

    // Buscar el PDF de agenda en la carpeta del evento
    const agendaPdfPath = await findEventAgendaPDF(eventTrackerId);
    
    if (!agendaPdfPath) {
      toast({
        title: "Error",
        description: `No se encontró un PDF de agenda en la carpeta del evento (public/${eventTrackerId}/). Asegúrese de que existe un archivo PDF de agenda.`,
        variant: "destructive",
      });
      return;
    }

    // Enviar la ruta relativa desde public/ (ej: "6928c443c96cf391f40ac142/Agenda.pdf")
    // El servidor la resolverá correctamente
    const relativePath = agendaPdfPath.startsWith('/') 
      ? agendaPdfPath.substring(1) // Remover el / inicial
      : agendaPdfPath;

    setIsUploading(true);
    try {
      const response = await fetch('/api/agenda/upload-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfPath: relativePath,
          event_tracker: eventTrackerId,
          replaceExisting: true, // Reemplazar la agenda existente
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar el PDF');
      }

      toast({
        title: "Agenda cargada exitosamente",
        description: `Se procesaron ${result.total} eventos. ${result.saved} guardados, ${result.deleted} eventos anteriores eliminados.`,
      });

      refetch();
      setIsUploadDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al cargar el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este evento?")) {
      return;
    }

    try {
      const response = await fetch(`/api/agenda?agendaId=${encodeURIComponent(id)}`, {
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

  if (agendaLoading || speakersLoading || eventTrackersLoading) {
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
    <>
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar Agenda desde PDF</DialogTitle>
            <DialogDescription>
              Se cargará automáticamente la agenda desde el archivo PDF ubicado en la carpeta del evento activo.
              <br />
              <strong>Nota:</strong> Esto reemplazará todos los eventos de agenda existentes del evento activo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Evento activo: <strong>{activeEventTracker?.name || 'Ninguno'}</strong>
            </p>
            <Button
              onClick={handleUploadPDF}
              disabled={isUploading || !activeEventTracker}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando PDF...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar y Reemplazar Agenda
                </>
              )}
            </Button>
            {!activeEventTracker && (
              <p className="text-sm text-destructive mt-2">
                No hay un evento activo. Active un evento antes de cargar la agenda.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestión de Agenda</CardTitle>
          <CardDescription>Ver, agregar o editar sesiones del evento.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsUploadDialogOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1 h-12 text-base font-bold rounded-xl px-4"
          >
            <Upload className="h-4 w-4" />
            Cargar PDF
          </Button>
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
                  name="event_tracker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evento Tracker</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                        value={field.value || "none"}
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
                              {et.name} {et.isActive && "(Activo)"}
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
        </div>
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
              <TableHead><span className="sr-only">Acciones</span></TableHead>
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
                const eventTrackerId = item.event_tracker || item.eventTracker;
                const eventTrackerName = eventTrackerId 
                  ? eventTrackers.find(et => et.id === eventTrackerId)?.name || '-'
                  : '-';
                return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title || item.topic}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.startTime} - {item.endTime}</TableCell>
                  <TableCell>
                    {item.speakerIds.map(id => speakers.find(s => s.id === id)?.name).filter(Boolean).join(', ') || '-'}
                  </TableCell>
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
    </>
  );
}
