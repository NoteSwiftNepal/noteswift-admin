import mongoose, { Schema, models } from 'mongoose';

export interface IAuditLog {
  _id: string;
  userId?: string; // ID of the user who performed the action
  userType: 'admin' | 'teacher' | 'student' | 'system'; // Type of user
  userName: string; // Display name of the user
  userEmail?: string; // Email of the user
  action: string; // Action performed (e.g., 'login', 'course_created', 'user_deleted')
  category: 'authentication' | 'user_management' | 'course_content' | 'enrollment' | 'payment' | 'communication' | 'system';
  resourceType?: string; // Type of resource affected (e.g., 'course', 'user', 'payment')
  resourceId?: string; // ID of the affected resource
  resourceName?: string; // Display name of the affected resource
  details: string; // Detailed description of the action
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    location?: string;
    oldValue?: any;
    newValue?: any;
    additionalData?: Record<string, any>;
  };
  status: 'success' | 'failure' | 'warning';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    required: false
  },
  userType: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'system'],
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    required: false,
    lowercase: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['authentication', 'user_management', 'course_content', 'enrollment', 'payment', 'communication', 'system'],
    required: true
  },
  resourceType: {
    type: String,
    required: false,
    trim: true
  },
  resourceId: {
    type: String,
    required: false
  },
  resourceName: {
    type: String,
    required: false,
    trim: true
  },
  details: {
    type: String,
    required: true,
    trim: true
  },
  metadata: {
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceInfo: { type: String },
    location: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    additionalData: { type: Schema.Types.Mixed }
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userType: 1, timestamp: -1 });

const AuditLog = models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;