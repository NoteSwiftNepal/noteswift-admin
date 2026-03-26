import mongoose, { Schema, models, Model, Document } from 'mongoose';

// Interface for module content configuration
export interface IModuleContent {
  moduleNumber: number;
  moduleName: string;
  hasVideo: boolean;
  videoUrl?: string;
  videoTitle?: string;
  videoDuration?: string;
  videoUploadedAt?: Date;
  
  hasNotes: boolean;
  notesUrl?: string;
  notesTitle?: string;
  notesUploadedAt?: Date;
  
  hasLiveClass: boolean;
  liveClassSchedule?: {
    scheduledAt: Date;
    duration: number;
    meetingLink?: string;
    status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  }[];
  
  hasTest: boolean;
  testIds?: mongoose.Types.ObjectId[];
  
  hasQuestions: boolean;
  questionIds?: mongoose.Types.ObjectId[];
  
  order: number;
  isActive: boolean;
}

// Interface for subject content
export interface ISubjectContent extends Document {
  courseId: mongoose.Types.ObjectId;
  courseName: string;
  subjectName: string;
  teacherId: mongoose.Types.ObjectId;
  teacherName: string;
  teacherEmail: string;
  
  modules: IModuleContent[];
  
  description?: string;
  syllabus?: string;
  objectives?: string[];
  
  isActive: boolean;
  lastUpdated: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const moduleContentSchema = new Schema<IModuleContent>({
  moduleNumber: { type: Number, required: true },
  moduleName: { type: String, required: true },
  
  hasVideo: { type: Boolean, default: false },
  videoUrl: { type: String },
  videoTitle: { type: String },
  videoDuration: { type: String },
  videoUploadedAt: { type: Date },
  
  hasNotes: { type: Boolean, default: false },
  notesUrl: { type: String },
  notesTitle: { type: String },
  notesUploadedAt: { type: Date },
  
  hasLiveClass: { type: Boolean, default: false },
  liveClassSchedule: [{
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, required: true },
    meetingLink: { type: String },
    status: { 
      type: String, 
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled'
    }
  }],
  
  hasTest: { type: Boolean, default: false },
  testIds: [{ type: Schema.Types.ObjectId, ref: 'Test' }],
  
  hasQuestions: { type: Boolean, default: false },
  questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  
  order: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const subjectContentSchema = new Schema<ISubjectContent>({
  courseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true 
  },
  courseName: { type: String, required: true },
  subjectName: { type: String, required: true, index: true },
  teacherId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Teacher', 
    required: true,
    index: true 
  },
  teacherName: { type: String, required: true },
  teacherEmail: { type: String, required: true },
  
  modules: [moduleContentSchema],
  
  description: { type: String },
  syllabus: { type: String },
  objectives: [{ type: String }],
  
  isActive: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

subjectContentSchema.index({ courseId: 1, subjectName: 1 });
subjectContentSchema.index({ teacherId: 1, isActive: 1 });

subjectContentSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Clear any existing model to ensure schema updates take effect
if (mongoose.models.SubjectContent) {
  delete mongoose.models.SubjectContent;
}

const SubjectContent: Model<ISubjectContent> = 
  mongoose.model<ISubjectContent>('SubjectContent', subjectContentSchema);

export default SubjectContent;
