import mongoose, { Schema, models } from 'mongoose';

const courseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  subjects: [{ 
    name: { type: String, required: true },
    description: { type: String }
  }],
  tags: { type: [String], default: [] },
  status: { type: String, default: 'Draft' },
  type: { type: String, enum: ['free', 'pro', 'featured'], required: true },
  isFeatured: { type: Boolean, default: false },
  // AI-powered recommendation metadata
  recommendationData: {
    targetGrades: { type: [String], default: [] },
    targetAudience: { type: String, default: '' },
    difficultyLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    recommendedFor: { type: [String], default: [] },
    confidence: { type: Number, min: 0, max: 1 },
    lastAnalyzed: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Course = models.Course || mongoose.model('Course', courseSchema);

export default Course;
