import mongoose, { Schema, models } from 'mongoose';

export interface ICourse {
  _id: string;
  title: string;
  description: string;
  subjects?: {
    name: string;
    description?: string;  // Added missing description field
    modules?: {
      name: string;
      description: string;
      duration?: string;
    }[];
  }[];
  tags: string[];
  status: string;
  type: 'featured' | 'pro' | 'free';
  price?: number;
  program?: string; // SEE, +2, Bachelor, CTEVT
  duration?: string;
  rating?: number;
  enrolledCount?: number;
  skills?: string[];
  features?: string[];
  learningPoints?: string[];
  offeredBy?: string; // teacher name
  courseOverview?: string;
  syllabus?: {
    moduleNumber: number;
    title: string;
    description: string;
  }[];
  faq?: {
    question: string;
    answer: string;
  }[];
  icon?: string;
  thumbnail?: string; // Cloudinary image URL
  isFeatured?: boolean;
  keyFeatures?: string[];  // Added missing keyFeatures field
  // AI-powered recommendation metadata
  recommendationData?: {
    targetGrades?: string[];
    targetAudience?: string;
    difficultyLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
    recommendedFor?: string[];
    confidence?: number;
    lastAnalyzed?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  subjects: [{
    name: { type: String, required: true },
    description: { type: String },  // Added missing description field
    modules: [{
      name: { type: String, required: true },
      description: { type: String, required: true },
      duration: { type: String }
    }]
  }],
  tags: { type: [String], default: [] },
  status: { type: String, default: 'Draft' },
  type: { type: String, required: true, enum: ['featured', 'pro', 'free'] },
  price: { type: Number },
  program: { type: String }, // SEE, +2, Bachelor, CTEVT
  duration: { type: String },
  rating: { type: Number },
  enrolledCount: { type: Number, default: 0 },
  skills: { type: [String], default: [] },
  features: { type: [String], default: [] },
  learningPoints: { type: [String], default: [] },
  offeredBy: { type: String },
  courseOverview: { type: String },
  syllabus: [{
    moduleNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true }
  }],
  faq: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  icon: { type: String },
  thumbnail: { type: String }, // Cloudinary image URL
  isFeatured: { type: Boolean, default: false },
  keyFeatures: { type: [String], default: [] },  // Added missing keyFeatures field
  // AI-powered recommendation metadata
  recommendationData: {
    targetGrades: { type: [String], default: [] },
    targetAudience: { type: String, default: '' },
    difficultyLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    recommendedFor: { type: [String], default: [] },
    confidence: { type: Number, min: 0, max: 1 },
    lastAnalyzed: { type: Date },
  },
}, { timestamps: true });

// Add indexes for performance
courseSchema.index({ status: 1 });
courseSchema.index({ type: 1 });
courseSchema.index({ title: 1 });
courseSchema.index({ isFeatured: 1 });

// Clear any existing Course model to ensure schema updates take effect
if (mongoose.models.Course) {
  delete mongoose.models.Course;
}

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;