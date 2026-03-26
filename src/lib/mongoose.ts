import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn('adminWebApp: MONGO_URI not set in env');
}

let cached: any = (global as any)._admin_mongoose;
if (!cached) cached = (global as any)._admin_mongoose = { conn: null, promise: null };

export default async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI!, {}).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Alias for backward compatibility
export const dbConnect = connectDB;
