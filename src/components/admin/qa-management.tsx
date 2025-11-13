"use client";

import { useState, useMemo } from "react";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import type { Question } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "../ui/badge";

export function QaManagement() {
  const { data: questionsData, isLoading, refetch } = useMongoCollection('/api/questions');
  
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
  );
}
