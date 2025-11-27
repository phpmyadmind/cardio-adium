import mongoose, { Schema, Document } from 'mongoose';

export interface ISpeaker extends Document {
  _id: string;
  name: string;
  specialty: string;
  bio: string;
  imageUrl: string;
  imageHint: string;
  qualifications?: string[];
  specialization?: string; // Alias para specialty
  event_tracker?: string; // ID del evento tracker
}

const SpeakerSchema = new Schema<ISpeaker>(
  {
    name: {
      type: String,
      required: true,
    },
    specialty: {
      type: String,
      required: true,
    },
    specialization: {
      type: String,
    },
    bio: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imageHint: {
      type: String,
      required: true,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    event_tracker: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas
SpeakerSchema.index({ name: 1 });
SpeakerSchema.index({ event_tracker: 1 });

export const Speaker = mongoose.models.Speaker || mongoose.model<ISpeaker>('Speaker', SpeakerSchema);

