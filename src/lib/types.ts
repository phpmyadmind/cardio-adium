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
  speakerId: string;
  name: string;
  specialty: string;
  bio: string;
  imageUrl: string;
  imageHint: string;
  qualifications?: string[];
  specialization?: string; // Alias para specialty
  event_tracker?: string; // ID del evento tracker
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string; // Mantener por compatibilidad, pero usar title
  speakerIds: string[];
  type?: 'session' | 'break' | 'meal' | 'welcome' | 'closing' | 'workshop' | 'qna';
  moderator?: string;
  location?: string;
  section?: string; // Sección temática (ej: "Riesgo CV", "Dislipidemia", etc.)
  participants?: string[]; // Participantes que no son speakers (ej: presentadores, anfitriones)
  event_tracker?: string; // ID del evento tracker
  specialty?: string; // Especialidad
  pdfUrl?: string; // URL del PDF de la agenda para esta especialidad
}

export interface Question {
  id: string;
  userName: string;
  speakerName: string;
  question: string;
  isAnswered: boolean;
  submittedAt: Date;
}

export interface RatingDistributionEntry {
  count: number;
  percentage: number;
}

export interface SurveyRatingBlock {
  ratings_distribution: Record<string, RatingDistributionEntry>;
  average_rating: number;
  total_votes: number;
  max_rating: number;
  nps_categories?: Record<string, RatingDistributionEntry>;
}

export interface SurveyConferenceRating extends SurveyRatingBlock {
  specialty?: string;
}

export interface SurveyDayData {
  date: string;
  response_count: number;
  conference_ratings?: Record<string, SurveyConferenceRating>;
  recommendation_likelihood?: SurveyRatingBlock;
  practical_spaces_rating?: SurveyRatingBlock;
  incremental_learning?: SurveyRatingBlock;
  campus_feedback?: {
    would_participate_again: {
      yes: RatingDistributionEntry;
      no: RatingDistributionEntry;
      total_votes: number;
    };
    suggested_topics: {
      topics_list: string[];
      topics_frequency: Record<string, number>;
      total_suggestions: number;
    };
  };
  pre_event_info_rating?: SurveyRatingBlock;
  logistics_rating?: SurveyRatingBlock;
  agenda_compliance_rating?: SurveyRatingBlock;
}

export interface SurveyData {
  survey_metadata: {
    event_name: string;
    survey_version: string;
    total_days: number;
    days_dates: Record<string, string>;
    total_respondents: number;
  };
  daily_responses: Record<string, SurveyDayData>;
  analytics_metrics: {
    day_1_metrics?: Record<string, number>;
    day_2_metrics?: Record<string, number>;
    overall_metrics?: Record<string, number>;
  };
  timestamp: {
    created_at: string;
    updated_at: string;
  };
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  isEnabled: boolean;
  surveyData: SurveyData;
  createdAt?: string;
  updatedAt?: string;
}