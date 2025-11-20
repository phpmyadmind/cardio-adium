"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeViewer } from "@/components/qr-code-viewer";
import { DownloadCloud, FileText, Users, Calendar, MessageSquare, TrendingUp, BarChart3, MapPin, Briefcase, CheckCircle2, Clock, XCircle, Filter, X, Mic } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface ExecutiveReportData {
  summary: {
    totalUsers: number;
    totalAdmins: number;
    totalRegularUsers: number;
    totalEvents: number;
    totalSpeakers: number;
    totalQuestions: number;
    totalSurveyResponses: number;
    uniqueSurveyUsers: number;
    averageRating: number;
  };
  users: {
    total: number;
    admins: number;
    regular: number;
    withLastLogin: number;
    bySpecialty: Record<string, number>;
    byCity: Record<string, number>;
    topSpecialties: Array<{ specialty: string; count: number }>;
    topCities: Array<{ city: string; count: number }>;
    byRegistrationDate: Record<string, number>;
    withoutVotes: Array<{
      userId: string;
      name: string;
      email: string;
      medicalId: string;
      city: string;
      specialty: string;
      isAdmin: boolean;
      createdAt?: Date | string;
      lastLogin?: Date | string;
    }>;
    withoutVotesCount: number;
  };
  events: {
    total: number;
    byType: Record<string, number>;
    byDate: Record<string, number>;
  };
  questions: {
    total: number;
    approved: number;
    pending: number;
    answered: number;
    unanswered: number;
  };
  surveys: {
    totalResponses: number;
    uniqueUsers: number;
    averageRating: number;
    byDay: Record<number, number>;
    byQuestionType: Array<{ 
      type: string; 
      count: number; 
      averageRating: number;
      questionNumber?: number;
      dayDate?: string;
      day?: number;
    }>;
    bySpeaker: Array<{ speaker: string; count: number; averageRating: number }>;
    ratingDistribution: Record<number, number>;
    byDate: Record<string, number>;
    responsesWithText: number;
    responsesWithoutText: number;
    responsesWithTextDetail: Array<{
      userId: string;
      userName: string;
      day: number;
      dayDate: string;
      questionNumber: number;
      questionType: string;
      speakerName: string | null;
      rating: number;
      textResponse: string;
      submittedAt: Date | string;
    }>;
    topActiveUsers: Array<{ userId: string; userName: string; count: number }>;
    dayStats: Array<{ day: number; dayDate: string; count: number; averageRating: number }>;
    minRating: number;
    maxRating: number;
    medianRating: number;
    speakerVotesByDay: Array<{
      day: number;
      dayDate: string;
      speakers: Array<{
        speaker: string;
        day: number;
        dayDate: string;
        votes: Array<{
          userId: string;
          userName: string;
          rating: number;
          questionType: string;
          questionNumber: number;
          textResponse?: string;
          submittedAt: Date | string;
        }>;
        count: number;
        averageRating: number;
        minRating: number;
        maxRating: number;
        medianRating: number;
      }>;
    }>;
    questionVotesByDay: Array<{
      day: number;
      dayDate: string;
      questionTypes: Array<{
        questionType: string;
        day: number;
        dayDate: string;
        votes: Array<{
          userId: string;
          userName: string;
          rating: number;
          questionNumber: number;
          speakerName?: string;
          textResponse?: string;
          submittedAt: Date | string;
        }>;
        count: number;
        averageRating: number;
        minRating: number;
        maxRating: number;
        medianRating: number;
      }>;
    }>;
  };
  speakers: {
    total: number;
  };
}

export function ExecutiveReportView() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [selectedRating, setSelectedRating] = useState<number | "all">("all");
  
  // Referencias para los gráficos ECharts
  const specialtyChartRef = useRef<any>(null);
  const cityChartRef = useRef<any>(null);
  const questionStatusChartRef = useRef<any>(null);
  const eventTypeChartRef = useRef<any>(null);
  const eventByDateChartRef = useRef<any>(null);
  const surveyByQuestionTypeChartRef = useRef<any>(null);
  const surveyBySpeakerChartRef = useRef<any>(null);
  const ratingDistributionChartRef = useRef<any>(null);
  const surveyByDayChartRef = useRef<any>(null);
  const surveyByDateChartRef = useRef<any>(null);
  const questionVotesChartRef = useRef<Map<number, React.RefObject<any>>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/reports/executive");
        if (!response.ok) {
          throw new Error("Error al cargar los datos del informe");
        }
        const reportData = await response.json();
        setData(reportData);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const exportToXLSX = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Resumen ejecutivo
    const summaryRows = [
      { Métrica: "Total Usuarios", Valor: data.summary.totalUsers },
      { Métrica: "Usuarios Administradores", Valor: data.summary.totalAdmins },
      { Métrica: "Usuarios Regulares", Valor: data.summary.totalRegularUsers },
      { Métrica: "Total Speakers", Valor: data.summary.totalSpeakers },
      { Métrica: "Total Preguntas", Valor: data.summary.totalQuestions },
      { Métrica: "Total Respuestas Encuestas", Valor: data.summary.totalSurveyResponses },
      { Métrica: "Usuarios Únicos Encuestas", Valor: data.summary.uniqueSurveyUsers },
      { Métrica: "Calificación Promedio", Valor: data.summary.averageRating },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen Ejecutivo");

    // Estado de preguntas
    const questionRows = [
      { Estado: "Aprobadas", Cantidad: data.questions.approved },
      { Estado: "Pendientes", Cantidad: data.questions.pending },
      { Estado: "Respondidas", Cantidad: data.questions.answered },
      { Estado: "Sin Responder", Cantidad: data.questions.unanswered },
    ];
    const questionSheet = XLSX.utils.json_to_sheet(questionRows);
    XLSX.utils.book_append_sheet(wb, questionSheet, "Estado de Preguntas");

    // Encuestas - Análisis detallado
    const surveySummaryRows = [
      { Métrica: "Total Respuestas", Valor: data.surveys.totalResponses },
      { Métrica: "Usuarios Únicos", Valor: data.surveys.uniqueUsers },
      { Métrica: "Calificación Promedio", Valor: data.surveys.averageRating },
      { Métrica: "Calificación Mínima", Valor: data.surveys.minRating },
      { Métrica: "Calificación Máxima", Valor: data.surveys.maxRating },
      { Métrica: "Calificación Mediana", Valor: data.surveys.medianRating },
      { Métrica: "Respuestas con Texto", Valor: data.surveys.responsesWithText },
      { Métrica: "Respuestas sin Texto", Valor: data.surveys.responsesWithoutText },
    ];
    const surveySummarySheet = XLSX.utils.json_to_sheet(surveySummaryRows);
    XLSX.utils.book_append_sheet(wb, surveySummarySheet, "Resumen Encuestas");

    // Encuestas por tipo de pregunta
    if (data.surveys.byQuestionType.length > 0) {
      const questionTypeRows = data.surveys.byQuestionType.map((item) => ({
        "Pregunta": item.type,
        "Cantidad": item.count,
        "Promedio Calificación": item.averageRating,
      }));
      const questionTypeSheet = XLSX.utils.json_to_sheet(questionTypeRows);
      XLSX.utils.book_append_sheet(wb, questionTypeSheet, "Encuestas por Tipo");
    }

    // Encuestas por speaker
    if (data.surveys.bySpeaker.length > 0) {
      const speakerRows = data.surveys.bySpeaker.map((item) => ({
        Speaker: item.speaker,
        "Cantidad": item.count,
        "Promedio Calificación": item.averageRating,
    }));
      const speakerSheet = XLSX.utils.json_to_sheet(speakerRows);
      XLSX.utils.book_append_sheet(wb, speakerSheet, "Encuestas por Speaker");
    }

    // Encuestas por día
    if (data.surveys.dayStats.length > 0) {
      const dayStatsRows = data.surveys.dayStats.map((item) => ({
        Día: item.day,
        Fecha: item.dayDate,
        "Cantidad Respuestas": item.count,
        "Promedio Calificación": item.averageRating,
    }));
      const dayStatsSheet = XLSX.utils.json_to_sheet(dayStatsRows);
      XLSX.utils.book_append_sheet(wb, dayStatsSheet, "Encuestas por Día");
    }

    // Distribución de calificaciones
    const ratingDistRows = Object.entries(data.surveys.ratingDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([rating, count]) => ({
        Calificación: parseInt(rating),
      Cantidad: count,
    }));
    const ratingDistSheet = XLSX.utils.json_to_sheet(ratingDistRows);
    XLSX.utils.book_append_sheet(wb, ratingDistSheet, "Distribución Calificaciones");

    // Top usuarios activos
    if (data.surveys.topActiveUsers.length > 0) {
      const topUsersRows = data.surveys.topActiveUsers.map((item) => ({
        "Nombre": item.userName,
        "Cantidad Respuestas": item.count,
      }));
      const topUsersSheet = XLSX.utils.json_to_sheet(topUsersRows);
      XLSX.utils.book_append_sheet(wb, topUsersSheet, "Top Usuarios Activos");
    }

    // Encuestas por fecha
    const surveyDateRows = Object.entries(data.surveys.byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
      Fecha: date,
      Cantidad: count,
    }));
    const surveyDateSheet = XLSX.utils.json_to_sheet(surveyDateRows);
    XLSX.utils.book_append_sheet(wb, surveyDateSheet, "Encuestas por Fecha");

    // Usuarios sin votaciones
    if (data.users.withoutVotes && data.users.withoutVotes.length > 0) {
      const usersWithoutVotesRows = data.users.withoutVotes.map((user) => ({
        Nombre: user.name,
        Email: user.email,
        "ID Médico": user.medicalId,
        Ciudad: user.city,
        Especialidad: user.specialty,
        Tipo: user.isAdmin ? "Admin" : "Usuario",
        "Último Login": user.lastLogin
          ? format(
              typeof user.lastLogin === 'string'
                ? parseISO(user.lastLogin)
                : new Date(user.lastLogin),
              "dd/MM/yyyy HH:mm",
              { locale: es }
            )
          : "Nunca",
        "Fecha Registro": user.createdAt
          ? format(
              typeof user.createdAt === 'string'
                ? parseISO(user.createdAt)
                : new Date(user.createdAt),
              "dd/MM/yyyy",
              { locale: es }
            )
          : "-",
      }));
      const usersWithoutVotesSheet = XLSX.utils.json_to_sheet(usersWithoutVotesRows);
      XLSX.utils.book_append_sheet(wb, usersWithoutVotesSheet, "Usuarios sin Votaciones");
    }

    // Respuestas con Texto
    if (data.surveys.responsesWithTextDetail && data.surveys.responsesWithTextDetail.length > 0) {
      const responsesWithTextRows = data.surveys.responsesWithTextDetail.map((response) => ({
        Usuario: response.userName || 'Sin nombre',
        Día: `Día ${response.day}`,
        "Fecha Día": response.dayDate,
        Pregunta: response.questionType,
        "Pregunta #": response.questionNumber,
        Calificación: response.rating,
        Fecha: response.submittedAt
          ? format(
              typeof response.submittedAt === 'string'
                ? parseISO(response.submittedAt)
                : new Date(response.submittedAt),
              "dd/MM/yyyy HH:mm",
              { locale: es }
            )
          : '-',
        Comentario: response.textResponse,
      }));
      const responsesWithTextSheet = XLSX.utils.json_to_sheet(responsesWithTextRows);
      XLSX.utils.book_append_sheet(wb, responsesWithTextSheet, "Respuestas con Texto");
    }

    XLSX.writeFile(wb, `informe-gerencial-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 15;
    const imageWidth = pageWidth - (margin * 2);
    let yPosition = 20;

    // Cargar el logo una vez
    const loadLogo = (): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => resolve(logoImg);
        logoImg.onerror = () => {
          console.error('Error al cargar logo');
          reject(new Error('No se pudo cargar el logo'));
        };
        logoImg.src = '/logo_adium.png';
      });
    };

    // Función para agregar el logo en la página actual
    const addLogoToCurrentPage = (logoImg: HTMLImageElement) => {
      try {
        // Tamaño del logo (ajustar según necesidad)
        const logoWidth = 30;
        const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
        
        // Agregar el logo en la esquina superior izquierda
        doc.addImage(logoImg, 'PNG', margin, margin, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error al agregar logo:', error);
      }
    };

    // Función para generar imagen desde opciones de ECharts directamente
    // Genera un contenedor fijo y ajusta el contenido del gráfico dentro de él
    const getChartImageFromOption = async (option: any, chartHeight: number = 500): Promise<string | null> => {
      try {
        const echarts = await import('echarts');
        
        // Definir tamaño fijo del contenedor (sin padding adicional)
        const containerWidth = 1200;
        const containerHeight = chartHeight;
        
        // Crear contenedor DOM con tamaño fijo
        const container = document.createElement('div');
        container.style.width = `${containerWidth}px`;
        container.style.height = `${containerHeight}px`;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.visibility = 'hidden';
        container.style.padding = '0';
        container.style.margin = '0';
        container.style.boxSizing = 'border-box';
        document.body.appendChild(container);
        
        // Inicializar ECharts dentro del contenedor con dimensiones exactas
        const echartsInstance = echarts.init(container, null, {
          renderer: 'canvas',
          width: containerWidth,
          height: containerHeight
        });
        
        if (!echartsInstance) {
          document.body.removeChild(container);
          return null;
        }
        
        // Ajustar opciones del gráfico para que se ajuste dentro del contenedor
        // Sin padding adicional, solo el grid necesario
        const fullOption = {
          ...option,
          // Ajustar grid para que el contenido quepa dentro del contenedor
          grid: {
            ...(option.grid || {}),
            left: option.grid?.left || '8%',
            right: option.grid?.right || '5%',
            top: option.grid?.top || '8%',
            bottom: option.grid?.bottom || '8%',
            containLabel: true, // Asegura que las etiquetas no se corten
          },
          // Ajustar título si existe
          title: option.title ? {
            ...option.title,
            top: option.title.top || '3%',
          } : undefined,
          // No establecer width/height aquí, dejar que ECharts use el contenedor
        };
        
        // Limpiar y establecer opciones
        echartsInstance.clear();
        echartsInstance.setOption(fullOption, true);
        
        // Esperar renderizado inicial
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Forzar resize al tamaño exacto del contenedor
        echartsInstance.resize({
          width: containerWidth,
          height: containerHeight
        });
        
        // Esperar renderizado completo
        await new Promise(resolve => setTimeout(resolve, 700));
        
        // Generar imagen con calidad alta
        const imageDataUrl = echartsInstance.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });
        
        // Limpiar
        echartsInstance.dispose();
        document.body.removeChild(container);
        return imageDataUrl;
      } catch (error) {
        console.error('Error al generar imagen desde opción:', error);
        return null;
      }
    };

    // Función para agregar imagen al PDF
    // La imagen ya viene del contenedor con tamaño correcto, solo necesita ajustarse al PDF
    const addImageToPDF = async (imageDataUrl: string | null, title: string, maxHeight?: number) => {
      if (!imageDataUrl) return;
      
      // Márgenes mínimos para el borde
      const borderWidth = 0.3; // Borde muy delgado
      const borderPadding = 2; // Pequeño espacio para el borde
      
      // Agregar título de la imagen solo si no está vacío
      if (title) {
        checkNewPage(lineHeight * 2);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin, yPosition);
        yPosition += lineHeight;
      }
      
      // Calcular dimensiones manteniendo proporción exacta de la imagen original
      const img = new Image();
      img.src = imageDataUrl;
      
      await new Promise((resolve) => {
        img.onload = () => {
          // Calcular ancho disponible (restando solo el espacio del borde)
          const availableWidth = imageWidth - (borderPadding * 2) - (borderWidth * 2);
          const imgWidth = availableWidth;
          
          // Calcular altura manteniendo la proporción EXACTA de la imagen original
          const aspectRatio = img.height / img.width;
          const imgHeight = imgWidth * aspectRatio;
          
          // Calcular espacio total necesario
          const totalHeightNeeded = imgHeight + (borderPadding * 2) + (borderWidth * 2) + lineHeight;
          const availableHeight = pageHeight - yPosition - margin;
          
          // Si no cabe en la página actual, agregar nueva página ANTES de dibujar
          if (totalHeightNeeded > availableHeight) {
            checkNewPage(totalHeightNeeded);
          }
          
          // Calcular posición del marco (solo borde, sin padding excesivo)
          const frameX = margin;
          const frameY = yPosition;
          const frameWidth = imgWidth + (borderPadding * 2) + (borderWidth * 2);
          const frameHeight = imgHeight + (borderPadding * 2) + (borderWidth * 2);
          
          // Dibujar fondo muy claro para el marco
          doc.setFillColor(250, 251, 252); // Color casi blanco
          doc.setDrawColor(240, 242, 245); // Borde muy claro y delgado
          doc.setLineWidth(borderWidth);
          // Dibujar rectángulo con fondo (simula borde redondeado visualmente)
          doc.roundedRect(frameX, frameY, frameWidth, frameHeight, 1.5, 1.5, 'FD'); // 'FD' = Fill and Draw
          
          // Agregar la imagen EXACTAMENTE con las dimensiones calculadas (sin recortes)
          // La imagen ya viene del contenedor con el tamaño correcto
          const imageX = frameX + borderPadding + borderWidth;
          const imageY = frameY + borderPadding + borderWidth;
          doc.addImage(imageDataUrl, 'PNG', imageX, imageY, imgWidth, imgHeight, undefined, 'FAST');
          
          // Actualizar posición Y para el siguiente elemento
          yPosition += frameHeight + sectionSpacing;
          resolve(null);
        };
        img.onerror = () => resolve(null);
      });
    };

    // Función para agregar nueva página si es necesario
    const checkNewPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        // No agregar logo en páginas nuevas, solo en la primera
        return true;
      }
      return false;
    };

    // Función para agregar título de sección
    const addSectionTitle = (title: string, fontSize: number = 16) => {
      checkNewPage(lineHeight * 2);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, yPosition);
      yPosition += lineHeight * 1.5;
      doc.setFont("helvetica", "normal");
    };

    // Cargar el logo
    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = await loadLogo();
    } catch (error) {
      console.error('No se pudo cargar el logo, continuando sin él');
    }

    // Portada
    if (logoImg) {
      addLogoToCurrentPage(logoImg);
    }
    
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME 123 CARDIO ADIUM", pageWidth / 2, 40, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    const dateStr = new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Generado el: ${dateStr}`, pageWidth / 2, 50, { align: "center" });
    
    yPosition = 110;

    // Gráficos individuales por pregunta
    if (data.surveys.questionVotesByDay && data.surveys.questionVotesByDay.length > 0) {
      checkNewPage(lineHeight * 3);
      addSectionTitle("Gráficos Individuales por Pregunta", 16);
      
      for (const dayData of data.surveys.questionVotesByDay.sort((a, b) => a.day - b.day)) {
        checkNewPage(lineHeight * 3);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(46, 97, 250); // Color azul #2E61FA
        doc.text(`Día ${dayData.day} - ${dayData.dayDate}`, margin, yPosition);
        doc.setTextColor(0, 0, 0); // Volver a negro
        yPosition += lineHeight * 2;
        
        const sortedQuestions = dayData.questionTypes.sort((a, b) => {
          const numA = a.votes[0]?.questionNumber || 0;
          const numB = b.votes[0]?.questionNumber || 0;
          return numA - numB;
        });

        for (const questionData of sortedQuestions) {
          const ratingDistribution: Record<number, number> = {};
          questionData.votes.forEach(vote => {
            ratingDistribution[vote.rating] = (ratingDistribution[vote.rating] || 0) + 1;
          });

          const ratingEntries = Object.entries(ratingDistribution)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([rating, count]) => ({ rating: parseInt(rating), count }));

          const chartOption = {
            tooltip: {
              trigger: "axis",
              axisPointer: { type: "shadow" },
              formatter: (params: any) => {
                const param = Array.isArray(params) ? params[0] : params;
                return `Calificación ${param.name}<br/>Cantidad: ${param.value}`;
              },
            },
            xAxis: {
              type: "category",
              data: ratingEntries.map(e => e.rating.toString()),
              name: "Calificación",
              axisLabel: {
                formatter: (value: number) => value.toLocaleString(),
                fontSize: 15,
                fontWeight: "bold",
                color: "#000000",
              },
            },
            yAxis: {
              type: "value",
              name: "Cantidad de Votos",
              axisLabel: {
                formatter: (value: number) => value.toLocaleString(),
                fontSize: 15,
                fontWeight: "bold",
                color: "#000000",
              },
            },
            series: [
              {
                name: "Votos",
                type: "bar",
                data: ratingEntries.map(e => e.count),
                itemStyle: { color: "#2E61FA" },
                label: { 
                  show: true, 
                  position: "top",
                  fontSize: 15,
                  fontWeight: "bold",
                  color: "#000000",
                },
            },
            ],
            grid: {
              left: "12%",
              right: "8%",
              bottom: "12%",
              top: "12%",
              containLabel: true, // Asegura que las etiquetas no se corten
            },
            backgroundColor: "#ffffff"
          };

          // Título completo de la pregunta
          const questionTitle = questionData.questionType;
          const questionDescription = `Total: ${questionData.count} votos • Promedio: ${questionData.averageRating.toFixed(2)}`;
          
          // Agregar título de la pregunta
          checkNewPage(lineHeight * 4);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const questionTitleLines = doc.splitTextToSize(questionTitle, pageWidth - (margin * 2));
          questionTitleLines.forEach((line: string) => {
            doc.text(line, margin, yPosition);
            yPosition += lineHeight;
          });
          
          // Agregar descripción
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(questionDescription, margin, yPosition);
          yPosition += lineHeight * 1.5;
          
          // Generar y agregar gráfico completo (regenerar con nueva configuración)
          const chartImage = await getChartImageFromOption(chartOption, 500);
          if (chartImage) {
            await addImageToPDF(chartImage, "");
          }
        }
      }
    }

    // Gráficos individuales por speaker
    if (data.surveys.speakerVotesByDay && data.surveys.speakerVotesByDay.length > 0) {
      checkNewPage(lineHeight * 3);
      addSectionTitle("Gráficos Individuales por Speaker", 16);
      
      for (const dayData of data.surveys.speakerVotesByDay.sort((a, b) => a.day - b.day)) {
        checkNewPage(lineHeight * 3);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(253, 2, 51); // Color rojo #FD0233
        doc.text(`Día ${dayData.day} - ${dayData.dayDate}`, margin, yPosition);
        doc.setTextColor(0, 0, 0); // Volver a negro
        yPosition += lineHeight * 2;
        
        const sortedSpeakers = dayData.speakers.sort((a, b) => b.count - a.count);

        for (const speakerData of sortedSpeakers) {
          const ratingDistribution: Record<number, number> = {};
          speakerData.votes.forEach(vote => {
            ratingDistribution[vote.rating] = (ratingDistribution[vote.rating] || 0) + 1;
          });

          const ratingEntries = Object.entries(ratingDistribution)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([rating, count]) => ({ rating: parseInt(rating), count }));

          const chartOption = {
            title: {
              text: speakerData.speaker.length > 60 
                ? speakerData.speaker.substring(0, 60) + '...' 
                : speakerData.speaker,
              left: "center",
              textStyle: { fontSize: 14, fontWeight: "bold" },
            },
            tooltip: {
              trigger: "axis",
              axisPointer: { type: "shadow" },
              formatter: (params: any) => {
                const param = Array.isArray(params) ? params[0] : params;
                return `Calificación ${param.name}<br/>Cantidad: ${param.value}`;
              },
            },
            xAxis: {
              type: "category",
              data: ratingEntries.map(e => e.rating.toString()),
              name: "Calificación",
              axisLabel: {
                formatter: (value: number) => value.toLocaleString(),
                fontSize: 15,
                fontWeight: "bold",
                color: "#000000",
              },
            },
            yAxis: {
              type: "value",
              name: "Cantidad de Votos",
              axisLabel: {
                formatter: (value: number) => value.toLocaleString(),
                fontSize: 15,
                fontWeight: "bold",
                color: "#000000",
              },
            },
            series: [
              {
                name: "Votos",
                type: "bar",
                data: ratingEntries.map(e => ({
                  value: e.count,
                  itemStyle: {
                    color: (() => {
                      // Colores diferentes según la calificación
                      if (e.rating >= 8) return "#10b981"; // Verde para altos
                      if (e.rating >= 6) return "#f59e0b"; // Amarillo para medios
                      return "#ef4444"; // Rojo para bajos
                    })()
                  }
                })),
                label: { 
                  show: true, 
                  position: "top",
                },
            },
            ],
            grid: {
              left: "10%",
              right: "8%",
              bottom: "15%",
              top: "15%",
              containLabel: true, // Asegura que las etiquetas no se corten
            },
            backgroundColor: "#ffffff"
          };

          // Título completo del speaker
          const speakerTitle = speakerData.speaker.length > 80 
            ? speakerData.speaker.substring(0, 80) + '...' 
            : speakerData.speaker;
          const speakerDescription = `Total: ${speakerData.count} votos • Promedio: ${speakerData.averageRating.toFixed(2)}`;
          
          // Agregar título del speaker
          checkNewPage(lineHeight * 4);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const speakerTitleLines = doc.splitTextToSize(speakerTitle, pageWidth - (margin * 2));
          speakerTitleLines.forEach((line: string) => {
            doc.text(line, margin, yPosition);
            yPosition += lineHeight;
          });
          
          // Agregar descripción
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(speakerDescription, margin, yPosition);
          yPosition += lineHeight * 1.5;
          
          // Generar y agregar gráfico completo (regenerar con nueva configuración)
          const chartImage = await getChartImageFromOption(chartOption, 500);
          if (chartImage) {
            await addImageToPDF(chartImage, "");
          }
        }
      }
    }

    // Respuestas con Texto
    if (data.surveys.responsesWithTextDetail && data.surveys.responsesWithTextDetail.length > 0) {
      checkNewPage(lineHeight * 3);
      addSectionTitle("RESPUESTAS CON TEXTO", 18);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ${data.surveys.responsesWithTextDetail.length} respuestas`, margin, yPosition);
      yPosition += lineHeight * 1.5;
      
      const responsesWithTextData = [
        ["Usuario", "Día", "Pregunta", "Pregunta #", "Calificación", "Fecha", "Comentario"],
        ...data.surveys.responsesWithTextDetail.map((response) => [
          response.userName || 'Sin nombre',
          `Día ${response.day}`,
          response.questionType.length > 50 ? response.questionType.substring(0, 50) + '...' : response.questionType,
          response.questionNumber.toString(),
          response.rating.toString(),
          response.submittedAt
            ? format(
                typeof response.submittedAt === 'string'
                  ? parseISO(response.submittedAt)
                  : new Date(response.submittedAt),
                "dd/MM/yyyy HH:mm",
                { locale: es }
              )
            : '-',
          response.textResponse.length > 100 ? response.textResponse.substring(0, 100) + '...' : response.textResponse,
        ]),
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [responsesWithTextData[0]],
        body: responsesWithTextData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 7 },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as any).lastAutoTable.finalY + sectionSpacing;
    }

    // El logo ya fue agregado en la primera página, no se agrega en las demás

    // Guardar PDF
    const fileName = `informe-gerencial-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const buildSpecialtyChart = () => {
    if (!data || data.users.topSpecialties.length === 0) return null;

    return {
      title: {
        text: "Top 5 Especialidades",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: data.users.topSpecialties.map((item) => item.specialty),
        axisLabel: { rotate: 45, interval: 0 },
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Usuarios",
          type: "bar",
          data: data.users.topSpecialties.map((item) => item.count),
          itemStyle: { color: "#2E61FA" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const buildCityChart = () => {
    if (!data || data.users.topCities.length === 0) return null;

    return {
      title: {
        text: "Top 5 Ciudades",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: data.users.topCities.map((item) => item.city),
        axisLabel: { rotate: 45, interval: 0 },
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Usuarios",
          type: "bar",
          data: data.users.topCities.map((item) => item.count),
          itemStyle: { color: "#FD0233" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const buildQuestionStatusChart = () => {
    if (!data) return null;

    return {
      title: {
        text: "Estado de Preguntas",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const total = data.questions.total;
          const percentage = total > 0 ? ((params.value / total) * 100).toFixed(1) : "0";
          return `${params.name}<br/>Cantidad: ${params.value}<br/>Porcentaje: ${percentage}%`;
        },
      },
      legend: {
        orient: "vertical",
        left: "left",
        top: "middle",
      },
      series: [
        {
          name: "Estado",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: "{b}\n{d}% ({c})",
            fontSize: 11,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: "bold",
            },
          },
          data: [
            { value: data.questions.approved, name: "Aprobadas", itemStyle: { color: "#10b981" } },
            { value: data.questions.pending, name: "Pendientes", itemStyle: { color: "#f59e0b" } },
            { value: data.questions.answered, name: "Respondidas", itemStyle: { color: "#2E61FA" } },
            { value: data.questions.unanswered, name: "Sin Responder", itemStyle: { color: "#ef4444" } },
          ],
        },
      ],
    };
  };

  const buildEventTypeChart = () => {
    if (!data || Object.keys(data.events.byType).length === 0) return null;

    const entries = Object.entries(data.events.byType);
    return {
      title: {
        text: "Eventos por Tipo",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "item",
      },
      legend: {
        orient: "vertical",
        left: "left",
        top: "middle",
      },
      series: [
        {
          name: "Tipo",
          type: "pie",
          radius: "50%",
          data: entries.map(([type, count]) => ({
            value: count,
            name: type,
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };
  };

  const buildEventByDateChart = () => {
    if (!data || Object.keys(data.events.byDate).length === 0) return null;

    const entries = Object.entries(data.events.byDate).sort(([a], [b]) => a.localeCompare(b));
    return {
      title: {
        text: "Eventos por Fecha",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: entries.map(([date]) => date),
        axisLabel: { rotate: 45, interval: 0 },
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Eventos",
          type: "bar",
          data: entries.map(([, count]) => count),
          itemStyle: { color: "#2E61FA" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const buildSurveyByQuestionTypeChart = () => {
    if (!data || data.surveys.byQuestionType.length === 0) return null;

    return {
      title: {
        text: "Votaciones por Pregunta",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const questionData = data.surveys.byQuestionType.find(t => t.type === param.name);
          return `${param.name}<br/>Cantidad de Votos: ${param.value}<br/>Promedio de Calificación: ${questionData?.averageRating.toFixed(2) || 0}`;
        },
      },
      xAxis: {
        type: "category",
        data: data.surveys.byQuestionType.map((item) => {
          // Truncar textos largos para el eje X
          return item.type.length > 50 ? item.type.substring(0, 50) + '...' : item.type;
        }),
        axisLabel: { 
          rotate: 45, 
          interval: 0,
          fontSize: 10,
          formatter: (value: string) => {
            // Truncar más si es necesario
            return value.length > 40 ? value.substring(0, 40) + '...' : value;
          }
        },
      },
      yAxis: {
        type: "value",
        name: "Cantidad de Votos",
      },
      series: [
        {
          name: "Votos",
          type: "bar",
          data: data.surveys.byQuestionType.map((item) => ({
            value: item.count,
            itemStyle: {
              color: (() => {
                // Colores diferentes según el promedio
                const avg = item.averageRating;
                if (avg >= 8) return "#10b981"; // Verde para altos
                if (avg >= 6) return "#f59e0b"; // Amarillo para medios
                return "#ef4444"; // Rojo para bajos
              })()
            }
          })),
          label: { 
            show: true, 
            position: "top",
            formatter: (params: any) => {
              const questionData = data.surveys.byQuestionType[params.dataIndex];
              return `${params.value}\n(${questionData.averageRating.toFixed(1)})`;
            }
          },
        },
      ],
      grid: {
        left: "10%",
        right: "10%",
        bottom: "30%",
        top: "15%",
      },
    };
  };

  const buildSurveyBySpeakerChart = () => {
    if (!data || data.surveys.bySpeaker.length === 0) return null;

    const topSpeakers = data.surveys.bySpeaker.slice(0, 10);
    
    // Obtener los días en que cada speaker recibió votos
    const speakerDaysMap = new Map<string, Set<number>>();
    if (data.surveys.speakerVotesByDay) {
      data.surveys.speakerVotesByDay.forEach((dayData) => {
        dayData.speakers.forEach((speakerData) => {
          if (!speakerDaysMap.has(speakerData.speaker)) {
            speakerDaysMap.set(speakerData.speaker, new Set());
          }
          speakerDaysMap.get(speakerData.speaker)!.add(dayData.day);
        });
      });
    }
    
    return {
      title: {
        text: "Top 10 Speakers - Encuestas",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const speakerName = param.name;
          const speakerData = topSpeakers.find(s => s.speaker === speakerName);
          const days = speakerDaysMap.get(speakerName);
          const daysText = days && days.size > 0 
            ? Array.from(days).sort((a, b) => a - b).map(d => `Día ${d}`).join(', ')
            : 'Sin información de días';
          
          return `${speakerName}<br/>Votos: ${param.value}<br/>Promedio: ${speakerData?.averageRating.toFixed(2) || 0}<br/>Días: ${daysText}`;
        },
      },
      xAxis: {
        type: "category",
        data: topSpeakers.map((item) => item.speaker),
        axisLabel: { rotate: 45, interval: 0 },
      },
      yAxis: {
        type: "value",
        name: "Cantidad de Votos",
      },
      series: [
        {
          name: "Votos",
          type: "bar",
          data: topSpeakers.map((item) => ({
            value: item.count,
            itemStyle: { color: "#FD0233" }
          })),
          label: { 
            show: true, 
            position: "top",
            formatter: (params: any) => {
              return `${params.value}`;
            }
          },
        },
      ],
    };
  };

  const buildRatingDistributionChart = () => {
    if (!data || Object.keys(data.surveys.ratingDistribution).length === 0) return null;

    const entries = Object.entries(data.surveys.ratingDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([rating, count]) => ({ rating: parseInt(rating), count }));

    return {
      title: {
        text: "Distribución de Calificaciones",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: entries.map((e) => e.rating.toString()),
        name: "Calificación",
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Respuestas",
          type: "bar",
          data: entries.map((e) => e.count),
          itemStyle: { color: "#2E61FA" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const buildSurveyByDayChart = () => {
    if (!data || data.surveys.dayStats.length === 0) return null;

    const sortedStats = [...data.surveys.dayStats].sort((a, b) => a.day - b.day);
    return {
      title: {
        text: "Encuestas por Día",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const dayStat = sortedStats.find(s => s.day.toString() === param.name);
          return `Día ${param.name}<br/>Fecha: ${dayStat?.dayDate || ''}<br/>Cantidad: ${param.value}<br/>Promedio: ${dayStat?.averageRating || 0}`;
        },
      },
      xAxis: {
        type: "category",
        data: sortedStats.map((s) => `Día ${s.day}`),
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Respuestas",
          type: "bar",
          data: sortedStats.map((s) => s.count),
          itemStyle: { color: "#f59e0b" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const buildSurveyByDateChart = () => {
    if (!data || Object.keys(data.surveys.byDate).length === 0) return null;

    const entries = Object.entries(data.surveys.byDate).sort(([a], [b]) => a.localeCompare(b));
    return {
      title: {
        text: "Encuestas por Fecha de Envío",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: entries.map(([date]) => date),
        axisLabel: { rotate: 45, interval: 0 },
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Respuestas",
          type: "line",
          data: entries.map(([, count]) => count),
          itemStyle: { color: "#10b981" },
          smooth: true,
          areaStyle: { opacity: 0.3 },
        },
      ],
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 p-8 text-center">
        <p className="text-lg font-semibold text-red-600">Error al cargar el informe</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-lg font-semibold">No hay datos disponibles</p>
      </div>
    );
  }

  // Obtener días disponibles
  const availableDays = data.surveys.dayStats.map(s => s.day).sort();
  
  // Obtener calificaciones disponibles
  const availableRatings = Object.keys(data.surveys.ratingDistribution)
    .map(r => parseInt(r))
    .sort((a, b) => a - b);

  // Filtrar datos según los filtros seleccionados
  const filteredData = {
    ...data,
    surveys: {
      ...data.surveys,
      // Filtrar estadísticas por día
      dayStats: selectedDay === "all" 
        ? data.surveys.dayStats 
        : data.surveys.dayStats.filter(s => s.day === selectedDay),
      // Filtrar distribución de calificaciones
      ratingDistribution: selectedRating === "all"
        ? data.surveys.ratingDistribution
        : Object.fromEntries(
            Object.entries(data.surveys.ratingDistribution).filter(([rating]) => 
              parseInt(rating) === selectedRating
            )
          ),
    }
  };

  const questionStatusOption = buildQuestionStatusChart();
  const surveyByQuestionTypeOption = buildSurveyByQuestionTypeChart();
  const surveyBySpeakerOption = buildSurveyBySpeakerChart();
  const ratingDistributionOption = buildRatingDistributionChart();
  const surveyByDayOption = buildSurveyByDayChart();
  const surveyByDateOption = buildSurveyByDateChart();

  // Construir gráficos con datos filtrados
  const buildFilteredSurveyByDayChart = () => {
    if (!filteredData || filteredData.surveys.dayStats.length === 0) return null;

    const sortedStats = [...filteredData.surveys.dayStats].sort((a, b) => a.day - b.day);
    return {
      title: {
        text: selectedDay === "all" ? "Encuestas por Día" : `Encuestas - Día ${selectedDay}`,
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const dayStat = sortedStats.find(s => s.day.toString() === param.name);
          return `Día ${param.name}<br/>Fecha: ${dayStat?.dayDate || ''}<br/>Cantidad: ${param.value}<br/>Promedio: ${dayStat?.averageRating || 0}`;
        },
      },
      xAxis: {
        type: "category",
        data: sortedStats.map((s) => `Día ${s.day}`),
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Respuestas",
          type: "bar",
          data: sortedStats.map((s) => s.count),
          itemStyle: { color: "#f59e0b" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const buildFilteredRatingDistributionChart = () => {
    if (!filteredData || Object.keys(filteredData.surveys.ratingDistribution).length === 0) return null;

    const entries = Object.entries(filteredData.surveys.ratingDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([rating, count]) => ({ rating: parseInt(rating), count }));

    return {
      title: {
        text: selectedRating === "all" 
          ? "Distribución de Calificaciones" 
          : `Calificación ${selectedRating}`,
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: entries.map((e) => e.rating.toString()),
        name: "Calificación",
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
      },
      series: [
        {
          name: "Respuestas",
          type: "bar",
          data: entries.map((e) => e.count),
          itemStyle: { color: "#2E61FA" },
          label: { show: true, position: "top" },
        },
      ],
    };
  };

  const filteredSurveyByDayOption = buildFilteredSurveyByDayChart();
  const filteredRatingDistributionOption = buildFilteredRatingDistributionChart();

  const hasActiveFilters = selectedDay !== "all" || selectedRating !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Informe Gerencial</h2>
          <p className="text-muted-foreground">
            Resumen ejecutivo de todas las métricas del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QRCodeViewer viewName="estadisticas" label="Informe Gerencial" />
          <Button variant="outline" onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          <Button variant="outline" onClick={exportToXLSX}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            Descargar XLSX
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalAdmins} admins, {data.summary.totalRegularUsers} regulares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Preguntas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              {data.questions.approved} aprobadas, {data.questions.answered} respondidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encuestas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSurveyResponses}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.uniqueSurveyUsers} usuarios • Promedio: {data.summary.averageRating}/10
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de Votaciones por Speakers y Preguntas */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-[#2E61FA]" />
          <h3 className="text-2xl font-bold text-primary">Detalle de Votaciones</h3>
        </div>

        {/* Gráfico general de votaciones por pregunta */}
        {data.surveys.byQuestionType && data.surveys.byQuestionType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Votaciones por Pregunta - Resumen General</CardTitle>
              <CardDescription>
                Cantidad de votos y promedio de calificación para todas las preguntas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <ReactECharts 
                  option={surveyByQuestionTypeOption} 
                  style={{ height: 350 }}
                  onChartReady={(chart) => {
                    surveyByQuestionTypeChartRef.current = chart;
                  }}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#10b981]"></div>
                  <span>Promedio ≥ 8</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#f59e0b]"></div>
                  <span>Promedio 6-7.9</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#ef4444]"></div>
                  <span>Promedio &lt; 6</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráficos individuales por pregunta agrupados por fecha */}
        {data.surveys.questionVotesByDay && data.surveys.questionVotesByDay.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-[#2E61FA]" />
              <h3 className="text-2xl font-bold text-primary">Gráficos Individuales por Pregunta</h3>
            </div>
            
            {data.surveys.questionVotesByDay
              .sort((a, b) => a.day - b.day)
              .map((dayData) => (
                <div key={dayData.day} className="space-y-4">
                  <div className="bg-[#2E61FA] text-white rounded-lg p-4">
                    <h4 className="text-xl font-bold">
                      Día {dayData.day} - {dayData.dayDate}
                    </h4>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    {dayData.questionTypes
                      .sort((a, b) => {
                        // Ordenar por número de pregunta
                        const numA = a.votes[0]?.questionNumber || 0;
                        const numB = b.votes[0]?.questionNumber || 0;
                        return numA - numB;
                      })
                      .map((questionData, idx) => {
                        // Calcular distribución de calificaciones para esta pregunta en este día
                        const ratingDistribution: Record<number, number> = {};
                        questionData.votes.forEach(vote => {
                          ratingDistribution[vote.rating] = (ratingDistribution[vote.rating] || 0) + 1;
                        });

                        const ratingEntries = Object.entries(ratingDistribution)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([rating, count]) => ({ rating: parseInt(rating), count }));

                        const chartOption = {
                          tooltip: {
                            trigger: "axis",
                            axisPointer: { type: "shadow" },
                            formatter: (params: any) => {
                              const param = Array.isArray(params) ? params[0] : params;
                              return `Calificación ${param.name}<br/>Cantidad: ${param.value}`;
                            },
                          },
                          xAxis: {
                            type: "category",
                            data: ratingEntries.map(e => e.rating.toString()),
                            name: "Calificación",
                          },
                          yAxis: {
                            type: "value",
                            name: "Cantidad de Votos",
                          },
                          series: [
                            {
                              name: "Votos",
                              type: "bar",
                              data: ratingEntries.map(e => e.count),
                              itemStyle: { color: "#2E61FA" },
                              label: { 
                                show: true, 
                                position: "top",
                              },
                            },
                          ],
                          grid: {
                            left: "15%",
                            right: "10%",
                            bottom: "15%",
                            top: "10%",
                          },
                        };

                        return (
                          <Card key={idx}>
                            <CardHeader>
                              <CardTitle className="text-base whitespace-normal break-words">
                                {questionData.questionType}
                              </CardTitle>
                              <CardDescription>
                                Total: {questionData.count} votos • Promedio: {questionData.averageRating.toFixed(2)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-xl border p-4 bg-white shadow-sm">
                                <ReactECharts 
                                  option={chartOption} 
                                  style={{ height: 350 }} 
                                />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Gráficos individuales por speaker agrupados por fecha */}
        {data.surveys.speakerVotesByDay && data.surveys.speakerVotesByDay.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <Mic className="h-6 w-6 text-[#FD0233]" />
              <h3 className="text-2xl font-bold text-primary">Gráficos Individuales por Speaker</h3>
            </div>
            
            {data.surveys.speakerVotesByDay
              .sort((a, b) => a.day - b.day)
              .map((dayData) => (
                <div key={dayData.day} className="space-y-4">
                  <div className="bg-[#FD0233] text-white rounded-lg p-4">
                    <h4 className="text-xl font-bold">
                      Día {dayData.day} - {dayData.dayDate}
                    </h4>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    {dayData.speakers
                      .sort((a, b) => b.count - a.count) // Ordenar por cantidad de votos (descendente)
                      .map((speakerData, idx) => {
                        // Calcular distribución de calificaciones para este speaker en este día
                        const ratingDistribution: Record<number, number> = {};
                        speakerData.votes.forEach(vote => {
                          ratingDistribution[vote.rating] = (ratingDistribution[vote.rating] || 0) + 1;
                        });

                        const ratingEntries = Object.entries(ratingDistribution)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([rating, count]) => ({ rating: parseInt(rating), count }));

                        const chartOption = {
                          title: {
                            text: speakerData.speaker.length > 60 
                              ? speakerData.speaker.substring(0, 60) + '...' 
                              : speakerData.speaker,
                            left: "center",
                            textStyle: { fontSize: 14, fontWeight: "bold" },
                          },
                          tooltip: {
                            trigger: "axis",
                            axisPointer: { type: "shadow" },
                            formatter: (params: any) => {
                              const param = Array.isArray(params) ? params[0] : params;
                              return `Calificación ${param.name}<br/>Cantidad: ${param.value}`;
                            },
                          },
                          xAxis: {
                            type: "category",
                            data: ratingEntries.map(e => e.rating.toString()),
                            name: "Calificación",
                          },
                          yAxis: {
                            type: "value",
                            name: "Cantidad de Votos",
                          },
                          series: [
                            {
                              name: "Votos",
                              type: "bar",
                              data: ratingEntries.map(e => ({
                                value: e.count,
                                itemStyle: {
                                  color: (() => {
                                    // Colores diferentes según la calificación
                                    if (e.rating >= 8) return "#10b981"; // Verde para altos
                                    if (e.rating >= 6) return "#f59e0b"; // Amarillo para medios
                                    return "#ef4444"; // Rojo para bajos
                                  })()
                                }
                              })),
                              label: { 
                                show: true, 
                                position: "top",
                              },
                            },
                          ],
                          grid: {
                            left: "15%",
                            right: "10%",
                            bottom: "15%",
                            top: "20%",
                          },
                        };

                        return (
                          <Card key={idx}>
                            <CardHeader>
                              <CardTitle className="text-base">
                                {speakerData.speaker.length > 80 
                                  ? speakerData.speaker.substring(0, 80) + '...' 
                                  : speakerData.speaker}
                              </CardTitle>
                              <CardDescription>
                                Total: {speakerData.count} votos • Promedio: {speakerData.averageRating.toFixed(2)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-xl border p-4 bg-white shadow-sm">
                                <ReactECharts 
                                  option={chartOption} 
                                  style={{ height: 350 }} 
                                />
                              </div>
                              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded bg-[#10b981]"></div>
                                  <span>Calificación ≥ 8</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded bg-[#f59e0b]"></div>
                                  <span>Calificación 6-7.9</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded bg-[#ef4444]"></div>
                                  <span>Calificación &lt; 6</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}

      </div>

      {/* Respuestas con Texto */}
      {data.surveys.responsesWithTextDetail && data.surveys.responsesWithTextDetail.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Respuestas con Texto</CardTitle>
                <CardDescription>
                  Detalle de todas las respuestas que incluyen comentarios o texto adicional
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg font-bold">
                {data.surveys.responsesWithTextDetail.length} respuestas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead>Pregunta</TableHead>
                    <TableHead>Pregunta #</TableHead>
                    <TableHead>Calificación</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comentario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.surveys.responsesWithTextDetail.map((response, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {response.userName || 'Sin nombre'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-semibold">Día {response.day}</div>
                          <div className="text-xs text-muted-foreground">{response.dayDate}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <p className="truncate" title={response.questionType}>
                          {response.questionType}
                        </p>
                      </TableCell>
                      <TableCell>{response.questionNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-lg font-bold">
                          {response.rating}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {response.submittedAt
                          ? format(
                              typeof response.submittedAt === 'string'
                                ? parseISO(response.submittedAt)
                                : new Date(response.submittedAt),
                              "dd/MM/yyyy HH:mm",
                              { locale: es }
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm whitespace-pre-wrap break-words" title={response.textResponse}>
                          {response.textResponse}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección de Encuestas - Análisis Detallado */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#10b981]" />
          <h3 className="text-2xl font-bold text-primary">Análisis Detallado de Encuestas</h3>
        </div>

        {/* Métricas de encuestas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{data.surveys.averageRating.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
                Mín: {data.surveys.minRating} • Máx: {data.surveys.maxRating}
            </p>
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Respuestas con Texto</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.surveys.responsesWithText}</div>
              <p className="text-xs text-muted-foreground">
                {data.surveys.totalResponses > 0 
                  ? ((data.surveys.responsesWithText / data.surveys.totalResponses) * 100).toFixed(1)
                  : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tipos de Pregunta</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.surveys.byQuestionType.length}</div>
              <p className="text-xs text-muted-foreground">Diferentes categorías</p>
          </CardContent>
        </Card>
      </div>

        {/* Gráficos de encuestas */}
      <div className="grid gap-6 lg:grid-cols-2">
          {(filteredRatingDistributionOption || ratingDistributionOption) && (
        <Card>
          <CardHeader>
                <CardTitle>
                  {selectedRating === "all" 
                    ? "Distribución de Calificaciones" 
                    : `Calificación ${selectedRating}`}
                </CardTitle>
                <CardDescription>
                  {selectedRating === "all" 
                    ? "Frecuencia de cada calificación"
                    : `Respuestas con calificación ${selectedRating}`}
                </CardDescription>
          </CardHeader>
              <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                  <ReactECharts 
                    option={filteredRatingDistributionOption || ratingDistributionOption} 
                    style={{ height: 350 }}
                    onChartReady={(chart) => {
                      ratingDistributionChartRef.current = chart;
                    }}
                  />
              </div>
              </CardContent>
            </Card>
          )}

          {(filteredSurveyByDayOption || surveyByDayOption) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDay === "all" ? "Encuestas por Día" : `Encuestas - Día ${selectedDay}`}
                </CardTitle>
                <CardDescription>
                  {selectedDay === "all" 
                    ? "Distribución de respuestas por día del evento"
                    : `Respuestas del día ${selectedDay}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                  <ReactECharts 
                    option={filteredSurveyByDayOption || surveyByDayOption} 
                    style={{ height: 350 }}
                    onChartReady={(chart) => {
                      surveyByDayChartRef.current = chart;
                    }}
                  />
              </div>
              </CardContent>
            </Card>
          )}

          {surveyByDateOption && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Encuestas por Fecha de Envío</CardTitle>
                <CardDescription>Evolución temporal de respuestas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border p-4 bg-white shadow-sm">
                  <ReactECharts 
                    option={surveyByDateOption} 
                    style={{ height: 350 }}
                    onChartReady={(chart) => {
                      surveyByDateChartRef.current = chart;
                    }}
                  />
                </div>
          </CardContent>
        </Card>
          )}
        </div>

        {/* Tablas de datos detallados */}
        <div className="grid gap-6 lg:grid-cols-2">
          {data.surveys.byQuestionType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen por Pregunta</CardTitle>
                <CardDescription>Estadísticas por pregunta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.surveys.byQuestionType.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{item.type}</p>
                        <p className="text-sm text-muted-foreground">{item.count} respuestas</p>
                      </div>
                      <Badge variant="outline" className="text-lg font-bold">
                        {item.averageRating.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.surveys.topActiveUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Usuarios Más Participativos</CardTitle>
                <CardDescription>Usuarios con más respuestas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.surveys.topActiveUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{user.userName || 'Sin nombre'}</p>
                      </div>
                      <Badge variant="outline" className="text-lg font-bold">
                        {user.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Gráficos de usuarios */}
      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Preguntas</CardTitle>
            <CardDescription>Distribución por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{data.questions.approved}</div>
                  <div className="text-xs text-muted-foreground">Aprobadas</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold">{data.questions.pending}</div>
                  <div className="text-xs text-muted-foreground">Pendientes</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{data.questions.answered}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{data.questions.unanswered}</div>
                  <div className="text-xs text-muted-foreground">Sin Responder</div>
                </div>
              </div>
            </div>
            {questionStatusOption && (
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <ReactECharts 
                  option={questionStatusOption} 
                  style={{ height: 350 }}
                  onChartReady={(chart) => {
                    questionStatusChartRef.current = chart;
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usuarios sin votaciones */}
      {data.users.withoutVotes && data.users.withoutVotes.length > 0 && (
          <Card>
            <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usuarios sin Participación en Votaciones</CardTitle>
                <CardDescription>
                  Lista de usuarios registrados que no han participado en ninguna encuesta
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg font-bold">
                {data.users.withoutVotesCount} usuarios
              </Badge>
            </div>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>ID Médico</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.withoutVotes.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{user.medicalId}</TableCell>
                      <TableCell>{user.city}</TableCell>
                      <TableCell>{user.specialty}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="destructive">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">Usuario</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.lastLogin
                          ? format(
                              typeof user.lastLogin === 'string'
                                ? parseISO(user.lastLogin)
                                : new Date(user.lastLogin),
                              "dd/MM/yyyy HH:mm",
                              { locale: es }
                            )
                          : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.createdAt
                          ? format(
                              typeof user.createdAt === 'string'
                                ? parseISO(user.createdAt)
                                : new Date(user.createdAt),
                              "dd/MM/yyyy",
                              { locale: es }
                            )
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Tabs para navegar por días */}
      {data.surveys.speakerVotesByDay && data.surveys.speakerVotesByDay.length > 0 && (
          <Card>
            <CardHeader>
            <CardTitle>Votaciones por Día</CardTitle>
            <CardDescription>Detalle de votaciones de speakers y preguntas organizadas por día</CardDescription>
            </CardHeader>
            <CardContent>
            <Tabs defaultValue={`day-${data.surveys.speakerVotesByDay[0]?.day || 1}`} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto mb-6 gap-2 bg-transparent p-0">
                {data.surveys.speakerVotesByDay.map((dayData) => (
                  <TabsTrigger
                    key={dayData.day}
                    value={`day-${dayData.day}`}
                    className="text-sm sm:text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md data-[state=active]:bg-[#2E61FA] data-[state=active]:text-white data-[state=active]:shadow-md py-2 px-3"
                  >
                    Día {dayData.day}
                  </TabsTrigger>
                ))}
              </TabsList>

              {data.surveys.speakerVotesByDay.map((dayData) => (
                <TabsContent key={dayData.day} value={`day-${dayData.day}`} className="space-y-6 mt-0">
                  {/* Encabezado del día */}
                  <div className="bg-[#2E61FA] text-white rounded-lg p-4">
                    <h4 className="text-xl font-bold">
                      Día {dayData.day} - {dayData.dayDate}
                    </h4>
      </div>

                  {/* Votaciones por Speaker */}
                  {dayData.speakers && dayData.speakers.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="text-lg font-bold text-primary">Votaciones por Speaker</h5>
                      
                      {dayData.speakers.map((speakerData, idx) => (
                        <Card key={idx}>
        <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{speakerData.speaker}</CardTitle>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-base font-bold">
                                  Promedio: {speakerData.averageRating.toFixed(2)}
                                </Badge>
                                <Badge variant="outline" className="text-base">
                                  {speakerData.count} votos
                                </Badge>
                              </div>
                            </div>
                            <CardDescription>
                              Mín: {speakerData.minRating} • Máx: {speakerData.maxRating} • Mediana: {speakerData.medianRating.toFixed(2)}
                            </CardDescription>
        </CardHeader>
        <CardContent>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Pregunta</TableHead>
                                    <TableHead>Pregunta #</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Comentario</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {speakerData.votes.map((vote, voteIdx) => (
                                    <TableRow key={voteIdx}>
                                      <TableCell className="font-medium">
                                        {vote.userName || 'Sin nombre'}
                                        <br />
                                        <span className="text-xs text-muted-foreground">
                                          {vote.userId ? `${vote.userId.substring(0, 20)}...` : 'Anónimo'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-sm max-w-xs">
                                        <p className="truncate" title={vote.questionType}>
                                          {vote.questionType}
                                        </p>
                                      </TableCell>
                                      <TableCell>{vote.questionNumber}</TableCell>
                                      <TableCell className="text-sm">
                                        {vote.submittedAt
                                          ? format(
                                              typeof vote.submittedAt === 'string' 
                                                ? parseISO(vote.submittedAt) 
                                                : new Date(vote.submittedAt),
                                              "dd/MM/yyyy HH:mm",
                                              { locale: es }
                                            )
                                          : '-'}
                                      </TableCell>
                                      <TableCell className="max-w-xs">
                                        {vote.textResponse ? (
                                          <p className="text-sm truncate" title={vote.textResponse}>
                                            {vote.textResponse}
                                          </p>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">Sin comentario</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
              </div>
                          </CardContent>
                        </Card>
                      ))}
            </div>
                  )}

                  {/* Votaciones por Tipo de Pregunta */}
                  {data.surveys.questionVotesByDay && 
                   data.surveys.questionVotesByDay.find(q => q.day === dayData.day)?.questionTypes &&
                   data.surveys.questionVotesByDay.find(q => q.day === dayData.day)!.questionTypes.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="text-lg font-bold text-primary">Votaciones por Pregunta</h5>
                      
                      {data.surveys.questionVotesByDay
                        .find(q => q.day === dayData.day)!
                        .questionTypes.map((questionData, idx) => (
                          <Card key={idx}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{questionData.questionType}</CardTitle>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-base font-bold">
                                    Promedio: {questionData.averageRating.toFixed(2)}
                                  </Badge>
                                  <Badge variant="outline" className="text-base">
                                    {questionData.count} votos
                                  </Badge>
              </div>
            </div>
                              <CardDescription>
                                Mín: {questionData.minRating} • Máx: {questionData.maxRating} • Mediana: {questionData.medianRating.toFixed(2)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Usuario</TableHead>
                                      <TableHead>Calificación</TableHead>
                                      <TableHead>Speaker</TableHead>
                                      <TableHead>Pregunta #</TableHead>
                                      <TableHead>Fecha</TableHead>
                                      <TableHead>Comentario</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {questionData.votes.map((vote, voteIdx) => (
                                      <TableRow key={voteIdx}>
                                        <TableCell className="font-medium">
                                          {vote.userName || 'Sin nombre'}
                                          <br />
                                          <span className="text-xs text-muted-foreground">
                                            {vote.userId.substring(0, 20)}...
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-lg font-bold">
                                            {vote.rating}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {vote.speakerName || '-'}
                                        </TableCell>
                                        <TableCell>{vote.questionNumber}</TableCell>
                                        <TableCell className="text-sm">
                                          {vote.submittedAt
                                            ? format(
                                                typeof vote.submittedAt === 'string' 
                                                  ? parseISO(vote.submittedAt) 
                                                  : new Date(vote.submittedAt),
                                                "dd/MM/yyyy HH:mm",
                                                { locale: es }
                                              )
                                            : '-'}
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                          {vote.textResponse ? (
                                            <p className="text-sm truncate" title={vote.textResponse}>
                                              {vote.textResponse}
                                            </p>
                                          ) : (
                                            <span className="text-muted-foreground text-xs">Sin comentario</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
              </div>
                            </CardContent>
                          </Card>
                        ))}
            </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

