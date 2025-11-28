import mongoose, { Schema, Document } from 'mongoose';

export interface IAgenda extends Document {
  _id: string;
  title: string;
  description: string;
  date: string; // Formato: "yyyy-mm-dd"
  startTime: string; // Formato: "HH:mm"
  endTime: string; // Formato: "HH:mm"
  speakerIds: string[]; // IDs de ponentes por registro
  type?: 'session' | 'break' | 'meal' | 'welcome' | 'closing' | 'workshop' | 'qna';
  moderator?: string;
  location?: string;
  section?: string; // Sección temática
  participants?: string[]; // Participantes
  event_tracker?: string; // ID del evento tracker (relación con EventTracker)
  specialty?: string; // Especialidad
  pdfUrl?: string; // URL del PDF de la agenda para esta especialidad
  createdAt?: Date;
  updatedAt?: Date;
}

const AgendaSchema = new Schema<IAgenda>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      index: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    speakerIds: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: ['session', 'break', 'meal', 'welcome', 'closing', 'workshop', 'qna'],
    },
    moderator: {
      type: String,
    },
    location: {
      type: String,
    },
    section: {
      type: String,
    },
    participants: {
      type: [String],
      default: [],
    },
    event_tracker: {
      type: String,
      index: true,
    },
    specialty: {
      type: String,
    },
    pdfUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas eficientes
AgendaSchema.index({ date: 1 });
AgendaSchema.index({ date: 1, startTime: 1 }); // Índice compuesto para ordenar por fecha y hora
AgendaSchema.index({ event_tracker: 1 });
AgendaSchema.index({ event_tracker: 1, date: 1 }); // Índice compuesto para filtrar por evento y fecha

export const Agenda = mongoose.models.Agenda || mongoose.model<IAgenda>('Agenda', AgendaSchema);

