"use client";

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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function UserManagement() {
  const { data: users, isLoading, refetch } = useMongoCollection<UserProfile>('/api/users');
  const { toast } = useToast();
  
  // Filtrar solo usuarios no admin
  const regularUsers = users.filter(user => !user.isAdmin);
  
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
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>
                    <span className="sr-only">Acciones</span>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {regularUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
