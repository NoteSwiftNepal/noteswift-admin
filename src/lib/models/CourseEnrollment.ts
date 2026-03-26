import mongoose, { Schema, models } from 'mongoose';

export interface ICourseEnrollment {
  _id: string;
  courseId: string;
  studentId: string;
  enrolledAt: Date;
  progress: number;
  isActive: boolean;
  completedAt?: Date;
  lastAccessedAt: Date;
  completedLessons: Array<{
    lessonId: string;
    completedAt: Date;
  }>;
  moduleProgress: Array<{
    moduleNumber: number;
    videoCompleted: boolean;
    videoCompletedAt?: Date;
    notesCompleted: boolean;
    notesCompletedAt?: Date;
    sectionsCompleted: number[];
    progress: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const courseEnrollmentSchema = new Schema<ICourseEnrollment>({
  courseId: { type: String, required: true },
  studentId: { type: String, required: true },
  enrolledAt: { type: Date, default: Date.now },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  isActive: { type: Boolean, default: true },
  completedAt: { type: Date },
  lastAccessedAt: { type: Date, default: Date.now },
  completedLessons: [{
    lessonId: { type: String, required: true },
    completedAt: { type: Date, default: Date.now }
  }],
  moduleProgress: [{
    moduleNumber: { type: Number, required: true },
    videoCompleted: { type: Boolean, default: false },
    videoCompletedAt: { type: Date },
    notesCompleted: { type: Boolean, default: false },
    notesCompletedAt: { type: Date },
    sectionsCompleted: { type: [Number], default: [] },
    progress: { type: Number, min: 0, max: 100, default: 0 }
  }],
}, { timestamps: true });

// Add indexes for performance
courseEnrollmentSchema.index({ courseId: 1 });
courseEnrollmentSchema.index({ studentId: 1 });
courseEnrollmentSchema.index({ enrolledAt: -1 });
courseEnrollmentSchema.index({ isActive: 1 });

// Clear any existing CourseEnrollment model
if (mongoose.models.CourseEnrollment) {
  delete mongoose.models.CourseEnrollment;
}

const CourseEnrollment = mongoose.model<ICourseEnrollment>('CourseEnrollment', courseEnrollmentSchema);

export default CourseEnrollment;