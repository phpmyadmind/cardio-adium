import mongoose, { Schema, Document } from "mongoose";

export interface ISurvey extends Document {
  _id: string;
  title: string;
  description?: string;
  isEnabled: boolean;
  surveyData: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SurveySchema = new Schema<ISurvey>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    surveyData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

SurveySchema.index({ isEnabled: 1, updatedAt: -1 });

export const Survey =
  mongoose.models.Survey || mongoose.model<ISurvey>("Survey", SurveySchema);

