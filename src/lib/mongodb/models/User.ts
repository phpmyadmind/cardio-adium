import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  medicalId: string;
  name: string;
  city?: string;
  specialty?: string;
  isAdmin?: boolean;
  password?: string; // Contraseña encriptada para admins
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
  termsAccepted?: boolean;
  question?: string;
  answer?: string;
  event_tracker?: string; // ID del evento tracker asignado
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    medicalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    city: {
      type: String,
    },
    specialty: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    termsAccepted: {
      type: Boolean,
    },
    question: {
      type: String,
    },
    answer: {
      type: String,
    },
    event_tracker: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true, // Crea createdAt y updatedAt automáticamente
  }
);

// Índices compuestos para búsquedas rápidas
UserSchema.index({ email: 1 });
UserSchema.index({ medicalId: 1 });
UserSchema.index({ isAdmin: 1 });
UserSchema.index({ event_tracker: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

