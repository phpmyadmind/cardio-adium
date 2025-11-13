"use client";

import { useState, useMemo, useEffect } from "react";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { Question } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MoreHorizontal, Eye, EyeOff } from "lucide-react";
import { Badge } from "../ui/badge";
import { useAuthContext } from "@/contexts/auth.context";
import { useToast } from "@/hooks/use-toast";

export function QaManagement() {
  const { data: questionsData, isLoading, refetch } = useMongoCollection('/api/questions');
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [showQaTitle, setShowQaTitle] = useState(true);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);
  
  // Cargar configuración de visibilidad de la leyenda
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings?key=showQaTitle');
        if (response.ok) {
          const data = await response.json();
          setShowQaTitle(data.value !== false);
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Actualizar configuración de visibilidad
  const handleToggleQaTitle = async (checked: boolean) => {
    setIsUpdatingSetting(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'showQaTitle',
          value: checked,
          description: 'Controla la visibilidad de la leyenda "Preguntas y Respuestas"',
          updatedBy: user?.id,
        }),
      });
      
      if (response.ok) {
        setShowQaTitle(checked);
        toast({
          title: "Configuración actualizada",
          description: checked 
            ? "La leyenda 'Preguntas y Respuestas' ahora es visible" 
            : "La leyenda 'Preguntas y Respuestas' ahora está oculta",
        });
      } else {
        throw new Error('Error al actualizar configuración');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSetting(false);
    }
  };
  
  // Convertir preguntas de MongoDB a formato Question
  const questions = useMemo(() => {
    return questionsData.map((q: any) => ({
      id: q.id,
      userName: q.userName || 'Usuario',
      speakerName: q.speakerName || '',
      question: q.text,
      isAnswered: q.isAnswered || false,
      submittedAt: q.submittedAt ? new Date(q.submittedAt) : new Date(),
    } as Question));
  }, [questionsData]);

  const toggleAnswered = async (id: string) => {
    try {
      const question = questionsData.find((q: any) => q.id === id);
      if (!question) return;
      
      const response = await fetch('/api/questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          isAnswered: !question.isAnswered,
        }),
      });
      
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Error al actualizar pregunta:', error);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar esta pregunta?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/questions?questionId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Preguntas y Respuestas</CardTitle>
          <CardDescription>Moderar y gestionar preguntas de los asistentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando preguntas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuración de Visibilidad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Configuración de Visibilidad
          </CardTitle>
          <CardDescription>Controla qué elementos pueden ver los usuarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="show-qa-title" className="text-base">
                Mostrar leyenda "Preguntas y Respuestas"
              </Label>
              <p className="text-sm text-muted-foreground">
                Controla si los usuarios ven la leyenda "Preguntas y Respuestas" en la sección de preguntas
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showQaTitle ? (
                <Eye className="h-5 w-5 text-muted-foreground" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <Switch
                id="show-qa-title"
                checked={showQaTitle}
                onCheckedChange={handleToggleQaTitle}
                disabled={isUpdatingSetting}
                aria-label="Mostrar leyenda de preguntas y respuestas"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Preguntas */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Preguntas y Respuestas</CardTitle>
          <CardDescription>Moderar y gestionar preguntas de los asistentes.</CardDescription>
        </CardHeader>
        <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Pregunta</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Para Ponente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.question}</TableCell>
                <TableCell>{q.userName}</TableCell>
                <TableCell>{q.speakerName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={q.isAnswered}
                      onCheckedChange={() => toggleAnswered(q.id)}
                      aria-label="Alternar estado de respuesta"
                    />
                    <Badge variant={q.isAnswered ? "default" : "secondary"}>
                      {q.isAnswered ? "Respondida" : "Pendiente"}
                    </Badge>
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
                      <DropdownMenuItem>Proporcionar Respuesta</DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(q.id)}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  );
}
