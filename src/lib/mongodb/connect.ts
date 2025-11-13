import mongoose from 'mongoose';

// Cadena de conexión de MongoDB Atlas
// Base de datos: Pcn-Cardio
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://maalvima1_db_user:yisdUlLc8kmEKGc8@cluster0.lawrc6d.mongodb.net/Pcn-Cardio?retryWrites=true&w=majority&appName=Cluster0';

// Nombre de la base de datos
const DB_NAME = 'Pcn-Cardio';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Usar una variable global para cachear la conexión en desarrollo
// En producción, Next.js puede reutilizar conexiones entre requests
declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, {
      ...opts,
      dbName: DB_NAME,
    }).then((mongoose) => {
      console.log(`MongoDB connected successfully to database: ${DB_NAME}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;

