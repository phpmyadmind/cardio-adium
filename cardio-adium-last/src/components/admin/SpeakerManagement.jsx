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
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '../../hooks/use-toast';
import { normalizeImageUrl } from '../../lib/image-utils';
import { getApiUrl } from '../../lib/api';

const speakerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  specialty: z.string().min(1, 'La especialidad es requerida'),
  bio: z.string().min(1, 'La biografía es requerida'),
  imageUrl: z.string().optional().or(z.literal('')),
  imageHint: z.string().optional(),
  qualifications: z.array(z.string()).default([]),
  specialization: z.string().optional(),
  event_tracker: z.string().optional().or(z.literal('none')),
});

export function SpeakerManagement() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const { data: speakers = [], isLoading, refetch } = useApiCollection('/api/speakers');
  const { data: eventTrackers = [], isLoading: eventTrackersLoading } = useApiCollection('/api/event-trackers');
  const { toast } = useToast();

  const activeEventTracker = useMemo(() => eventTrackers.find((et) => et.isActive), [eventTrackers]);

  const eventTrackerMap = useMemo(() => {
    const map = new Map();
    eventTrackers.forEach((et) => map.set(et.id, et.name));
    return map;
  }, [eventTrackers]);

  const form = useForm({
    resolver: zodResolver(speakerSchema),
    defaultValues: {
      name: '',
      specialty: '',
      bio: '',
      imageUrl: '',
      imageHint: '',
      qualifications: [],
      specialization: '',
      event_tracker: activeEventTracker?.id || 'none',
    },
  });

  const handleOpenDialog = (speaker) => {
    if (speaker) {
      setEditingSpeaker(speaker);
      form.reset({
        name: speaker.name,
        specialty: speaker.specialty || speaker.specialization || '',
        bio: speaker.bio || '',
        imageUrl: speaker.imageUrl || '',
        imageHint: speaker.imageHint || '',
        qualifications: speaker.qualifications || [],
        specialization: speaker.specialization || '',
        event_tracker: speaker.event_tracker || activeEventTracker?.id || 'none',
      });
    } else {
      setEditingSpeaker(null);
      form.reset({
        name: '',
        specialty: '',
        bio: '',
        imageUrl: '',
        imageHint: '',
        qualifications: [],
        specialization: '',
        event_tracker: activeEventTracker?.id || 'none',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSpeaker(null);
    form.reset();
  };

  const onSubmit = async (data) => {
    try {
      const speakerData = {
        name: data.name,
        specialty: data.specialty,
        bio: data.bio,
        imageUrl: data.imageUrl || undefined,
        imageHint: data.imageHint || undefined,
        qualifications: data.qualifications || [],
        specialization: data.specialization || undefined,
        event_tracker: data.event_tracker === 'none' || !data.event_tracker ? undefined : data.event_tracker,
      };

      const url = editingSpeaker
        ? getApiUrl(`/api/speakers/${editingSpeaker.id}`)
        : getApiUrl('/api/speakers');
      const method = editingSpeaker ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(speakerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el ponente');
      }

      toast({
        title: editingSpeaker ? 'Ponente actualizado' : 'Ponente creado',
        description: `El ponente "${data.name}" ha sido ${editingSpeaker ? 'actualizado' : 'creado'} exitosamente.`,
      });

      refetch();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al guardar el ponente.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('¿Está seguro de que desea eliminar este ponente?')) return;

    try {
      const response = await fetch(getApiUrl(`/api/speakers/${id}`), { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el ponente');
      }

      toast({
        title: 'Ponente eliminado',
        description: 'El ponente ha sido eliminado exitosamente.',
      });

      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al eliminar el ponente.',
        variant: 'destructive',
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestión de Ponentes</CardTitle>
          <CardDescription>Gestionar perfiles de ponentes para el evento.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              size="sm"
              className="gap-1 h-12 text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md px-4"
            >
              <PlusCircle className="h-4 w-4" />
              Agregar Ponente
            </Button>
          </DialogTrigger>
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
                    {editingSpeaker ? 'Actualizar' : 'Guardar'} Ponente
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
              <TableHead>Nombre</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
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
                const eventTrackerName = speaker.event_tracker
                  ? eventTrackerMap.get(speaker.event_tracker) || '-'
                  : '-';
                return (
                  <TableRow key={speaker.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={normalizeImageUrl(speaker.imageUrl, speaker.name)}
                            alt={speaker.name}
                          />
                          <AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {speaker.name}
                      </div>
                    </TableCell>
                    <TableCell>{speaker.specialty || speaker.specialization || '-'}</TableCell>
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
                            onClick={() => handleDelete(speaker.id)}
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
