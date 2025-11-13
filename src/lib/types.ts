export interface User {
  id: string;
  name: string;
  medicalId: string;
  city: string;
  specialty: string;
  email: string;
  question?: string;
  answer?: string;
}

export interface Speaker {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  imageUrl: string;
  imageHint: string;
  qualifications?: string[];
}

export interface AgendaItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  speakerIds: string[];
  type?: 'session' | 'break' | 'meal' | 'welcome' | 'closing' | 'workshop' | 'qna';
  moderator?: string;
  location?: string;
  section?: string; // Sección temática (ej: "Riesgo CV", "Dislipidemia", etc.)
  participants?: string[]; // Participantes que no son speakers (ej: presentadores, anfitriones)
}

export interface Question {
  id: string;
  userName: string;
  speakerName: string;
  question: string;
  isAnswered: boolean;
  submittedAt: Date;
}
