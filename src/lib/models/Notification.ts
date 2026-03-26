import mongoose, { Schema, models } from 'mongoose';

export interface INotification {
  _id?: string;
  id: string;
  type: 'homepage' | 'push';
  title: string;
  description?: string;
  badge?: string;
  badgeIcon?: string;
  thumbnail?: string;
  showDontShowAgain?: boolean;
  buttonText?: string;
  buttonIcon?: string;
  subject?: string;
  message?: string;
  targetAudience?: 'all' | 'students' | 'admins';
  status: 'draft' | 'sent' | 'scheduled';
  sentAt?: Date;
  scheduledFor?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  id: { type: String, required: true, unique: true },
  type: {
    type: String,
    required: true,
    enum: ['homepage', 'push']
  },
  title: { type: String, required: true },
  description: { type: String },
  badge: { type: String },
  badgeIcon: { type: String },
  thumbnail: { type: String },
  showDontShowAgain: { type: Boolean, default: true },
  buttonText: { type: String },
  buttonIcon: { type: String },
  subject: { type: String },
  message: { type: String },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'admins'],
    default: 'all'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'scheduled'],
    default: 'draft'
  },
  sentAt: { type: Date },
  scheduledFor: { type: Date },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Notification = models.Notification || mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;