import mongoose, { Schema, Document } from "mongoose";

export interface ISurveyResponse extends Document {
  _id: string;
  surveyId: string;
  questionId: string;
  userId?: string;
  userName?: string;
  day: number;
  dayDate: string;
  questionNumber: number;
  questionType: string;
  speakerName?: string;
  rating: number;
  textResponse?: string;
  submittedAt: Date;
}

const SurveyResponseSchema = new Schema<ISurveyResponse>(
  {
    surveyId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    userName: { type: String },
    day: { type: Number, required: true, index: true },
    dayDate: { type: String, required: true },
    questionNumber: { type: Number, required: true },
    questionType: { type: String, required: true, index: true },
    speakerName: { type: String },
    rating: { type: Number, required: true },
    textResponse: { type: String },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

SurveyResponseSchema.index({ surveyId: 1, questionId: 1, userId: 1 });
SurveyResponseSchema.index({ userId: 1, day: 1 });
SurveyResponseSchema.index({ questionId: 1, day: 1 });

export const SurveyResponse =
  mongoose.models.SurveyResponse ||
  mongoose.model<ISurveyResponse>("SurveyResponse", SurveyResponseSchema);

