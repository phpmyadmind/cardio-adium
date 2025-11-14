import mongoose, { Schema, Document } from "mongoose";

export interface ISurveyQuestion extends Document {
  _id: string;
  survey_id: string;
  day: number;
  date: string;
  question_number: number;
  question_type: "conference_rating" | "practical_spaces" | "incremental_learning" | "recommendation_likelihood" | "pre_event_info" | "logistics" | "agenda_compliance" | "campus_feedback";
  question_text: string;
  scale: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
  speakers?: Array<{
    name: string;
    specialty: string;
  }>;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SurveyQuestionSchema = new Schema<ISurveyQuestion>(
  {
    survey_id: {
      type: String,
      required: true,
      index: true,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    question_number: {
      type: Number,
      required: true,
    },
    question_type: {
      type: String,
      required: true,
      enum: ["conference_rating", "practical_spaces", "incremental_learning", "recommendation_likelihood", "pre_event_info", "logistics", "agenda_compliance", "campus_feedback"],
      index: true,
    },
    question_text: {
      type: String,
      required: true,
    },
    scale: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
      min_label: {
        type: String,
        required: true,
      },
      max_label: {
        type: String,
        required: true,
      },
    },
    speakers: {
      type: [
        {
          name: String,
          specialty: String,
        },
      ],
      default: undefined,
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para búsquedas eficientes
SurveyQuestionSchema.index({ survey_id: 1, day: 1, question_number: 1 });
SurveyQuestionSchema.index({ survey_id: 1, isEnabled: 1 });
SurveyQuestionSchema.index({ day: 1, isEnabled: 1 });

export const SurveyQuestion =
  mongoose.models.SurveyQuestion ||
  mongoose.model<ISurveyQuestion>("SurveyQuestion", SurveyQuestionSchema);

