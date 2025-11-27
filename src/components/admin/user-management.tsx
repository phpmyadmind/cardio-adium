"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { UserProfile } from "@/services/auth.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema de validación para edición de usuario
const userEditSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  event_tracker: z.string().optional().or(z.literal("none")),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface EventTracker {
  id: string;
  name: string;
  isActive: boolean;
}

export function UserManagement() {
  const { data: users, isLoading: usersLoading, refetch } = useMongoCollection<UserProfile>('/api/users');
  const { data: eventTrackers, isLoading: eventTrackersLoading } = useMongoCollection<EventTracker>('/api/event-trackers');
  const { toast } = useToast();
  
  // Filtrar solo usuarios no admin
  const regularUsers = users.filter(user => !user.isAdmin);
  
  // Crear un mapa de event trackers por ID para búsqueda rápida
  const eventTrackerMap = useMemo(() => {
    const map = new Map<string, string>();
    eventTrackers.forEach(et => {
      map.set(et.id, et.name);
    });
    return map;
  }, [eventTrackers]);
  
  const isLoading = usersLoading || eventTrackersLoading;

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: "",
      event_tracker: "none",
    },
  });

  const handleOpenDialog = (user: UserProfile) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      event_tracker: (user.event_tracker || user.eventTracker) || "none", // Soporte para ambos nombres
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    form.reset();
  };

  const handleUpdate = async (data: UserEditFormValues) => {
    if (!editingUser) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingUser.id,
          name: data.name,
          event_tracker: data.event_tracker === "none" || !data.event_tracker ? undefined : data.event_tracker,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar el usuario');
      }

      toast({
        title: "Usuario actualizado",
        description: `El usuario "${data.name}" ha sido actualizado exitosamente.`,
      });

      refetch();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al actualizar el usuario.",
        variant: "destructive",
      });
    }
  };
  
  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar al usuario "${userName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el usuario');
      }

      toast({
        title: "Usuario eliminado",
        description: `El usuario "${userName}" ha sido eliminado exitosamente.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al eliminar el usuario.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registros de Usuarios</CardTitle>
          <CardDescription>Lista de todos los profesionales médicos registrados para el evento.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando usuarios...</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
        <CardHeader>
            <CardTitle>Registros de Usuarios</CardTitle>
            <CardDescription>Lista de todos los profesionales médicos registrados para el evento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>
                  Modifique el nombre y el evento tracker del usuario.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre completo" {...field} />
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
                      Actualizar Usuario
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>
                    <span className="sr-only">Acciones</span>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {regularUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  regularUsers.map((user) => (
                <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.specialty || '-'}</TableCell>
                    <TableCell>{user.city || '-'}</TableCell>
                    <TableCell>{(user.event_tracker || user.eventTracker) ? (eventTrackerMap.get(user.event_tracker || user.eventTracker || '') || (user.event_tracker || user.eventTracker)) : '-'}</TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menú</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Usuario
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(user.id, user.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar Usuario
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
