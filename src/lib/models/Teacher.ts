import mongoose, { Schema, models, Model } from 'mongoose';

export interface ITeacher extends mongoose.Document {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status?: string;
  approvalStatus?: string;
  subjects?: any[];
  assignedCourses?: mongoose.Types.ObjectId[]; // Now stores only courseId ObjectIds
}

const teacherSchema = new Schema<ITeacher>({
  email: { type: String, required: true, lowercase: true, trim: true },
  firstName: String,
  lastName: String,
  status: { type: String },
  approvalStatus: { type: String },
  subjects: { type: Array, default: [] },
  assignedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }], // Array of course ObjectIds
}, { timestamps: true });

const Teacher: Model<ITeacher> = models.Teacher || mongoose.model<ITeacher>('Teacher', teacherSchema, 'teachers');
export default Teacher;
