"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useMongoCollection } from "@/hooks/use-mongodb-collection";
import { QRCodeViewer } from "@/components/qr-code-viewer";
import { DownloadCloud, FileText, Filter, Users, MessageSquare, TrendingUp, BarChart3, Award, Target } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "echarts-gl";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });


interface SurveyStatsViewProps {
  compact?: boolean;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  questionId: string;
  userId?: string;
  userName?: string;
  day: number;
  dayDate: string; // Fecha del evento en formato yyyy-mm-dd
  questionNumber: number;
  questionType: string;
  speakerName?: string;
  rating: number;
  textResponse?: string;
  submittedAt: string | Date; // Fecha/hora de votación
}

interface SurveyQuestion {
  id: string;
  survey_id: string;
  day: number;
  date: string;
  question_number: number;
  question_type: string;
  question_text: string;
  scale: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
  speakers?: Array<{
    name: string;
    specialty: string;
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  medicalId: string;
  isAdmin?: boolean;
}

// Función para normalizar dayDate (string yyyy-mm-dd) para evitar variaciones
const normalizeDayDate = (dayDate: string): string => {
  try {
    // Asegurar formato yyyy-mm-dd sin variaciones de tiempo
    const date = new Date(dayDate + "T00:00:00");
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return dayDate;
  }
};

// Función para convertir dayDate (string yyyy-mm-dd) a Date para ordenamiento
const parseDayDate = (dayDate: string): Date => {
  try {
    const normalized = normalizeDayDate(dayDate);
    return new Date(normalized + "T00:00:00");
  } catch {
    return new Date();
  }
};

// Función para formatear fecha del evento (dayDate)
const formatDateString = (dayDate: string): string => {
  try {
    const date = parseDayDate(dayDate);
    return date.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dayDate;
  }
};

// Función para extraer solo la fecha de submittedAt (yyyy-mm-dd)
const extractDateFromSubmittedAt = (submittedAt: string | Date): string => {
  try {
    const date = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate() + 1).padStart(2, "0"); // sumamos 1 para que sea el día siguiente
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

// Función para formatear fecha de votación
const formatVotingDate = (submittedAt: string | Date): string => {
  try {
    const date = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
    return date.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return typeof submittedAt === "string" ? submittedAt : "";
  }
};

const formatAverage = (value: number, max?: number) => {
  return `${value.toFixed(1)}${max ? ` / ${max}` : ""}`;
};

// Gráfico de votos por conferencista agrupado por día
const buildSpeakerVotesByDayOption = (responses: SurveyResponse[], questionMap: Map<string, SurveyQuestion>) => {
  if (responses.length === 0) return null;

  const conferenceResponses = responses.filter((r) => r.questionType === "conference_rating" && r.speakerName);
  if (conferenceResponses.length === 0) return null;

  const speakerDataMap = new Map<string, { speakerName: string; specialty: string; byDay: Map<number, SurveyResponse[]> }>();

  conferenceResponses.forEach((r) => {
    if (r.speakerName) {
      if (!speakerDataMap.has(r.speakerName)) {
        const question = questionMap.get(r.questionId);
        const specialty = question?.speakers?.find((s) => s.name === r.speakerName)?.specialty || "";
        speakerDataMap.set(r.speakerName, {
          speakerName: r.speakerName,
          specialty,
          byDay: new Map(),
        });
      }
      const speaker = speakerDataMap.get(r.speakerName)!;
      if (!speaker.byDay.has(r.day)) {
        speaker.byDay.set(r.day, []);
      }
      speaker.byDay.get(r.day)!.push(r);
    }
  });

  const speakerNames = Array.from(speakerDataMap.keys());
  const days = Array.from(new Set(conferenceResponses.map((r) => r.day))).sort();

  const colors = ["#2E61FA", "#FD0233", "#10b981", "#f59e0b"];
  const series = days.map((day, dayIndex) => {
    const data = speakerNames.map((speakerName) => {
      const speaker = speakerDataMap.get(speakerName)!;
      const dayResponses = speaker.byDay.get(day) || [];
      return dayResponses.length;
    });

    return {
      name: `Día ${day}`,
      type: "bar",
      data: data,
      itemStyle: {
        color: colors[dayIndex % colors.length],
      },
      label: {
        show: true,
        position: "top",
        formatter: "{c}",
        fontSize: 10,
      },
    };
  });

  const speakerLabels = speakerNames.map((speakerName) => {
    const speaker = speakerDataMap.get(speakerName)!;
    const totalVotes = Array.from(speaker.byDay.values()).reduce((acc, dayResponses) => acc + dayResponses.length, 0);
    const label = speakerName.length > 30 ? speakerName.substring(0, 30) + "..." : speakerName;
    return `${label}`;
  });

  const speakerTooltipMap = new Map<string, { fullName: string; specialty: string; totalVotes: number; byDay: Map<number, number> }>();
  speakerNames.forEach((speakerName) => {
    const speaker = speakerDataMap.get(speakerName)!;
    const byDayCounts = new Map<number, number>();
    speaker.byDay.forEach((dayResponses, day) => {
      byDayCounts.set(day, dayResponses.length);
    });
    speakerTooltipMap.set(speakerName, {
      fullName: speakerName,
      specialty: speaker.specialty,
      totalVotes: Array.from(speaker.byDay.values()).reduce((acc, dayResponses) => acc + dayResponses.length, 0),
      byDay: byDayCounts,
    });
  });

  const total = conferenceResponses.length;

  return {
    title: {
      text: "Votos por Conferencista Agrupados por Día",
      left: "center",
      textStyle: { fontSize: 16, fontWeight: "bold" },
      subtext: `Total de respuestas: ${total}`,
      subtextStyle: { fontSize: 12, color: "#666" },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const speakerIndex = params[0].dataIndex;
        const speakerName = speakerNames[speakerIndex];
        const tooltipInfo = speakerTooltipMap.get(speakerName);

        let result = `<div style="padding: 8px;"><strong>${tooltipInfo?.fullName || params[0].name}</strong>`;
        if (tooltipInfo?.specialty) {
          result += `<br/><small>${tooltipInfo.specialty}</small>`;
        }
        result += `<br/><small>Total: ${tooltipInfo?.totalVotes || 0} votos</small><br/><hr style="margin: 4px 0;"/>`;

        params.forEach((param: any) => {
          const percentage = total > 0 ? ((param.value / total) * 100).toFixed(1) : "0";
          result += `${param.seriesName}: <strong>${param.value}</strong> votos (${percentage}%)<br/>`;
        });
        result += `</div>`;
        return result;
      },
    },
    legend: {
      data: days.map((day) => `Día ${day}`),
      top: 30,
    },
    grid: {
      left: "20%",
      right: "10%",
      top: "20%",
      bottom: "10%",
    },
    xAxis: {
      type: "category",
      data: speakerLabels,
      axisLabel: {
        interval: 0,
        rotate: 45,
        fontSize: 9,
      },
    },
    yAxis: {
      type: "value",
      name: "Cantidad de Votos",
      nameLocation: "middle",
      nameGap: 50,
    },
    series: series,
  };
};

// Mapa de dispersión por fecha de evento (dayDate) normalizado
const buildScatterOption = (responses: SurveyResponse[], questions: SurveyQuestion[], selectedDayDate: string) => {
  const dayResponses = responses.filter((r) => normalizeDayDate(r.dayDate) === normalizeDayDate(selectedDayDate) && r.questionType === "conference_rating" && r.speakerName);
  if (dayResponses.length === 0) return null;

  const questionMap = new Map<string, SurveyQuestion>();
  questions.forEach((q) => questionMap.set(q.id, q));

  const speakers = new Set<string>();
  const speakerSpecialties = new Map<string, string>();
  dayResponses.forEach((r) => {
    if (r.speakerName) {
      speakers.add(r.speakerName);
      const question = questionMap.get(r.questionId);
      if (question?.speakers) {
        const speakerInfo = question.speakers.find((s) => s.name === r.speakerName);
        if (speakerInfo) {
          speakerSpecialties.set(r.speakerName, speakerInfo.specialty);
        }
      }
    }
  });

  const speakerArray = Array.from(speakers);
  const colors = ["#2E61FA", "#FD0233", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const series = speakerArray.map((speaker, index) => {
    const speakerResponses = dayResponses.filter((r) => r.speakerName === speaker);
    const data = speakerResponses.map((r, idx) => [idx, r.rating]);

    return {
      name: speaker,
      type: "scatter",
      data: data,
      symbolSize: 8,
      itemStyle: {
        color: colors[index % colors.length],
      },
    };
  });

  const total = dayResponses.length;

  return {
    title: {
      text: "Mapa de Dispersión de Calificaciones",
      left: "center",
      textStyle: { fontSize: 16, fontWeight: "bold" },
      subtext: `Fecha: ${formatDateString(selectedDayDate)} | Total: ${total} respuestas`,
      subtextStyle: { fontSize: 12, color: "#666" },
    },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        const specialty = speakerSpecialties.get(params.seriesName) || "";
        return `${params.seriesName}${specialty ? ` (${specialty})` : ""}<br/>Índice: ${params.value[0]}<br/>Calificación: ${params.value[1]}/10`;
      },
    },
    legend: {
      data: speakerArray,
      top: 40,
    },
    xAxis: {
      type: "value",
      name: "Índice de Respuesta",
      nameLocation: "middle",
      nameGap: 30,
    },
    yAxis: {
      type: "value",
      name: "Calificación",
      min: 0,
      max: 10,
      nameLocation: "middle",
      nameGap: 50,
    },
    series: series,
  };
};

// Diagrama de tendencia por tiempo usando submittedAt (día de votación)
const buildTrendOption = (responses: SurveyResponse[]) => {
  if (responses.length === 0) return null;

  // Agrupar por fecha de votación (submittedAt) y ordenar por fecha
  const byVotingDate = new Map<string, SurveyResponse[]>();
  responses.forEach((r) => {
    const votingDate = extractDateFromSubmittedAt(r.submittedAt);
    if (!byVotingDate.has(votingDate)) byVotingDate.set(votingDate, []);
    byVotingDate.get(votingDate)!.push(r);
  });

  const sortedDates = Array.from(byVotingDate.keys()).sort((a, b) => {
    return parseDayDate(a).getTime() - parseDayDate(b).getTime();
  });

  const dateLabels = sortedDates.map((d) => formatVotingDate(d));
  const ratings = sortedDates.map((date) => {
    const dayResponses = byVotingDate.get(date)!;
    return dayResponses.length > 0
      ? dayResponses.reduce((acc, r) => acc + r.rating, 0) / dayResponses.length
      : 0;
  });

  const total = responses.length;
  const responseCounts = sortedDates.map((date) => byVotingDate.get(date)!.length);

  return {
    title: {
      text: "Tendencia de Calificaciones por Día de Votación",
      left: "center",
      textStyle: { fontSize: 16, fontWeight: "bold" },
      subtext: `Total: ${total} respuestas`,
      subtextStyle: { fontSize: 12, color: "#666" },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const point = params[0];
        const count = responseCounts[point.dataIndex];
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
        return `${point.name}<br/>Promedio: ${point.value.toFixed(2)}<br/>Respuestas: ${count} (${percentage}%)`;
      },
    },
    legend: {
      data: ["Promedio Calificación", "Cantidad Respuestas"],
      top: 30,
    },
    xAxis: {
      type: "category",
      data: dateLabels,
      axisLabel: { rotate: 45 },
    },
    yAxis: [
      {
        type: "value",
        name: "Calificación",
        min: 0,
        max: 10,
        position: "left",
      },
      {
        type: "value",
        name: "Cantidad",
        position: "right",
      },
    ],
    series: [
      {
        name: "Promedio Calificación",
        type: "line",
        data: ratings,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#2E61FA", width: 2 },
        itemStyle: { color: "#2E61FA" },
        yAxisIndex: 0,
      },
      {
        name: "Cantidad Respuestas",
        type: "bar",
        data: responseCounts,
        itemStyle: { color: "#FD0233", opacity: 0.6 },
        yAxisIndex: 1,
      },
    ],
  };
};

// Diagrama dona por votantes en cada día de votación (submittedAt)
const buildDonutByDayOption = (responses: SurveyResponse[], questions: SurveyQuestion[]) => {
  const byVotingDate = new Map<string, SurveyResponse[]>();
  responses.forEach((r) => {
    const votingDate = extractDateFromSubmittedAt(r.submittedAt);
    if (!byVotingDate.has(votingDate)) byVotingDate.set(votingDate, []);
    byVotingDate.get(votingDate)!.push(r);
  });

  const sortedDates = Array.from(byVotingDate.keys()).sort((a, b) => {
    return parseDayDate(a).getTime() - parseDayDate(b).getTime();
  });

  const dateLabels = sortedDates.map((d) => formatVotingDate(d));
  const dayCounts = sortedDates.map((date) => {
    const dayResponses = byVotingDate.get(date)!;
    const uniqueUsers = new Set(dayResponses.map((r) => r.userId).filter(Boolean));
    return uniqueUsers.size;
  });

  const total = dayCounts.reduce((acc, val) => acc + val, 0);

  return {
    title: {
      text: "Distribución de Votantes por Fecha",
      left: "center",
      textStyle: { fontSize: 16, fontWeight: "bold" },
      subtext: `Total votantes únicos: ${total}`,
      subtextStyle: { fontSize: 12, color: "#666" },
    },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        const percentage = total > 0 ? ((params.value / total) * 100).toFixed(1) : "0";
        return `${params.name}<br/>Votantes: ${params.value}<br/>Porcentaje: ${percentage}%`;
      },
    },
    legend: {
      orient: "vertical",
      left: "left",
      top: "middle",
    },
    series: [
      {
        name: "Votantes",
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
        data: dateLabels.map((label, index) => ({
          value: dayCounts[index],
          name: label,
        })),
      },
    ],
  };
};

// Gráfico de votos por pregunta agrupado por día
// Gráfico de distribución de puntuaciones por pregunta y día
const buildQuestionRatingDistributionOption = (questionId: string, questionText: string, day: number, responses: SurveyResponse[]) => {
  // Filtrar respuestas de esta pregunta y día específicos
  const questionResponses = responses.filter(
    (r) => r.questionId === questionId && r.day === day
  );

  if (questionResponses.length === 0) {
    return null;
  }

  // Contar las puntuaciones (asumiendo escala 1-10)
  const ratingCounts = new Map<number, number>();
  for (let i = 1; i <= 10; i++) {
    ratingCounts.set(i, 0);
  }

  questionResponses.forEach((r) => {
    const rating = Math.round(r.rating);
    if (rating >= 1 && rating <= 10) {
      ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1);
    }
  });

  const ratings = Array.from({ length: 10 }, (_, i) => i + 1);
  const counts = ratings.map((r) => ratingCounts.get(r) || 0);
  const totalVotes = questionResponses.length;

  return {
    title: {
      text: `Pregunta ${questionResponses[0]?.questionNumber || ""} - Día ${day}`,
      left: "center",
      textStyle: {
        fontSize: 14,
        fontWeight: "bold",
      },
      subtext: questionText.length > 60 ? questionText.substring(0, 60) + "..." : questionText,
      subtextStyle: {
        fontSize: 10,
        color: "#666",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: (params: any) => {
        const param = params[0];
        const value = param.value;
        const percentage = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : 0;
        return `${param.name}: ${value} votos (${percentage}%)<br/>Total: ${totalVotes} votos`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: ratings.map((r) => r.toString()),
      name: "Puntuación",
      nameLocation: "middle",
      nameGap: 30,
    },
    yAxis: {
      type: "value",
      name: "Cantidad de Votos",
      nameLocation: "middle",
      nameGap: 50,
    },
    series: [
      {
        name: "Votos",
        type: "bar",
        data: counts,
        itemStyle: {
          color: "#2E61FA",
        },
        label: {
          show: true,
          position: "top",
          formatter: "{c}",
          fontSize: 10,
        },
      },
    ],
  };
};

const buildQuestionVotesByDayOption = (responses: SurveyResponse[], questionMap: Map<string, SurveyQuestion>) => {
  if (responses.length === 0) return null;

  // Obtener todas las preguntas únicas desde SurveyResponse
  const questionDataMap = new Map<string, { questionText: string; questionType: string; byDay: Map<number, SurveyResponse[]> }>();
  
  responses.forEach((r) => {
    if (!questionDataMap.has(r.questionId)) {
      const question = questionMap.get(r.questionId);
      questionDataMap.set(r.questionId, {
        questionText: question?.question_text || `Pregunta ${r.questionNumber} (${r.questionType})`,
        questionType: r.questionType,
        byDay: new Map(),
      });
    }
    const question = questionDataMap.get(r.questionId)!;
    if (!question.byDay.has(r.day)) {
      question.byDay.set(r.day, []);
    }
    question.byDay.get(r.day)!.push(r);
  });

  const questionIds = Array.from(questionDataMap.keys());
  const days = Array.from(new Set(responses.map((r) => r.day))).sort();
  
  // Preparar datos para el gráfico de barras agrupadas
  const colors = ["#2E61FA", "#FD0233", "#10b981", "#f59e0b"];
  const series = days.map((day, dayIndex) => {
    const data = questionIds.map((questionId) => {
      const question = questionDataMap.get(questionId)!;
      const dayResponses = question.byDay.get(day) || [];
      return dayResponses.length;
    });

    return {
      name: `Día ${day}`,
      type: "bar",
      data: data,
      itemStyle: {
        color: colors[dayIndex % colors.length],
      },
      label: {
        show: true,
        position: "top",
        formatter: "{c}",
        fontSize: 10,
      },
    };
  });

  const questionLabels = questionIds.map((questionId) => {
    const question = questionDataMap.get(questionId)!;
    const totalVotes = Array.from(question.byDay.values()).reduce((acc, dayResponses) => acc + dayResponses.length, 0);
    // Mostrar el número de pregunta y tipo, truncar si es muy largo
    const label = question.questionText.length > 50 
      ? question.questionText.substring(0, 50) + "..." 
      : question.questionText;
    return `${label}`;
  });
  
  // Crear un mapa para tooltips con información completa
  const questionTooltipMap = new Map<string, { fullText: string; totalVotes: number; byDay: Map<number, number> }>();
  questionIds.forEach((questionId) => {
    const question = questionDataMap.get(questionId)!;
    const byDayCounts = new Map<number, number>();
    question.byDay.forEach((dayResponses, day) => {
      byDayCounts.set(day, dayResponses.length);
    });
    questionTooltipMap.set(questionId, {
      fullText: question.questionText,
      totalVotes: Array.from(question.byDay.values()).reduce((acc, dayResponses) => acc + dayResponses.length, 0),
      byDay: byDayCounts,
    });
  });

  const total = responses.length;

  return {
    title: {
      text: "Votos por Pregunta Agrupados por Día",
      left: "center",
      textStyle: { fontSize: 16, fontWeight: "bold" },
      subtext: `Total de respuestas: ${total}`,
      subtextStyle: { fontSize: 12, color: "#666" },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const questionIndex = params[0].dataIndex;
        const questionId = questionIds[questionIndex];
        const tooltipInfo = questionTooltipMap.get(questionId);
        
        let result = `<div style="padding: 8px;"><strong>${tooltipInfo?.fullText || params[0].name}</strong><br/>`;
        result += `<small>Total: ${tooltipInfo?.totalVotes || 0} votos</small><br/><hr style="margin: 4px 0;"/>`;
        
        params.forEach((param: any) => {
          const percentage = total > 0 ? ((param.value / total) * 100).toFixed(1) : "0";
          result += `${param.seriesName}: <strong>${param.value}</strong> votos (${percentage}%)<br/>`;
        });
        result += `</div>`;
        return result;
      },
    },
    legend: {
      data: days.map((day) => `Día ${day}`),
      top: 30,
    },
    grid: {
      left: "20%",
      right: "10%",
      top: "20%",
      bottom: "10%",
    },
    xAxis: {
      type: "category",
      data: questionLabels,
      axisLabel: {
        interval: 0,
        rotate: 45,
        fontSize: 9,
      },
    },
    yAxis: {
      type: "value",
      name: "Cantidad de Votos",
      nameLocation: "middle",
      nameGap: 50,
    },
    series: series,
  };
};

const exportToPDF = (
  responses: SurveyResponse[],
  questions: SurveyQuestion[],
  overallStats: { registeredUsers: number; votingUsers: number; totalResponses: number; averageRating: number; participationRate: number },
  questionMap: Map<string, SurveyQuestion>,
  chartImages?: {
    questionVotes?: string;
    speakerVotes?: string;
    donutChart?: string;
    scatterChart?: string;
    trendChart?: string;
    questionRatingDistributions?: Array<{ questionId: string; questionText: string; day: number; image: string }>;
  }
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Función helper para agregar imágenes al PDF
  const addImageToPDF = (imageDataUrl: string | undefined, title: string, maxHeight: number = 80) => {
    if (!imageDataUrl) return false;
    
    try {
      checkPageBreak(maxHeight + 25);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, yPosition);
      yPosition += 8;
      
      // Calcular dimensiones manteniendo aspect ratio
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = maxHeight;
      
      // Agregar imagen (jsPDF ajustará automáticamente manteniendo aspect ratio)
      doc.addImage(imageDataUrl, "PNG", margin, yPosition, imgWidth, imgHeight, undefined, "FAST");
      yPosition += imgHeight + 10;
      
      return true;
    } catch (error) {
      console.error(`Error agregando imagen ${title}:`, error);
      return false;
    }
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE GERENCIAL DE ENCUESTAS", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado el: ${new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN EJECUTIVO", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryData = [
    ["Métrica", "Valor"],
    ["Usuarios Registrados", overallStats.registeredUsers.toString()],
    ["Usuarios que Votaron", overallStats.votingUsers.toString()],
    ["Tasa de Participación", `${overallStats.participationRate.toFixed(1)}%`],
    ["Total de Respuestas", overallStats.totalResponses.toString()],
    ["Calificación Promedio General", `${overallStats.averageRating.toFixed(2)}/10`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    theme: "striped",
    headStyles: { fillColor: [46, 97, 250], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: margin, right: margin },
  });
  yPosition = (doc as any).lastAutoTable.finalY + 10;

  const byDate = new Map<string, SurveyResponse[]>();
  responses.forEach((r) => {
    const normalizedDate = normalizeDayDate(r.dayDate);
    if (!byDate.has(normalizedDate)) byDate.set(normalizedDate, []);
    byDate.get(normalizedDate)!.push(r);
  });

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => {
    return parseDayDate(a).getTime() - parseDayDate(b).getTime();
  });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  checkPageBreak(20);
  doc.text("ESTADÍSTICAS POR FECHA", margin, yPosition);
  yPosition += 8;

  const dayStatsData = [["Fecha", "Participantes", "Respuestas", "Promedio", "NPS"]];
  sortedDates.forEach((dayDate) => {
    const dayResponses = byDate.get(dayDate)!;
    const uniqueUsers = new Set(dayResponses.map((r) => r.userId).filter(Boolean));
    const avgRating = dayResponses.length > 0
      ? dayResponses.reduce((acc, r) => acc + r.rating, 0) / dayResponses.length
      : 0;
    const npsResponses = dayResponses.filter((r) => r.questionType === "recommendation_likelihood");
    const nps = npsResponses.length > 0
      ? ((npsResponses.filter((r) => r.rating >= 9).length - npsResponses.filter((r) => r.rating <= 6).length) / npsResponses.length) * 100
      : 0;

    dayStatsData.push([
      formatDateString(dayDate),
      uniqueUsers.size.toString(),
      dayResponses.length.toString(),
      avgRating.toFixed(2),
      nps.toFixed(1),
    ]);
  });
// Agregar gráficos de distribución de puntuaciones por pregunta
if (chartImages?.questionRatingDistributions && chartImages.questionRatingDistributions.length > 0) {
  checkPageBreak(30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DISTRIBUCIÓN DE PUNTUACIONES POR PREGUNTA", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Gráficos de barras mostrando la distribución de puntuaciones (1-10) para cada pregunta por día", margin, yPosition);
  yPosition += 8;

  // Ordenar por día y luego por número de pregunta
  const sortedDistributions = [...chartImages.questionRatingDistributions].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    const questionA = questionMap.get(a.questionId);
    const questionB = questionMap.get(b.questionId);
    const numA = questionA?.question_number || 0;
    const numB = questionB?.question_number || 0;
    return numA - numB;
  });

  sortedDistributions.forEach((dist) => {
    const question = questionMap.get(dist.questionId);
    const questionNumber = question?.question_number || "";
    
    checkPageBreak(80);
    
    // Título con pregunta completa
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const title = `Pregunta ${questionNumber} - Día ${dist.day}`;
    doc.text(title, margin, yPosition);
    yPosition += 6;

    // Texto completo de la pregunta (puede ser largo, dividirlo en múltiples líneas)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const maxWidth = pageWidth - (margin * 2);
    const questionLines = doc.splitTextToSize(dist.questionText, maxWidth);
    questionLines.forEach((line: string) => {
      if (yPosition + 5 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 3;

    // Agregar imagen del gráfico
    try {
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = 60;
      
      if (yPosition + imgHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.addImage(dist.image, "PNG", margin, yPosition, imgWidth, imgHeight, undefined, "FAST");
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error(`Error agregando imagen de distribución para pregunta ${dist.questionId}:`, error);
      yPosition += 10;
    }
  });
}
  autoTable(doc, {
    startY: yPosition,
    head: [dayStatsData[0]],
    body: dayStatsData.slice(1),
    theme: "striped",
    headStyles: { fillColor: [46, 97, 250], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margin, right: margin },
  });
  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Agregar gráficos si están disponibles
  if (chartImages) {
    checkPageBreak(30);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("GRÁFICOS DE ANÁLISIS", margin, yPosition);
    yPosition += 10;

    // Gráfico de Votos por Pregunta
    if (chartImages.questionVotes) {
      addImageToPDF(chartImages.questionVotes, "Votos por Pregunta", 70);
    }

    // Gráfico de Calificaciones por Conferencista
    if (chartImages.speakerVotes) {
      addImageToPDF(chartImages.speakerVotes, "Calificaciones por Conferencista", 70);
    }

    // Gráfico de Dona (Distribución de Votantes)
    if (chartImages.donutChart) {
      addImageToPDF(chartImages.donutChart, "Distribución de Votantes por Fecha", 60);
    }

    // Gráfico de Dispersión
    if (chartImages.scatterChart) {
      addImageToPDF(chartImages.scatterChart, "Mapa de Dispersión de Calificaciones", 60);
    }

    // Gráfico de Tendencia
    if (chartImages.trendChart) {
      addImageToPDF(chartImages.trendChart, "Tendencia de Calificaciones por Día de Votación", 60);
    }
  }

  const conferenceResponses = responses.filter((r) => r.questionType === "conference_rating" && r.speakerName);
  if (conferenceResponses.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CALIFICACIONES POR CONFERENCISTA Y FECHA", margin, yPosition);
    yPosition += 8;

    const speakers = new Map<string, { responses: SurveyResponse[]; specialty: string }>();
    conferenceResponses.forEach((r) => {
      if (r.speakerName) {
        if (!speakers.has(r.speakerName)) {
          const question = questionMap.get(r.questionId);
          const specialty = question?.speakers?.find((s) => s.name === r.speakerName)?.specialty || "";
          speakers.set(r.speakerName, { responses: [], specialty });
        }
        speakers.get(r.speakerName)!.responses.push(r);
      }
    });

    const speakerStatsData = [["Conferencista", "Especialidad", "Fecha", "Votos", "Promedio", "Mín", "Máx", "Mediana"]];
      speakers.forEach((stats, speakerName) => {
      const byDate = new Map<string, SurveyResponse[]>();
      stats.responses.forEach((r) => {
        const normalizedDate = normalizeDayDate(r.dayDate);
        if (!byDate.has(normalizedDate)) byDate.set(normalizedDate, []);
        byDate.get(normalizedDate)!.push(r);
      });

      byDate.forEach((dayResponses, dayDate) => {
        const ratings = dayResponses.map((r) => r.rating);
        const sum = ratings.reduce((acc, r) => acc + r, 0);
        const avg = sum / ratings.length;
        const sorted = [...ratings].sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

        speakerStatsData.push([
          speakerName,
          stats.specialty,
          formatDateString(dayDate),
          dayResponses.length.toString(),
          avg.toFixed(2),
          Math.min(...ratings).toString(),
          Math.max(...ratings).toString(),
          median.toString(),
        ]);
      });
    });

    autoTable(doc, {
      startY: yPosition,
      head: [speakerStatsData[0]],
      body: speakerStatsData.slice(1),
      theme: "striped",
      headStyles: { fillColor: [46, 97, 250], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2 },
      margin: { left: margin, right: margin },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Calcular estadísticas por pregunta agrupadas por día (similar a questionStatsByDay)
  const questionCounts = new Map<string, { questionId: string; questionText: string; questionType: string; byDay: Map<number, SurveyResponse[]> }>();

  responses.forEach((r) => {
    if (!questionCounts.has(r.questionId)) {
      const question = questionMap.get(r.questionId);
      questionCounts.set(r.questionId, {
        questionId: r.questionId,
        questionText: question?.question_text || `Pregunta ${r.questionNumber} (${r.questionType})`,
        questionType: r.questionType,
        byDay: new Map(),
      });
    }
    const data = questionCounts.get(r.questionId)!;
    if (!data.byDay.has(r.day)) {
      data.byDay.set(r.day, []);
    }
    data.byDay.get(r.day)!.push(r);
  });

  const questionStatsForPDF = Array.from(questionCounts.entries()).map(([questionId, data]) => {
    const byDay = Array.from(data.byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, dayResponses]) => ({
        day,
        count: dayResponses.length,
        average: dayResponses.length > 0
          ? dayResponses.reduce((acc, r) => acc + r.rating, 0) / dayResponses.length
          : 0,
      }));

    const totalVotes = Array.from(data.byDay.values()).reduce((acc, dayResponses) => acc + dayResponses.length, 0);

    return {
      questionId,
      questionText: data.questionText,
      questionType: data.questionType,
      totalVotes,
      byDay,
    };
  });

  checkPageBreak(30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("VOTOS POR PREGUNTA", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Estadísticas de votos agrupadas por día (Día 1 y Día 2)", margin, yPosition);
  yPosition += 8;

  // Crear tabla de votos por pregunta
  const questionVotesData = [["Pregunta", "Día", "Votos", "Promedio", "Total Votos"]];
  
  const filteredQuestionStats = questionStatsForPDF.filter((qStat) => qStat.totalVotes > 0);
  filteredQuestionStats.forEach((qStat) => {
    qStat.byDay.forEach((dayStat) => {
      questionVotesData.push([
        qStat.questionText.substring(0, 50) + (qStat.questionText.length > 50 ? "..." : ""),
        `Día ${dayStat.day}`,
        dayStat.count.toString(),
        dayStat.average.toFixed(2) + "/10",
        qStat.totalVotes.toString(),
      ]);
    });
  });

  if (questionVotesData.length === 1) {
    questionVotesData.push(["No hay datos disponibles", "", "", "", ""]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [questionVotesData[0]],
    body: questionVotesData.slice(1),
    theme: "striped",
    headStyles: { fillColor: [46, 97, 250], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 7, cellPadding: 2 },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
    },
  });
  yPosition = (doc as any).lastAutoTable.finalY + 10;

  

  doc.save(`reporte-encuestas-${Date.now()}.pdf`);
};

export function SurveyStatsView({ compact = false }: SurveyStatsViewProps) {
  const { data: responses, isLoading: isLoadingResponses } = useMongoCollection<SurveyResponse>("/api/surveys/responses");
  const { data: questions, isLoading: isLoadingQuestions } = useMongoCollection<SurveyQuestion>("/api/survey-questions");
  const { data: users, isLoading: isLoadingUsers } = useMongoCollection<User>("/api/users");

  const isLoading = isLoadingResponses || isLoadingUsers;

  // Refs para almacenar las instancias de ECharts
  const questionVotesChartInstance = useRef<any>(null);
  const speakerVotesChartInstance = useRef<any>(null);
  const donutChartInstance = useRef<any>(null);
  const scatterChartInstance = useRef<any>(null);
  const trendChartInstance = useRef<any>(null);
  // Map para almacenar instancias de gráficos de distribución por pregunta-día
  const questionRatingDistributionInstances = useRef<Map<string, any>>(new Map());

  // Obtener fechas únicas de dayDate ordenadas (normalizadas)
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    responses.forEach((r) => dates.add(normalizeDayDate(r.dayDate)));
    return Array.from(dates).sort((a, b) => {
      return parseDayDate(a).getTime() - parseDayDate(b).getTime();
    });
  }, [responses]);

  // Obtener días únicos
  const availableDays = useMemo(() => {
    const days = new Set<number>();
    responses.forEach((r) => days.add(r.day));
    return Array.from(days).sort();
  }, [responses]);

  // Estados para filtros globales
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  useEffect(() => {
    if (availableDates.length && selectedDayDate === null) {
      setSelectedDayDate(availableDates[0]);
    }
  }, [availableDates, selectedDayDate]);

  // Filtrar respuestas según los filtros activos
  const filteredResponses = useMemo(() => {
    let filtered = [...responses];
    if (filterDay !== null) {
      filtered = filtered.filter((r) => r.day === filterDay);
    }
    return filtered;
  }, [responses, filterDay]);

  // Mapear preguntas por ID (desde SurveyResponse y SurveyQuestion)
  const questionMap = useMemo(() => {
    const map = new Map<string, SurveyQuestion>();
    questions.forEach((q) => map.set(q.id, q));
    
    // Agregar preguntas que solo existen en SurveyResponse (sin importar estado)
    responses.forEach((r) => {
      if (!map.has(r.questionId)) {
        map.set(r.questionId, {
          id: r.questionId,
          survey_id: r.surveyId,
          day: r.day,
          date: r.dayDate,
          question_number: r.questionNumber,
          question_type: r.questionType,
          question_text: `Pregunta ${r.questionNumber} (${r.questionType})`,
          scale: { min: 1, max: 10, min_label: "", max_label: "" },
        });
      }
    });
    return map;
  }, [questions, responses]);

  const overallStats = useMemo(() => {
    const registeredUsers = users.filter((u) => !u.isAdmin).length;
    const votingUsers = new Set(filteredResponses.map((r) => r.userId).filter(Boolean));
    const totalResponses = filteredResponses.length;
    const averageRating = filteredResponses.length > 0
      ? filteredResponses.reduce((acc, r) => acc + r.rating, 0) / filteredResponses.length
      : 0;
    const participationRate = registeredUsers > 0 ? (votingUsers.size / registeredUsers) * 100 : 0;

    return {
      registeredUsers,
      votingUsers: votingUsers.size,
      totalResponses,
      averageRating,
      participationRate,
    };
  }, [filteredResponses, users]);

  // Estadísticas por fecha (dayDate) normalizadas usando respuestas filtradas
  const detailedDateStats = useMemo(() => {
    const byDate = new Map<string, SurveyResponse[]>();
    filteredResponses.forEach((r) => {
      const normalizedDate = normalizeDayDate(r.dayDate);
      if (!byDate.has(normalizedDate)) byDate.set(normalizedDate, []);
      byDate.get(normalizedDate)!.push(r);
    });

    const filteredDates = Array.from(byDate.keys()).sort((a, b) => {
      return parseDayDate(a).getTime() - parseDayDate(b).getTime();
    });

    return filteredDates.map((dayDate) => {
      const dayResponses = byDate.get(dayDate) || [];
      const uniqueUsers = new Set(dayResponses.map((r) => r.userId).filter(Boolean));
      const avgRating = dayResponses.length > 0
        ? dayResponses.reduce((acc, r) => acc + r.rating, 0) / dayResponses.length
        : 0;
      const npsResponses = dayResponses.filter((r) => r.questionType === "recommendation_likelihood");
      const promoters = npsResponses.filter((r) => r.rating >= 9).length;
      const detractors = npsResponses.filter((r) => r.rating <= 6).length;
      const nps = npsResponses.length > 0 ? ((promoters - detractors) / npsResponses.length) * 100 : 0;

      return {
        dayDate,
        formattedDate: formatDateString(dayDate),
        uniqueUsers: uniqueUsers.size,
        totalResponses: dayResponses.length,
        averageRating: avgRating,
        nps,
      };
    });
  }, [filteredResponses]);

  // Estadísticas por speaker agrupadas por dayDate (normalizadas) usando respuestas filtradas
  const speakerStats = useMemo(() => {
    const conferenceResponses = filteredResponses.filter((r) => r.questionType === "conference_rating" && r.speakerName);
    const speakers = new Map<string, { responses: SurveyResponse[]; specialty: string; byDate: Map<string, SurveyResponse[]> }>();

    conferenceResponses.forEach((r) => {
      if (r.speakerName) {
        if (!speakers.has(r.speakerName)) {
          const question = questionMap.get(r.questionId);
          const specialty = question?.speakers?.find((s) => s.name === r.speakerName)?.specialty || "";
          speakers.set(r.speakerName, { responses: [], specialty, byDate: new Map() });
        }
        const speaker = speakers.get(r.speakerName)!;
        speaker.responses.push(r);
        const normalizedDate = normalizeDayDate(r.dayDate);
        if (!speaker.byDate.has(normalizedDate)) speaker.byDate.set(normalizedDate, []);
        speaker.byDate.get(normalizedDate)!.push(r);
      }
    });

    // Incluir speakers no votados de las preguntas
    questions.forEach((q) => {
      if (q.question_type === "conference_rating" && q.speakers) {
        q.speakers.forEach((s) => {
          if (!speakers.has(s.name)) {
            speakers.set(s.name, { responses: [], specialty: s.specialty, byDate: new Map() });
          }
        });
      }
    });

    return Array.from(speakers.entries()).map(([name, data]) => {
      const allRatings = data.responses.map((r) => r.rating);
      const avg = allRatings.length > 0 ? allRatings.reduce((acc, r) => acc + r, 0) / allRatings.length : 0;
      const sorted = [...allRatings].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

      return {
        name,
        specialty: data.specialty,
        totalVotes: data.responses.length,
        average: avg,
        median: allRatings.length > 0 ? median : 0,
        min: allRatings.length > 0 ? Math.min(...allRatings) : 0,
        max: allRatings.length > 0 ? Math.max(...allRatings) : 0,
        byDate: Array.from(data.byDate.entries()).map(([dayDate, dayResponses]) => {
          const dayRatings = dayResponses.map((r) => r.rating);
          return {
            dayDate,
            formattedDate: formatDateString(dayDate),
            votes: dayResponses.length,
            average: dayRatings.length > 0 ? dayRatings.reduce((acc, r) => acc + r, 0) / dayRatings.length : 0,
          };
        }),
      };
    });
  }, [filteredResponses, questions, questionMap]);

  // Estadísticas por pregunta agrupadas por día (desde SurveyResponse) usando respuestas filtradas
  const questionStatsByDay = useMemo(() => {
    const questionCounts = new Map<string, { questionId: string; questionText: string; questionType: string; byDay: Map<number, SurveyResponse[]> }>();

    filteredResponses.forEach((r) => {
      if (!questionCounts.has(r.questionId)) {
        const question = questionMap.get(r.questionId);
        questionCounts.set(r.questionId, {
          questionId: r.questionId,
          questionText: question?.question_text || `Pregunta ${r.questionNumber} (${r.questionType})`,
          questionType: r.questionType,
          byDay: new Map(),
        });
      }
      const data = questionCounts.get(r.questionId)!;
      if (!data.byDay.has(r.day)) {
        data.byDay.set(r.day, []);
      }
      data.byDay.get(r.day)!.push(r);
    });

    return Array.from(questionCounts.entries()).map(([questionId, data]) => {
      const byDay = Array.from(data.byDay.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([day, dayResponses]) => ({
          day,
          count: dayResponses.length,
          average: dayResponses.length > 0
            ? dayResponses.reduce((acc, r) => acc + r.rating, 0) / dayResponses.length
            : 0,
        }));

      const totalVotes = Array.from(data.byDay.values()).reduce((acc, dayResponses) => acc + dayResponses.length, 0);
      const allRatings = Array.from(data.byDay.values()).flat().map((r) => r.rating);

      return {
        questionId,
        questionText: data.questionText,
        questionType: data.questionType,
        totalVotes,
        average: allRatings.length > 0
          ? allRatings.reduce((acc, r) => acc + r, 0) / allRatings.length
          : 0,
        byDay,
      };
    });
  }, [filteredResponses, questionMap]);

  // Función para capturar todas las imágenes de los gráficos
  const captureChartImages = async (): Promise<{
    questionVotes?: string;
    speakerVotes?: string;
    donutChart?: string;
    scatterChart?: string;
    trendChart?: string;
    questionRatingDistributions?: Array<{ questionId: string; questionText: string; day: number; image: string }>;
  }> => {
    const images: {
      questionVotes?: string;
      speakerVotes?: string;
      donutChart?: string;
      scatterChart?: string;
      trendChart?: string;
      questionRatingDistributions?: Array<{ questionId: string; questionText: string; day: number; image: string }>;
    } = {};

    try {
      // Esperar un poco para que los gráficos se rendericen completamente
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capturar gráfico de Votos por Pregunta
      if (questionVotesChartInstance.current) {
        images.questionVotes = questionVotesChartInstance.current.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });
      }

      // Capturar gráfico de Calificaciones por Conferencista
      if (speakerVotesChartInstance.current) {
        images.speakerVotes = speakerVotesChartInstance.current.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });
      }

      // Capturar gráfico de Dona
      if (donutChartInstance.current) {
        images.donutChart = donutChartInstance.current.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });
      }

      // Capturar gráfico de Dispersión
      if (scatterChartInstance.current) {
        images.scatterChart = scatterChartInstance.current.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });
      }

      // Capturar gráfico de Tendencia
      if (trendChartInstance.current) {
        images.trendChart = trendChartInstance.current.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });
      }

      // Capturar gráficos de distribución de puntuaciones por pregunta
      const distributionImages: Array<{ questionId: string; questionText: string; day: number; image: string }> = [];
      questionStatsByDay
        .filter((qStat) => qStat.totalVotes > 0)
        .forEach((qStat) => {
          qStat.byDay.forEach((dayStat) => {
            const key = `${qStat.questionId}-${dayStat.day}`;
            const instance = questionRatingDistributionInstances.current.get(key);
            if (instance) {
              try {
                const imageData = instance.getDataURL({
                  type: "png",
                  pixelRatio: 2,
                  backgroundColor: "#ffffff",
                });
                distributionImages.push({
                  questionId: qStat.questionId,
                  questionText: qStat.questionText,
                  day: dayStat.day,
                  image: imageData,
                });
              } catch (error) {
                console.error(`Error capturando gráfico ${key}:`, error);
              }
            }
          });
        });
      
      if (distributionImages.length > 0) {
        images.questionRatingDistributions = distributionImages;
      }
    } catch (error) {
      console.error("Error capturando imágenes de gráficos:", error);
    }

    return images;
  };

  // Estadísticas por día de votación (submittedAt) usando respuestas filtradas
  const votingDateStats = useMemo(() => {
    const byVotingDate = new Map<string, SurveyResponse[]>();
    filteredResponses.forEach((r) => {
      const votingDate = extractDateFromSubmittedAt(r.submittedAt);
      if (!byVotingDate.has(votingDate)) byVotingDate.set(votingDate, []);
      byVotingDate.get(votingDate)!.push(r);
    });

    const sortedDates = Array.from(byVotingDate.keys()).sort((a, b) => {
      return parseDayDate(a).getTime() - parseDayDate(b).getTime();
    });

    return sortedDates.map((votingDate) => {
      const dayResponses = byVotingDate.get(votingDate)!;
      const uniqueUsers = new Set(dayResponses.map((r) => r.userId).filter(Boolean));
      const avgRating = dayResponses.length > 0
        ? dayResponses.reduce((acc, r) => acc + r.rating, 0) / dayResponses.length
        : 0;
      const npsResponses = dayResponses.filter((r) => r.questionType === "recommendation_likelihood");
      const promoters = npsResponses.filter((r) => r.rating >= 9).length;
      const detractors = npsResponses.filter((r) => r.rating <= 6).length;
      const nps = npsResponses.length > 0 ? ((promoters - detractors) / npsResponses.length) * 100 : 0;

      return {
        votingDate,
        formattedDate: formatVotingDate(votingDate),
        uniqueUsers: uniqueUsers.size,
        totalResponses: dayResponses.length,
        averageRating: avgRating,
        nps,
      };
    });
  }, [filteredResponses]);

  const exportToXLSX = () => {
    const wb = XLSX.utils.book_new();

    const summaryRows = detailedDateStats.map((stat) => ({
      Fecha: stat.formattedDate,
      "Participantes únicos": stat.uniqueUsers,
      "Total respuestas": stat.totalResponses,
      "Calificación promedio": stat.averageRating.toFixed(2),
      NPS: stat.nps.toFixed(1),
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");

    const detailRows = filteredResponses.map((r) => {
      const question = questionMap.get(r.questionId);
      return {
        ID: r.id,
        "Survey ID": r.surveyId,
        "Question ID": r.questionId,
        "User ID": r.userId || "",
        Usuario: r.userName || "",
        Dia: r.day,
        "Fecha Evento": formatDateString(r.dayDate),
        "Fecha Votación": formatVotingDate(r.submittedAt),
        "Número pregunta": r.questionNumber,
        "Tipo pregunta": r.questionType,
        "Texto pregunta": question?.question_text || "",
        Conferencista: r.speakerName || "",
        Calificación: r.rating,
        "Respuesta texto": r.textResponse || "",
      };
    });
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, detailSheet, "Detalle");

    const speakerRows = speakerStats.flatMap((speaker) =>
      speaker.byDate.map((dateStat) => ({
        Conferencista: speaker.name,
        Especialidad: speaker.specialty,
        Fecha: dateStat.formattedDate,
        Votos: dateStat.votes,
        Promedio: dateStat.average.toFixed(2),
      }))
    );
    const speakerSheet = XLSX.utils.json_to_sheet(speakerRows);
    XLSX.utils.book_append_sheet(wb, speakerSheet, "Conferencistas");

    const questionRows = questionStatsByDay.filter((qStat) => qStat.totalVotes > 0).flatMap((qStat) =>
      qStat.byDay.map((dayStat) => ({
        "ID Pregunta": qStat.questionId,
        "Texto Pregunta": qStat.questionText,
        "Tipo Pregunta": qStat.questionType,
        Día: dayStat.day,
        Votos: dayStat.count,
        Promedio: dayStat.average.toFixed(2),
      }))
    );
    const questionSheet = XLSX.utils.json_to_sheet(questionRows);
    XLSX.utils.book_append_sheet(wb, questionSheet, "Preguntas");

    XLSX.writeFile(wb, `estadisticas-encuestas-${Date.now()}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-lg font-semibold">No hay respuestas registradas aún.</p>
        <p className="mt-2 text-sm text-muted-foreground">Las estadísticas aparecerán cuando los usuarios comiencen a responder las encuestas.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Barra de Filtros Globales */}
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Globales
          </CardTitle>
          <CardDescription>Los filtros aplican a todas las visualizaciones y estadísticas</CardDescription>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Filtrar por día</Label>
              <Select value={filterDay?.toString() || "all"} onValueChange={(value) => setFilterDay(value === "all" ? null : parseInt(value, 10))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos los días" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los días</SelectItem>
                  {availableDays.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Día {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Opciones de descarga y estadísticas - siempre disponibles */}
      {compact && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Opciones de Descarga
              </CardTitle>
              <CardDescription>
                Descargue las estadísticas de encuestas en formato PDF o XLSX
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <QRCodeViewer viewName="estadisticas" label="Estadísticas" />
                <Button variant="outline" onClick={exportToXLSX}>
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  XLSX
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const chartImages = await captureChartImages();
                    exportToPDF(filteredResponses, questions, overallStats, questionMap, chartImages);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de distribución de puntuaciones por pregunta */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribución de Puntuaciones por Pregunta
              </CardTitle>
              <CardDescription>
                Gráficos de barras mostrando la distribución de puntuaciones (1-10) para cada pregunta por día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {questionStatsByDay
                  .filter((qStat) => qStat.totalVotes > 0)
                  .flatMap((qStat) =>
                    qStat.byDay.map((dayStat) => {
                      const chartOption = buildQuestionRatingDistributionOption(
                        qStat.questionId,
                        qStat.questionText,
                        dayStat.day,
                        filteredResponses
                      );
                      return chartOption ? (
                        <div key={`${qStat.questionId}-${dayStat.day}`} className="rounded-xl border p-4 bg-white shadow-sm">
                          <ReactECharts
                            option={chartOption}
                            style={{ height: 300 }}
                            onChartReady={(chart) => {
                              const key = `${qStat.questionId}-${dayStat.day}`;
                              questionRatingDistributionInstances.current.set(key, chart);
                            }}
                          />
                        </div>
                      ) : null;
                    })
                  )}
              </div>
              {questionStatsByDay.filter((qStat) => qStat.totalVotes > 0).length === 0 && (
                <p className="text-muted-foreground text-center py-8">No hay datos disponibles.</p>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas gerenciales */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-1">Estadísticas Gerenciales</h2>
              <p className="text-muted-foreground">
                Usuarios registrados: {overallStats.registeredUsers} • Usuarios que votaron: {overallStats.votingUsers} • Tasa de participación: {overallStats.participationRate.toFixed(1)}% • Total respuestas: {overallStats.totalResponses}
              </p>
            </div>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios registrados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.registeredUsers}</div>
                <p className="text-xs text-muted-foreground">Total de usuarios en el sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios que votaron</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.votingUsers}</div>
                <p className="text-xs text-muted-foreground">Usuarios que han respondido</p>
                <Progress value={overallStats.participationRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{overallStats.participationRate.toFixed(1)}% de participación</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total respuestas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.totalResponses}</div>
                <p className="text-xs text-muted-foreground">Respuestas registradas en total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calificación promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.averageRating.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Promedio general de todas las calificaciones</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla: Resumen por Fecha de Evento */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumen por Fecha de Evento
              </CardTitle>
              <CardDescription>Estadísticas agrupadas por fecha del evento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Evento</TableHead>
                      <TableHead>Participantes</TableHead>
                      <TableHead>Respuestas</TableHead>
                      <TableHead>Promedio</TableHead>
                      <TableHead>NPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedDateStats.map((stat) => (
                      <TableRow key={stat.dayDate}>
                        <TableCell className="font-medium">{stat.formattedDate}</TableCell>
                        <TableCell>{stat.uniqueUsers}</TableCell>
                        <TableCell>{stat.totalResponses}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stat.averageRating.toFixed(2)}/10</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stat.nps >= 50 ? "default" : stat.nps >= 0 ? "secondary" : "destructive"}>
                            {stat.nps.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tabla: Resumen por Día de Votación */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumen por Día de Votación
              </CardTitle>
              <CardDescription>Estadísticas agrupadas por fecha de votación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Votación</TableHead>
                      <TableHead>Participantes</TableHead>
                      <TableHead>Respuestas</TableHead>
                      <TableHead>Promedio</TableHead>
                      <TableHead>NPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votingDateStats.map((stat) => (
                      <TableRow key={stat.votingDate}>
                        <TableCell className="font-medium">{stat.formattedDate}</TableCell>
                        <TableCell>{stat.uniqueUsers}</TableCell>
                        <TableCell>{stat.totalResponses}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stat.averageRating.toFixed(2)}/10</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stat.nps >= 50 ? "default" : stat.nps >= 0 ? "secondary" : "destructive"}>
                            {stat.nps.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tabla: Votos por Pregunta */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Votos por Pregunta
              </CardTitle>
              <CardDescription>Conteo de votos agrupados por día (Día 1 y Día 2)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabla de descripción */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pregunta</TableHead>
                      <TableHead>Día</TableHead>
                      <TableHead>Votos</TableHead>
                      <TableHead>Promedio</TableHead>
                      <TableHead>Total Votos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionStatsByDay
                      .filter((qStat) => qStat.totalVotes > 0)
                      .flatMap((qStat) =>
                        qStat.byDay.map((dayStat) => (
                          <TableRow key={`${qStat.questionId}-${dayStat.day}`}>
                            <TableCell className="font-medium max-w-md truncate" title={qStat.questionText}>
                              {qStat.questionText}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">Día {dayStat.day}</Badge>
                            </TableCell>
                            <TableCell>{dayStat.count}</TableCell>
                            <TableCell>{dayStat.average.toFixed(2)}/10</TableCell>
                            <TableCell>
                              <Badge variant="outline">{qStat.totalVotes}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                  </TableBody>
                </Table>
              </div>
              {/* Gráfico */}
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                {questionStatsByDay.length > 0 ? (
                  <ReactECharts
                    option={buildQuestionVotesByDayOption(filteredResponses, questionMap)}
                    style={{ height: 400 }}
                    onChartReady={(chart) => {
                      questionVotesChartInstance.current = chart;
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay datos disponibles.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gráfico: Calificaciones por Conferencista */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Calificaciones por Conferencista
              </CardTitle>
              <CardDescription>Conteo de votos agrupados por día (Día 1 y Día 2)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                {(() => {
                  const speakerOption = buildSpeakerVotesByDayOption(filteredResponses, questionMap);
                  return speakerOption ? (
                    <ReactECharts
                      option={speakerOption}
                      style={{ height: 400 }}
                      onChartReady={(chart) => {
                        speakerVotesChartInstance.current = chart;
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No hay datos de conferencistas disponibles.</p>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de Análisis */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Gráficos de Análisis
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <CardTitle className="text-base mb-2">Distribución de Votantes por Fecha (Dona)</CardTitle>
                {buildDonutByDayOption(filteredResponses, questions) ? (
                  <ReactECharts
                    option={buildDonutByDayOption(filteredResponses, questions)}
                    style={{ height: 300 }}
                    onChartReady={(chart) => {
                      donutChartInstance.current = chart;
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground">No hay datos disponibles.</p>
                )}
              </div>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <CardTitle className="text-base mb-2">Mapa de Dispersión de Calificaciones</CardTitle>
                {selectedDayDate ? (
                  buildScatterOption(filteredResponses, questions, selectedDayDate) ? (
                    <ReactECharts
                      option={buildScatterOption(filteredResponses, questions, selectedDayDate)!}
                      style={{ height: 300 }}
                      onChartReady={(chart) => {
                        scatterChartInstance.current = chart;
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground">No hay datos de conferencias para esta fecha.</p>
                  )
                ) : (
                  <p className="text-muted-foreground">Seleccione una fecha de evento para ver el mapa de dispersión.</p>
                )}
              </div>
              <div className="rounded-xl border p-4 bg-white shadow-sm lg:col-span-2">
                <CardTitle className="text-base mb-2">Tendencia de Calificaciones por Día de Votación</CardTitle>
                {buildTrendOption(filteredResponses) ? (
                  <ReactECharts
                    option={buildTrendOption(filteredResponses)!}
                    style={{ height: 300 }}
                    onChartReady={(chart) => {
                      trendChartInstance.current = chart;
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground">No hay datos disponibles.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!compact && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-1">Estadísticas Gerenciales</h2>
              <p className="text-muted-foreground">
                Usuarios registrados: {overallStats.registeredUsers} • Usuarios que votaron: {overallStats.votingUsers} • Tasa de participación: {overallStats.participationRate.toFixed(1)}% • Total respuestas: {overallStats.totalResponses}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <QRCodeViewer viewName="estadisticas" label="Estadísticas" />
              <Button variant="outline" onClick={exportToXLSX}>
                <DownloadCloud className="mr-2 h-4 w-4" />
                XLSX
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const chartImages = await captureChartImages();
                  exportToPDF(filteredResponses, questions, overallStats, questionMap, chartImages);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          {/* Gráficos de distribución de puntuaciones por pregunta */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribución de Puntuaciones por Pregunta
              </CardTitle>
              <CardDescription>
                Gráficos de barras mostrando la distribución de puntuaciones (1-10) para cada pregunta por día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {questionStatsByDay
                  .filter((qStat) => qStat.totalVotes > 0)
                  .flatMap((qStat) =>
                    qStat.byDay.map((dayStat) => {
                      const chartOption = buildQuestionRatingDistributionOption(
                        qStat.questionId,
                        qStat.questionText,
                        dayStat.day,
                        filteredResponses
                      );
                      return chartOption ? (
                        <div key={`${qStat.questionId}-${dayStat.day}`} className="rounded-xl border p-4 bg-white shadow-sm">
                          <ReactECharts
                            option={chartOption}
                            style={{ height: 350 }}
                            onChartReady={(chart) => {
                              const key = `${qStat.questionId}-${dayStat.day}`;
                              questionRatingDistributionInstances.current.set(key, chart);
                            }}
                          />
                        </div>
                      ) : null;
                    })
                  )}
              </div>
              {questionStatsByDay.filter((qStat) => qStat.totalVotes > 0).length === 0 && (
                <p className="text-muted-foreground text-center py-8">No hay datos disponibles.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios registrados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.registeredUsers}</div>
                <p className="text-xs text-muted-foreground">Total de usuarios en el sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios que votaron</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.votingUsers}</div>
                <p className="text-xs text-muted-foreground">Usuarios que han respondido</p>
                <Progress value={overallStats.participationRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{overallStats.participationRate.toFixed(1)}% de participación</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total respuestas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.totalResponses}</div>
                <p className="text-xs text-muted-foreground">Respuestas registradas en total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calificación promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.averageRating.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Promedio general de todas las calificaciones</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumen por Fecha de Evento
              </CardTitle>
              <CardDescription>Estadísticas agrupadas por fecha del evento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Evento</TableHead>
                      <TableHead>Participantes</TableHead>
                      <TableHead>Respuestas</TableHead>
                      <TableHead>Promedio</TableHead>
                      <TableHead>NPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedDateStats.map((stat) => (
                      <TableRow key={stat.dayDate}>
                        <TableCell className="font-medium">{stat.formattedDate}</TableCell>
                        <TableCell>{stat.uniqueUsers}</TableCell>
                        <TableCell>{stat.totalResponses}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stat.averageRating.toFixed(2)}/10</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stat.nps >= 50 ? "default" : stat.nps >= 0 ? "secondary" : "destructive"}>
                            {stat.nps.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumen por Día de Votación
              </CardTitle>
              <CardDescription>Estadísticas agrupadas por fecha de votación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Votación</TableHead>
                      <TableHead>Participantes</TableHead>
                      <TableHead>Respuestas</TableHead>
                      <TableHead>Promedio</TableHead>
                      <TableHead>NPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votingDateStats.map((stat) => (
                      <TableRow key={stat.votingDate}>
                        <TableCell className="font-medium">{stat.formattedDate}</TableCell>
                        <TableCell>{stat.uniqueUsers}</TableCell>
                        <TableCell>{stat.totalResponses}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stat.averageRating.toFixed(2)}/10</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stat.nps >= 50 ? "default" : stat.nps >= 0 ? "secondary" : "destructive"}>
                            {stat.nps.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Votos por Pregunta
              </CardTitle>
              <CardDescription>Conteo de votos agrupados por día (Día 1 y Día 2)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabla de descripción */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pregunta</TableHead>
                      <TableHead>Día</TableHead>
                      <TableHead>Votos</TableHead>
                      <TableHead>Promedio</TableHead>
                      <TableHead>Total Votos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionStatsByDay
                      .filter((qStat) => qStat.totalVotes > 0)
                      .flatMap((qStat) =>
                        qStat.byDay.map((dayStat) => (
                          <TableRow key={`${qStat.questionId}-${dayStat.day}`}>
                            <TableCell className="font-medium max-w-md truncate" title={qStat.questionText}>
                              {qStat.questionText}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">Día {dayStat.day}</Badge>
                            </TableCell>
                            <TableCell>{dayStat.count}</TableCell>
                            <TableCell>{dayStat.average.toFixed(2)}/10</TableCell>
                            <TableCell>
                              <Badge variant="outline">{qStat.totalVotes}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                  </TableBody>
                </Table>
              </div>
              {/* Gráfico */}
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                {questionStatsByDay.length > 0 ? (
                  <ReactECharts
                    option={buildQuestionVotesByDayOption(filteredResponses, questionMap)}
                    style={{ height: 500 }}
                    onChartReady={(chart) => {
                      questionVotesChartInstance.current = chart;
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay datos disponibles.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Calificaciones por Conferencista
              </CardTitle>
              <CardDescription>Conteo de votos agrupados por día (Día 1 y Día 2)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                {(() => {
                  const speakerOption = buildSpeakerVotesByDayOption(filteredResponses, questionMap);
                  return speakerOption ? (
                    <ReactECharts
                      option={speakerOption}
                      style={{ height: 500 }}
                      onChartReady={(chart) => {
                        speakerVotesChartInstance.current = chart;
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No hay datos de conferencistas disponibles.</p>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gráficos de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border p-4 bg-white shadow-sm">
            <CardTitle className="text-base mb-2">Distribución de Votantes por Fecha (Dona)</CardTitle>
            {buildDonutByDayOption(filteredResponses, questions) ? (
              <ReactECharts
                option={buildDonutByDayOption(filteredResponses, questions)}
                style={{ height: 400 }}
                onChartReady={(chart) => {
                  donutChartInstance.current = chart;
                }}
              />
            ) : (
              <p className="text-muted-foreground">No hay datos disponibles.</p>
            )}
          </div>
          <div className="rounded-xl border p-4 bg-white shadow-sm">
            <CardTitle className="text-base mb-2">Mapa de Dispersión de Calificaciones</CardTitle>
            {selectedDayDate ? (
              buildScatterOption(filteredResponses, questions, selectedDayDate) ? (
                <ReactECharts
                  option={buildScatterOption(filteredResponses, questions, selectedDayDate)!}
                  style={{ height: 400 }}
                  onChartReady={(chart) => {
                    scatterChartInstance.current = chart;
                  }}
                />
              ) : (
                <p className="text-muted-foreground">No hay datos de conferencias para esta fecha.</p>
              )
            ) : (
              <p className="text-muted-foreground">Seleccione una fecha de evento para ver el mapa de dispersión.</p>
            )}
          </div>
          <div className="rounded-xl border p-4 bg-white shadow-sm lg:col-span-2">
            <CardTitle className="text-base mb-2">Tendencia de Calificaciones por Día de Votación</CardTitle>
            {buildTrendOption(filteredResponses) ? (
              <ReactECharts
                option={buildTrendOption(filteredResponses)!}
                style={{ height: 400 }}
                onChartReady={(chart) => {
                  trendChartInstance.current = chart;
                }}
              />
            ) : (
              <p className="text-muted-foreground">No hay datos disponibles.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
