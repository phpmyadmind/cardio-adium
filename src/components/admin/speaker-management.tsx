"use client";

import { useState } from "react";
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
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useToast } from "@/hooks/use-toast";

// Schema de validación para speakers
const speakerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  specialty: z.string().min(1, "La especialidad es requerida"),
  bio: z.string().min(1, "La biografía es requerida"),
  imageUrl: z.string().url("URL de imagen inválida").optional().or(z.literal("")),
  imageHint: z.string().optional(),
  qualifications: z.array(z.string()).default([]),
  specialization: z.string().optional(),
});

type SpeakerFormValues = z.infer<typeof speakerSchema>;

export function SpeakerManagement() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const { data: speakers, isLoading, refetch } = useMongoCollection<Speaker>('/api/speakers');
  const { toast } = useToast();

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
      });
    } else {
      setEditingSpeaker(null);
      form.reset();
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
        ...(editingSpeaker && { id: editingSpeaker.id }),
        name: data.name,
        specialty: data.specialty,
        bio: data.bio,
        imageUrl: data.imageUrl || undefined,
        imageHint: data.imageHint || undefined,
        qualifications: data.qualifications || [],
        specialization: data.specialization || undefined,
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

  if (isLoading) {
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
                      <FormLabel>URL de Imagen</FormLabel>
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
              <TableHead><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speakers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No hay ponentes registrados.
                </TableCell>
              </TableRow>
            ) : (
              speakers.map((speaker) => (
                <TableRow key={speaker.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={speaker.imageUrl} alt={speaker.name} />
                        <AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {speaker.name}
                    </div>
                  </TableCell>
                  <TableCell>{speaker.specialty}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
