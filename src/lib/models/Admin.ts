import mongoose, { Schema, models } from 'mongoose';

export interface IAdmin {
  _id: string;
  email: string;
  name: string;
  password: string;
  role: 'system_admin' | 'super_admin' | 'admin';
  isActive: boolean;
  invitedBy?: string;
  invitationToken?: string;
  invitationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

const adminSchema = new Schema<IAdmin>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: function(this: IAdmin) {
      // Password is required only for active admins (not pending invitations)
      return this.isActive;
    }
  },
  role: {
    type: String,
    enum: ['system_admin', 'super_admin', 'admin'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  invitedBy: {
    type: String,
    ref: 'Admin'
  },
  invitationToken: String,
  invitationExpires: Date,
  lastLogin: Date
}, {
  timestamps: true
});

// Index for faster queries
adminSchema.index({ role: 1 });
adminSchema.index({ invitationToken: 1 });

const Admin = models.Admin || mongoose.model<IAdmin>('Admin', adminSchema);

export default Admin;