import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  _id: string;
  userId: string;
  eventId?: string;
  text: string;
  submittedAt: Date;
  isApproved: boolean;
  isAnswered?: boolean;
  userName?: string;
  speakerName?: string;
  answer?: string;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    isApproved: {
      type: Boolean,
      required: true,
      default: false,
    },
    isAnswered: {
      type: Boolean,
      default: false,
    },
    userName: {
      type: String,
    },
    speakerName: {
      type: String,
    },
    answer: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas eficientes
QuestionSchema.index({ userId: 1, submittedAt: -1 });
QuestionSchema.index({ eventId: 1, submittedAt: -1 });
QuestionSchema.index({ isApproved: 1 });

export const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

