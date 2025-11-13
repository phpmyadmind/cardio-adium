"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./user-management";
import { AgendaManagement } from "./agenda-management";
import { SpeakerManagement } from "./speaker-management";
import { QaManagement } from "./qa-management";
import { Users, Calendar, Mic, HelpCircle } from "lucide-react";

export function AdminPanel() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-12">
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
    </Tabs>
  );
}
