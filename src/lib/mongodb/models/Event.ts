import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  _id: string;
  title: string;
  description: string;
  startTime: string; // Formato: "HH:mm"
  endTime: string; // Formato: "HH:mm"
  speakerIds: string[];
  date: string; // Formato: "yyyy-mm-dd"
  type?: 'session' | 'break' | 'meal' | 'welcome' | 'closing' | 'workshop' | 'qna';
  moderator?: string;
  location?: string;
  section?: string;
  participants?: string[];
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
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
    date: {
      type: String,
      required: true,
      index: true,
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
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas por fecha
EventSchema.index({ date: 1 });
EventSchema.index({ date: 1, startTime: 1 }); // Índice compuesto para ordenar por fecha y hora

export const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

