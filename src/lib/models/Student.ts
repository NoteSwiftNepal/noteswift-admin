import mongoose, { Schema, models, Model } from 'mongoose';

export interface IStudent extends mongoose.Document {
  full_name: string;
  grade: number;
  email: string;
  address: {
    institution: string;
    district: string;
    province: string;
  };
  avatarEmoji: string;
  profileImage?: string;
  enrolledCourses: string[];
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentSchema = new Schema<IStudent>({
  full_name: { type: String, required: true },
  grade: { type: Number, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  address: {
    institution: { type: String, required: true },
    district: { type: String, required: true },
    province: { type: String, required: true },
  },
  avatarEmoji: { type: String, default: '👤' },
  profileImage: String,
  enrolledCourses: { type: [String], default: [] },
  lastLogin: Date,
}, { timestamps: true });

const Student: Model<IStudent> = models.Student || mongoose.model<IStudent>('Student', studentSchema, 'students');
export default Student;