import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  _id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
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

// Índice único para la clave
SettingsSchema.index({ key: 1 }, { unique: true });

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

