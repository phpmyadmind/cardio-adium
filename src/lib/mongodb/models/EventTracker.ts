import mongoose, { Schema, Document } from 'mongoose';

export interface IEventTracker extends Document {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const EventTrackerSchema = new Schema<IEventTracker>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para búsquedas rápidas
EventTrackerSchema.index({ isActive: 1 });
EventTrackerSchema.index({ name: 1 });

export const EventTracker = mongoose.models.EventTracker || mongoose.model<IEventTracker>('EventTracker', EventTrackerSchema);

