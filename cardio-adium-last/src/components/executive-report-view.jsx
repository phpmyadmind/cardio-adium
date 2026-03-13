import { useEffect, useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { QRCodeViewer } from './qr-code-viewer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DownloadCloud,
  FileText,
  Users,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart3, Mic } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getApiUrl } from '../lib/api';

const ReactECharts = lazy(() => import('echarts-for-react'));

export function ExecutiveReportView() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedRating, setSelectedRating] = useState('all');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(getApiUrl('/api/reports/executive'));
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let message = 'Error al cargar los datos del informe';
        if (isJson) {
          try {
            const errBody = await response.json();
            message = errBody.error || errBody.message || message;
          } catch (_) {}
        } else if (response.status === 404) {
          message = 'Endpoint no encontrado. Verifique que la API esté corriendo en el puerto correcto.';
        } else if (response.status >= 500) {
          message = 'Error del servidor. Verifique que la base de datos esté conectada y las tablas existan.';
        }
        throw new Error(message);
      }

      const reportData = isJson ? await response.json() : {};
      setData(reportData);
    } catch (err) {
      const msg = err.message || 'Error desconocido';
      setError(err.name === 'TypeError' && msg.includes('fetch') ? 'No se pudo conectar con la API. Verifique que esté corriendo.' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportToXLSX = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();
    const summaryRows = [
      { Métrica: 'Total Respuestas Encuestas', Valor: data.summary.totalSurveyResponses },
      { Métrica: 'Participantes identificados', Valor: data.summary.uniqueSurveyUsers },
      { Métrica: 'Respuestas anónimas', Valor: data.summary.anonymousSurveyResponses ?? 0 },
      { Métrica: 'Calificación Promedio', Valor: data.summary.averageRating },
      { Métrica: 'Total Preguntas Q&A', Valor: data.summary.totalQuestions },
      { Métrica: 'Total Usuarios registrados', Valor: data.summary.totalUsers },
      { Métrica: 'Usuarios Administradores', Valor: data.summary.totalAdmins },
      { Métrica: 'Total Speakers', Valor: data.summary.totalSpeakers },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen Ejecutivo');

    const questionRows = [
      { Estado: 'Aprobadas', Cantidad: data.questions.approved },
      { Estado: 'Pendientes', Cantidad: data.questions.pending },
      { Estado: 'Respondidas', Cantidad: data.questions.answered },
      { Estado: 'Sin Responder', Cantidad: data.questions.unanswered },
    ];
    const questionSheet = XLSX.utils.json_to_sheet(questionRows);
    XLSX.utils.book_append_sheet(wb, questionSheet, 'Estado de Preguntas');

    XLSX.writeFile(wb, `informe-gerencial-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    if (!data) return;

    const doc = new jsPDF();
    const margin = 20;
    let yPosition = 20;

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Informe Gerencial Cardio Adium', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generado el: ${dateStr}`, doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });

    yPosition = 70;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Ejecutivo', margin, yPosition);
    yPosition += 10;

    const summaryData = [
      ['Total Respuestas Encuestas', data.summary.totalSurveyResponses],
      ['Participantes identificados', data.summary.uniqueSurveyUsers],
      ['Respuestas anónimas', data.summary.anonymousSurveyResponses ?? 0],
      ['Calificación Promedio', data.summary.averageRating],
      ['Total Preguntas Q&A', data.summary.totalQuestions],
      ['Usuarios registrados', data.summary.totalUsers],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [46, 97, 250] },
    });

    doc.save(`informe-gerencial-${new Date().toISOString().split('T')[0]}.pdf`);
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
        <Button variant="outline" className="mt-4" onClick={fetchData}>
          Reintentar
        </Button>
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

  const questionStatusOption =
    data.questions &&
    ({
      title: { text: 'Estado de Preguntas', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const total = data.questions.total;
          const percentage = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0';
          return `${params.name}<br/>Cantidad: ${params.value}<br/>Porcentaje: ${percentage}%`;
        },
      },
      legend: { orient: 'vertical', left: 'left', top: 'middle' },
      series: [
        {
          name: 'Estado',
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { value: data.questions.approved, name: 'Aprobadas', itemStyle: { color: '#10b981' } },
            { value: data.questions.pending, name: 'Pendientes', itemStyle: { color: '#f59e0b' } },
            { value: data.questions.answered, name: 'Respondidas', itemStyle: { color: '#2E61FA' } },
            { value: data.questions.unanswered, name: 'Sin Responder', itemStyle: { color: '#ef4444' } },
          ],
        },
      ],
    });

  const availableDays = data.surveys?.dayStats
    ? [...data.surveys.dayStats].map((s) => s.day).sort((a, b) => a - b)
    : [];
  const availableRatings = data.surveys?.ratingDistribution
    ? Object.keys(data.surveys.ratingDistribution)
        .map((r) => parseInt(r))
        .sort((a, b) => a - b)
    : [];

  const filteredDayStats =
    selectedDay === 'all'
      ? data.surveys?.dayStats || []
      : (data.surveys?.dayStats || []).filter((s) => s.day === parseInt(selectedDay));
  const filteredRatingDist =
    selectedRating === 'all'
      ? data.surveys?.ratingDistribution || {}
      : Object.fromEntries(
          Object.entries(data.surveys?.ratingDistribution || {}).filter(
            ([r]) => parseInt(r) === parseInt(selectedRating)
          )
        );

  const ratingDistEntries = Object.entries(filteredRatingDist)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([rating, count]) => ({ rating: parseInt(rating), count }));

  const ratingDistributionOption =
    ratingDistEntries.length > 0
      ? {
          title: {
            text: 'Distribución de Calificaciones',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'bold' },
          },
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          xAxis: {
            type: 'category',
            data: ratingDistEntries.map((e) => e.rating.toString()),
            name: 'Calificación',
          },
          yAxis: { type: 'value', name: 'Cantidad' },
          series: [
            {
              name: 'Respuestas',
              type: 'bar',
              data: ratingDistEntries.map((e) => e.count),
              itemStyle: { color: '#2E61FA' },
              label: { show: true, position: 'top' },
            },
          ],
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Informe Gerencial</h2>
          <p className="text-muted-foreground">Resumen ejecutivo de todas las métricas del sistema</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Encuestas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSurveyResponses}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.uniqueSurveyUsers} identificados • {(data.summary.anonymousSurveyResponses ?? 0)} anónimas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.averageRating}/10</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalSurveyResponses} respuestas totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preguntas Q&A</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              {data.questions?.approved} aprobadas, {data.questions?.answered} respondidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalAdmins} admins, {data.summary.totalRegularUsers} regulares
            </p>
          </CardContent>
        </Card>
      </div>

      {(availableDays.length > 0 || availableRatings.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtros</CardTitle>
            </div>
            <CardDescription>Filtrar gráficos por día o calificación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {availableDays.length > 0 && (
                <div className="space-y-2">
                  <Label>Día</Label>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableDays.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Día {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {availableRatings.length > 0 && (
                <div className="space-y-2">
                  <Label>Calificación</Label>
                  <Select value={selectedRating} onValueChange={setSelectedRating}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableRatings.map((r) => (
                        <SelectItem key={r} value={String(r)}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {questionStatusOption && (
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
                    <div className="text-2xl font-bold">{data.questions?.approved || 0}</div>
                    <div className="text-xs text-muted-foreground">Aprobadas</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">{data.questions?.pending || 0}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{data.questions?.answered || 0}</div>
                    <div className="text-xs text-muted-foreground">Respondidas</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{data.questions?.unanswered || 0}</div>
                    <div className="text-xs text-muted-foreground">Sin Responder</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <Suspense fallback={<div className="h-[350px] flex items-center justify-center">Cargando gráfico...</div>}>
                  <ReactECharts option={questionStatusOption} style={{ height: 350 }} />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}

        {ratingDistributionOption && (
          <Card>
            <CardHeader>
              <CardTitle>
                Distribución de Calificaciones
                {selectedRating !== 'all' && (
                  <Badge variant="secondary" className="ml-2">Calificación {selectedRating}</Badge>
                )}
              </CardTitle>
              <CardDescription>Frecuencia de cada calificación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <Suspense fallback={<div className="h-[350px] flex items-center justify-center">Cargando gráfico...</div>}>
                  <ReactECharts option={ratingDistributionOption} style={{ height: 350 }} />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredDayStats.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Encuestas por Día
                {selectedDay !== 'all' && (
                  <Badge variant="secondary" className="ml-2">Día {selectedDay}</Badge>
                )}
              </CardTitle>
              <CardDescription>Distribución de respuestas por día del evento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <Suspense fallback={<div className="h-[350px] flex items-center justify-center">Cargando...</div>}>
                  <ReactECharts
                    option={{
                      title: {
                        text: selectedDay === 'all' ? 'Encuestas por Día' : `Encuestas - Día ${selectedDay}`,
                        left: 'center',
                        textStyle: { fontSize: 16, fontWeight: 'bold' },
                      },
                      tooltip: {
                        trigger: 'axis',
                        formatter: (params) => {
                          const p = Array.isArray(params) ? params[0] : params;
                          const dayStat = filteredDayStats.find((s) => s.day.toString() === p.name);
                          return `Día ${p.name}<br/>Fecha: ${dayStat?.dayDate || ''}<br/>Cantidad: ${p.value}<br/>Promedio: ${dayStat?.averageRating || 0}`;
                        },
                      },
                      xAxis: {
                        type: 'category',
                        data: [...filteredDayStats].sort((a, b) => a.day - b.day).map((s) => `Día ${s.day}`),
                      },
                      yAxis: { type: 'value', name: 'Cantidad' },
                      series: [
                        {
                          name: 'Respuestas',
                          type: 'bar',
                          data: [...filteredDayStats].sort((a, b) => a.day - b.day).map((s) => s.count),
                          itemStyle: { color: '#f59e0b' },
                          label: { show: true, position: 'top' },
                        },
                      ],
                    }}
                    style={{ height: 350 }}
                  />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}

        {data.surveys?.byDate && Object.keys(data.surveys.byDate).length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Encuestas por Fecha de Envío</CardTitle>
              <CardDescription>Evolución temporal de respuestas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <Suspense fallback={<div className="h-[350px] flex items-center justify-center">Cargando...</div>}>
                  <ReactECharts
                    option={{
                      title: { text: 'Encuestas por Fecha', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
                      tooltip: { trigger: 'axis' },
                      xAxis: {
                        type: 'category',
                        data: Object.entries(data.surveys.byDate).sort(([a], [b]) => a.localeCompare(b)).map(([d]) => d),
                        axisLabel: { rotate: 45 },
                      },
                      yAxis: { type: 'value', name: 'Cantidad' },
                      series: [
                        {
                          name: 'Respuestas',
                          type: 'line',
                          data: Object.entries(data.surveys.byDate).sort(([a], [b]) => a.localeCompare(b)).map(([, c]) => c),
                          itemStyle: { color: '#10b981' },
                          smooth: true,
                          areaStyle: { opacity: 0.3 },
                        },
                      ],
                    }}
                    style={{ height: 350 }}
                  />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}

        {data.surveys?.bySpeaker && data.surveys.bySpeaker.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top 10 Speakers - Encuestas</CardTitle>
              <CardDescription>Votos por speaker</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border p-4 bg-white shadow-sm">
                <Suspense fallback={<div className="h-[350px] flex items-center justify-center">Cargando...</div>}>
                  <ReactECharts
                    option={{
                      title: { text: 'Top 10 Speakers', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
                      tooltip: {
                        trigger: 'axis',
                        formatter: (params) => {
                          const p = Array.isArray(params) ? params[0] : params;
                          const speakerData = data.surveys.bySpeaker.find((s) => s.speaker === p.name);
                          return `${p.name}<br/>Votos: ${p.value}<br/>Promedio: ${speakerData?.averageRating?.toFixed(2) || 0}`;
                        },
                      },
                      xAxis: {
                        type: 'category',
                        data: data.surveys.bySpeaker.slice(0, 10).map((item) => item.speaker),
                        axisLabel: { rotate: 45 },
                      },
                      yAxis: { type: 'value', name: 'Cantidad de Votos' },
                      series: [
                        {
                          name: 'Votos',
                          type: 'bar',
                          data: data.surveys.bySpeaker.slice(0, 10).map((item) => ({ value: item.count, itemStyle: { color: '#FD0233' } })),
                          label: { show: true, position: 'top' },
                        },
                      ],
                    }}
                    style={{ height: 350 }}
                  />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {data.surveys?.speakerVotesByDay && data.surveys.speakerVotesByDay.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mic className="h-6 w-6 text-[#FD0233]" />
              <div>
                <CardTitle>Votaciones por Speaker por Día</CardTitle>
                <CardDescription>Detalle de votaciones organizadas por día</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={`day-${data.surveys.speakerVotesByDay[0]?.day || 1}`} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto mb-6 gap-2 bg-transparent p-0">
                {data.surveys.speakerVotesByDay.map((dayData) => (
                  <TabsTrigger
                    key={dayData.day}
                    value={`day-${dayData.day}`}
                    className="text-sm sm:text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md data-[state=active]:bg-[#2E61FA] data-[state=active]:text-white py-2 px-3"
                  >
                    Día {dayData.day}
                  </TabsTrigger>
                ))}
              </TabsList>
              {data.surveys.speakerVotesByDay.map((dayData) => (
                <TabsContent key={dayData.day} value={`day-${dayData.day}`} className="space-y-6 mt-0">
                  <div className="bg-[#FD0233] text-white rounded-lg p-4">
                    <h4 className="text-xl font-bold">Día {dayData.day} - {dayData.dayDate}</h4>
                  </div>
                  {dayData.speakers?.map((speakerData, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{speakerData.speaker}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-base font-bold">
                              Promedio: {speakerData.averageRating?.toFixed(2)}
                            </Badge>
                            <Badge variant="outline">{speakerData.count} votos</Badge>
                          </div>
                        </div>
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
                              {speakerData.votes?.map((vote, voteIdx) => (
                                <TableRow key={voteIdx}>
                                  <TableCell className="font-medium">{vote.userName || 'Sin nombre'}</TableCell>
                                  <TableCell className="text-sm max-w-xs truncate">{vote.questionType}</TableCell>
                                  <TableCell>{vote.questionNumber}</TableCell>
                                  <TableCell className="text-sm">
                                    {vote.submittedAt
                                      ? format(
                                          typeof vote.submittedAt === 'string' ? parseISO(vote.submittedAt) : new Date(vote.submittedAt),
                                          'dd/MM/yyyy HH:mm',
                                          { locale: es }
                                        )
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">{vote.textResponse || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {data.surveys?.questionVotesByDay && data.surveys.questionVotesByDay.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-[#2E61FA]" />
              <div>
                <CardTitle>Votaciones por Pregunta por Día</CardTitle>
                <CardDescription>Detalle de votaciones por tipo de pregunta organizadas por día</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={`qday-${data.surveys.questionVotesByDay[0]?.day || 1}`} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto mb-6 gap-2 bg-transparent p-0">
                {data.surveys.questionVotesByDay.map((dayData) => (
                  <TabsTrigger
                    key={dayData.day}
                    value={`qday-${dayData.day}`}
                    className="text-sm sm:text-base font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md data-[state=active]:bg-[#2E61FA] data-[state=active]:text-white py-2 px-3"
                  >
                    Día {dayData.day}
                  </TabsTrigger>
                ))}
              </TabsList>
              {data.surveys.questionVotesByDay.map((dayData) => (
                <TabsContent key={dayData.day} value={`qday-${dayData.day}`} className="space-y-6 mt-0">
                  <div className="bg-[#2E61FA] text-white rounded-lg p-4">
                    <h4 className="text-xl font-bold">Día {dayData.day} - {dayData.dayDate}</h4>
                  </div>
                  {dayData.questionTypes?.map((questionData, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base whitespace-normal break-words max-w-md">{questionData.questionType}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-base font-bold">
                              Promedio: {questionData.averageRating?.toFixed(2)}
                            </Badge>
                            <Badge variant="outline">{questionData.count} votos</Badge>
                          </div>
                        </div>
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
                              {questionData.votes?.map((vote, voteIdx) => (
                                <TableRow key={voteIdx}>
                                  <TableCell className="font-medium">{vote.userName || 'Sin nombre'}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-lg font-bold">{vote.rating}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{vote.speakerName || '-'}</TableCell>
                                  <TableCell>{vote.questionNumber}</TableCell>
                                  <TableCell className="text-sm">
                                    {vote.submittedAt
                                      ? format(
                                          typeof vote.submittedAt === 'string' ? parseISO(vote.submittedAt) : new Date(vote.submittedAt),
                                          'dd/MM/yyyy HH:mm',
                                          { locale: es }
                                        )
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">{vote.textResponse || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {data.surveys?.byQuestionType && data.surveys.byQuestionType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Votaciones por Pregunta</CardTitle>
            <CardDescription>Cantidad de votos y promedio por pregunta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.surveys.byQuestionType.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold truncate max-w-md">{item.type}</p>
                    <p className="text-sm text-muted-foreground">{item.count} respuestas</p>
                  </div>
                  <Badge variant="outline" className="text-lg font-bold">
                    {item.averageRating?.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.users?.withoutVotes && data.users.withoutVotes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usuarios registrados sin votar</CardTitle>
                <CardDescription>
                  Usuarios registrados en el sistema que no han participado en ninguna encuesta
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
                              'dd/MM/yyyy HH:mm',
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
                              'dd/MM/yyyy',
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

      {data.surveys?.responsesWithTextDetail && data.surveys.responsesWithTextDetail.length > 0 && (
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
                      <TableCell className="font-medium">{response.userName || 'Sin nombre'}</TableCell>
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
                              'dd/MM/yyyy HH:mm',
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
    </div>
  );
}
