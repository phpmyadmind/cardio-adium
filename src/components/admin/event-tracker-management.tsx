"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "../ui/switch";

// Schema de validación para event trackers
const eventTrackerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
});

type EventTrackerFormValues = z.infer<typeof eventTrackerSchema>;

interface EventTracker {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function EventTrackerManagement() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingEventTracker, setEditingEventTracker] = useState<EventTracker | null>(null);
  const { data: eventTrackers, isLoading, refetch } = useMongoCollection<EventTracker>('/api/event-trackers');
  const { toast } = useToast();

  const form = useForm<EventTrackerFormValues>({
    resolver: zodResolver(eventTrackerSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: false,
    },
  });

  const handleOpenDialog = (eventTracker?: EventTracker) => {
    if (eventTracker) {
      setEditingEventTracker(eventTracker);
      form.reset({
        name: eventTracker.name,
        description: eventTracker.description || "",
        isActive: eventTracker.isActive,
      });
    } else {
      setEditingEventTracker(null);
      form.reset({
        name: "",
        description: "",
        isActive: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEventTracker(null);
    form.reset();
  };

  const onSubmit = async (data: EventTrackerFormValues) => {
    try {
      const eventTrackerData = {
        ...(editingEventTracker && { id: editingEventTracker.id }),
        name: data.name,
        description: data.description || undefined,
        isActive: data.isActive,
      };

      const url = '/api/event-trackers';
      const method = editingEventTracker ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventTrackerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el event tracker');
      }

      toast({
        title: editingEventTracker ? "Event tracker actualizado" : "Event tracker creado",
        description: `El event tracker "${data.name}" ha sido ${editingEventTracker ? 'actualizado' : 'creado'} exitosamente.`,
      });

      refetch();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar el event tracker.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar el event tracker "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/event-trackers?eventTrackerId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el event tracker');
      }

      toast({
        title: "Event tracker eliminado",
        description: "El event tracker ha sido eliminado exitosamente.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al eliminar el event tracker.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (eventTracker: EventTracker) => {
    try {
      const response = await fetch('/api/event-trackers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: eventTracker.id,
          isActive: !eventTracker.isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar el estado del event tracker');
      }

      toast({
        title: eventTracker.isActive ? "Event tracker desactivado" : "Event tracker activado",
        description: `El event tracker "${eventTracker.name}" ha sido ${eventTracker.isActive ? 'desactivado' : 'activado'}.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Event Trackers</CardTitle>
          <CardDescription>Administra los eventos principales del sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando event trackers...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestión de Event Trackers</CardTitle>
          <CardDescription>Administra los eventos principales del sistema. El evento activo será asignado por defecto a los nuevos usuarios.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              size="sm"
              className="gap-1 h-12 text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md px-4"
            >
              <PlusCircle className="h-4 w-4" />
              Agregar Event Tracker
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEventTracker ? 'Editar Event Tracker' : 'Agregar Nuevo Event Tracker'}</DialogTitle>
              <DialogDescription>
                {editingEventTracker ? 'Modifique los detalles del event tracker.' : 'Complete los detalles para el nuevo event tracker.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Evento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Evento Cardiometabólico 2025" {...field} />
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
                        <Textarea placeholder="Descripción del evento (opcional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Evento Activo</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Si está activo, será asignado por defecto a los nuevos usuarios. Solo puede haber un evento activo a la vez.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                    {editingEventTracker ? 'Actualizar' : 'Guardar'} Event Tracker
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
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventTrackers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No hay event trackers registrados.
                </TableCell>
              </TableRow>
            ) : (
              eventTrackers.map((eventTracker) => (
                <TableRow key={eventTracker.id}>
                  <TableCell className="font-medium">{eventTracker.name}</TableCell>
                  <TableCell>{eventTracker.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {eventTracker.isActive ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">Activo</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500">Inactivo</span>
                        </>
                      )}
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
                        <DropdownMenuItem onClick={() => handleToggleActive(eventTracker)}>
                          {eventTracker.isActive ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDialog(eventTracker)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(eventTracker.id, eventTracker.name)}
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

