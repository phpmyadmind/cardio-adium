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
  },
  {
    timestamps: true,
  }
);

// Índice para búsquedas por nombre
SpeakerSchema.index({ name: 1 });

export const Speaker = mongoose.models.Speaker || mongoose.model<ISpeaker>('Speaker', SpeakerSchema);

