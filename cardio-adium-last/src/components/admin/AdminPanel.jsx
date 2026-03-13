import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { ExecutiveReportView } from '../executive-report-view';
import { UserManagement } from './UserManagement';
import { EventTrackerManagement } from './EventTrackerManagement';
import { SpeakerManagement } from './SpeakerManagement';
import { AgendaManagement } from './AgendaManagement';
import { QaManagement } from './QaManagement';
import { SurveyManagement } from './SurveyManagement';
import { Users, Calendar, Mic, HelpCircle, ListChecks, BarChart3, Tag, Settings } from 'lucide-react';

export function AdminPanel() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const tabParam = searchParams.get('tab');
  const validTabs = ['users', 'agenda', 'speakers', 'qa', 'surveys', 'event-trackers', 'stats'];
  const isStatsRoute = location.pathname === '/admin/statistics';
  const defaultTab = isStatsRoute ? 'stats' : (tabParam && validTabs.includes(tabParam) ? tabParam : 'users');

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </Link>
        </Button>
      </div>
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto sm:h-12 gap-2">
        <TabsTrigger value="users" className="text-sm py-2">
          <Users className="mr-2 h-4 w-4" />
          Users
        </TabsTrigger>
        <TabsTrigger value="agenda" className="text-sm py-2">
          <Calendar className="mr-2 h-4 w-4" />
          Agenda
        </TabsTrigger>
        <TabsTrigger value="speakers" className="text-sm py-2">
          <Mic className="mr-2 h-4 w-4" />
          Speakers
        </TabsTrigger>
        <TabsTrigger value="qa" className="text-sm py-2">
          <HelpCircle className="mr-2 h-4 w-4" />
          Q&A
        </TabsTrigger>
        <TabsTrigger value="surveys" className="text-sm py-2">
          <ListChecks className="mr-2 h-4 w-4" />
          Encuestas
        </TabsTrigger>
        <TabsTrigger value="event-trackers" className="text-sm py-2">
          <Tag className="mr-2 h-4 w-4" />
          Eventos
        </TabsTrigger>
        <TabsTrigger value="stats" className="text-sm py-2">
          <BarChart3 className="mr-2 h-4 w-4" />
          Estadísticas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-6">
        <UserManagement />
      </TabsContent>
      <TabsContent value="agenda" className="mt-6">
        <AgendaManagement />
      </TabsContent>
      <TabsContent value="speakers" className="mt-6">
        <SpeakerManagement />
      </TabsContent>
      <TabsContent value="qa" className="mt-6">
        <QaManagement />
      </TabsContent>
      <TabsContent value="surveys" className="mt-6">
        <SurveyManagement />
      </TabsContent>
      <TabsContent value="event-trackers" className="mt-6">
        <EventTrackerManagement />
      </TabsContent>
      <TabsContent value="stats" className="mt-6">
        <ExecutiveReportView />
      </TabsContent>
    </Tabs>
    </div>
  );
}
