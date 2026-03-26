import mongoose, { Schema, models, Model } from 'mongoose';

export interface IAssignedCourse {
  courseId: string;
  courseName: string;
  subject: string;
  assignedAt: Date;
}

export interface ITeacher extends mongoose.Document {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status?: string;
  approvalStatus?: string;
  subjects?: any[];
  assignedCourses?: IAssignedCourse[];
}

const assignedCourseSchema = new Schema<IAssignedCourse>({
  courseId: { type: String, required: true },
  courseName: { type: String, required: true },
  subject: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
}, { _id: false });

const teacherSchema = new Schema<ITeacher>({
  email: { type: String, required: true, lowercase: true, trim: true },
  firstName: String,
  lastName: String,
  status: { type: String },
  approvalStatus: { type: String },
  subjects: { type: Array, default: [] },
  assignedCourses: { type: [assignedCourseSchema], default: [] },
}, { timestamps: true });

const Teacher: Model<ITeacher> = models.Teacher || mongoose.model<ITeacher>('Teacher', teacherSchema, 'teachers');
export default Teacher;
