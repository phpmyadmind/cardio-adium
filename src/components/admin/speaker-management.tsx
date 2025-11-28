"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { Speaker } from "@/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { normalizeImageUrl } from "@/lib/image-utils";

// Schema de validación para speakers
const speakerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  specialty: z.string().min(1, "La especialidad es requerida"),
  bio: z.string().min(1, "La biografía es requerida"),
  imageUrl: z.string().optional().or(z.literal("")),
  imageHint: z.string().optional(),
  qualifications: z.array(z.string()).default([]),
  specialization: z.string().optional(),
  event_tracker: z.string().optional().or(z.literal("none")),
});

interface EventTracker {
  id: string;
  name: string;
  isActive: boolean;
}

type SpeakerFormValues = z.infer<typeof speakerSchema>;

export function SpeakerManagement() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const { data: speakers, isLoading, refetch } = useMongoCollection<Speaker>('/api/speakers');
  const { data: eventTrackers, isLoading: eventTrackersLoading } = useMongoCollection<EventTracker>('/api/event-trackers');
  const { toast } = useToast();

  // Obtener el evento activo por defecto
  const activeEventTracker = useMemo(() => {
    return eventTrackers.find(et => et.isActive);
  }, [eventTrackers]);

  // Crear un mapa de event trackers por ID
  const eventTrackerMap = useMemo(() => {
    const map = new Map<string, string>();
    eventTrackers.forEach(et => {
      map.set(et.id, et.name);
    });
    return map;
  }, [eventTrackers]);

  const form = useForm<SpeakerFormValues>({
    resolver: zodResolver(speakerSchema),
    defaultValues: {
      name: "",
      specialty: "",
      bio: "",
      imageUrl: "",
      imageHint: "",
      qualifications: [],
      specialization: "",
      event_tracker: activeEventTracker?.id || "none",
    },
  });

  const handleOpenDialog = (speaker?: Speaker) => {
    if (speaker) {
      setEditingSpeaker(speaker);
      form.reset({
        name: speaker.name,
        specialty: speaker.specialty,
        bio: speaker.bio,
        imageUrl: speaker.imageUrl || "",
        imageHint: speaker.imageHint || "",
        qualifications: speaker.qualifications || [],
        specialization: speaker.specialization || "",
        event_tracker: speaker.event_tracker || activeEventTracker?.id || "none",
      });
    } else {
      setEditingSpeaker(null);
      form.reset({
        name: "",
        specialty: "",
        bio: "",
        imageUrl: "",
        imageHint: "",
        qualifications: [],
        specialization: "",
        event_tracker: activeEventTracker?.id || "none",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSpeaker(null);
    form.reset();
  };

  const onSubmit = async (data: SpeakerFormValues) => {
    try {
      const speakerData = {
        ...(editingSpeaker && { speakerId: editingSpeaker.speakerId }),
        name: data.name,
        specialty: data.specialty,
        bio: data.bio,
        imageUrl: data.imageUrl || undefined,
        imageHint: data.imageHint || undefined,
        qualifications: data.qualifications || [],
        specialization: data.specialization || undefined,
        event_tracker: data.event_tracker === "none" || !data.event_tracker ? undefined : data.event_tracker,
      };

      const url = '/api/speakers';
      const method = editingSpeaker ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(speakerData),
      });

      if (!response.ok) {
        const error = await response.json();
        // Si el error es sobre un ID inválido, sugerir recargar la página
        if (error.error && error.error.includes('ID de speaker inválido')) {
          throw new Error(`${error.error} Por favor, recargue la página para obtener los IDs actualizados.`);
        }
        throw new Error(error.error || 'Error al guardar el ponente');
      }

      toast({
        title: editingSpeaker ? "Ponente actualizado" : "Ponente creado",
        description: `El ponente "${data.name}" ha sido ${editingSpeaker ? 'actualizado' : 'creado'} exitosamente.`,
      });

      refetch();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar el ponente.",
        variant: "destructive",
      });
    }
  };

  const handleUploadPDF = async () => {
    const pdfPath = "C:\\Users\\Ing integraciones IA\\Documents\\cardio-adium-assets\\Doctores.pdf";
    const eventTrackerId = activeEventTracker?.id;

    setIsUploading(true);
    try {
      const response = await fetch('/api/speakers/upload-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfPath,
          event_tracker: eventTrackerId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar el PDF');
      }

      toast({
        title: "PDF cargado exitosamente",
        description: `Se procesaron ${result.total} doctores. ${result.created} creados, ${result.updated} actualizados.`,
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
    if (!confirm("¿Está seguro de que desea eliminar este ponente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/speakers?speakerId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el ponente');
      }

      toast({
        title: "Ponente eliminado",
        description: "El ponente ha sido eliminado exitosamente.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al eliminar el ponente.",
        variant: "destructive",
      });
    }
  };

  const isLoadingData = isLoading || eventTrackersLoading;

  if (isLoadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Ponentes</CardTitle>
          <CardDescription>Gestionar perfiles de ponentes para el evento.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando ponentes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar Doctores desde PDF</DialogTitle>
            <DialogDescription>
              Se cargarán automáticamente los doctores desde el archivo PDF ubicado en:
              <br />
              <code className="text-xs mt-2 block p-2 bg-muted rounded">
                C:\Users\Ing integraciones IA\Documents\cardio-adium-assets\Doctores.pdf
              </code>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Los doctores se asociarán al evento activo: <strong>{activeEventTracker?.name || 'Ninguno'}</strong>
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
                  Cargar Doctores
                </>
              )}
            </Button>
            {!activeEventTracker && (
              <p className="text-sm text-destructive mt-2">
                No hay un evento activo. Active un evento antes de cargar doctores.
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

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSpeaker ? 'Editar Ponente' : 'Agregar Nuevo Ponente'}</DialogTitle>
              <DialogDescription>
                {editingSpeaker ? 'Modifique los detalles del ponente.' : 'Ingrese los detalles del nuevo ponente.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Juan Pérez" {...field} />
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
                        <Input placeholder="ej. Cardiología" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biografía</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Biografía breve..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de Imagen (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialización</FormLabel>
                      <FormControl>
                        <Input placeholder="Especialización adicional" {...field} />
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
                    {editingSpeaker ? 'Actualizar' : 'Guardar'} Ponente
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestión de Ponentes</CardTitle>
          <CardDescription>Gestionar perfiles de ponentes para el evento.</CardDescription>
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
          <Button
            onClick={() => handleOpenDialog()}
            size="sm"
            className="gap-1 h-12 text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md px-4"
          >
            <PlusCircle className="h-4 w-4" />
            Agregar Ponente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speakers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No hay ponentes registrados.
                </TableCell>
              </TableRow>
            ) : (
              speakers.map((speaker) => {
                const eventTrackerName = (speaker.event_tracker || speaker.event_tracker)
                  ? (eventTrackerMap.get(speaker.event_tracker || speaker.event_tracker || '') || '-')
                  : '-';
                return (
                <TableRow key={speaker.speakerId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={normalizeImageUrl(speaker.imageUrl, speaker.name)} alt={speaker.name} />
                        <AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {speaker.name}
                    </div>
                  </TableCell>
                  <TableCell>{speaker.specialty}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenDialog(speaker)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(speaker.speakerId)}
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
