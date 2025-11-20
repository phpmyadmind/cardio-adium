"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserManagement } from "./user-management";
import { AgendaManagement } from "./agenda-management";
import { SpeakerManagement } from "./speaker-management";
import { QaManagement } from "./qa-management";
import { SurveyManagement } from "./survey-management";
import { ExecutiveReportView } from "@/components/executive-report-view";
import { Users, Calendar, Mic, HelpCircle, ListChecks, BarChart3, DownloadCloud, FileText, ExternalLink } from "lucide-react";

export function AdminPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  // Validar que el tab sea uno de los valores permitidos
  const validTabs = ["users", "agenda", "speakers", "qa", "surveys", "stats"];
  const defaultTab = tabParam && validTabs.includes(tabParam) ? tabParam : "users";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto sm:h-12">
        <TabsTrigger value="users" className="text-base py-2">
          <Users className="mr-2 h-5 w-5" />
          Users
        </TabsTrigger>
        <TabsTrigger value="agenda" className="text-base py-2">
          <Calendar className="mr-2 h-5 w-5" />
          Agenda
        </TabsTrigger>
        <TabsTrigger value="speakers" className="text-base py-2">
          <Mic className="mr-2 h-5 w-5" />
          Speakers
        </TabsTrigger>
        <TabsTrigger value="qa" className="text-base py-2">
          <HelpCircle className="mr-2 h-5 w-5" />
          Q&A
        </TabsTrigger>
        <TabsTrigger value="surveys" className="text-base py-2">
          <ListChecks className="mr-2 h-5 w-5" />
          Encuestas
        </TabsTrigger>
        <TabsTrigger value="stats" className="text-base py-2">
          <BarChart3 className="mr-2 h-5 w-5" />
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
      <TabsContent value="stats" className="mt-6">
        <ExecutiveReportView />
      </TabsContent>
    </Tabs>
  );
}
