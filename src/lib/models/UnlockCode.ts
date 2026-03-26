import mongoose, { Schema, models } from 'mongoose';

export interface IUnlockCode {
  _id: string;
  code: string; // Plain text code for admin visibility
  codeHash: string;
  courseId: string;
  issuedTo?: string;
  issuedByAdminId: string; // Admin ID who issued this
  issuedByRole: 'system_admin' | 'super_admin' | 'admin'; // Admin role
  isUsed: boolean;
  usedByUserId?: string;
  usedDeviceHash?: string;
  usedTimestamp?: Date;
  expiresOn?: Date;
  transactionId: string;
  createdAt: Date;
  updatedAt: Date;
}

const unlockCodeSchema = new Schema<IUnlockCode>({
  code: { type: String, required: true }, // Plain text code for admin visibility
  codeHash: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  issuedTo: { type: String },
  issuedByAdminId: { type: String, required: true },
  issuedByRole: { type: String, required: true, enum: ['system_admin', 'super_admin', 'admin'] },
  isUsed: { type: Boolean, required: true, default: false },
  usedByUserId: { type: String },
  usedDeviceHash: { type: String },
  usedTimestamp: { type: Date },
  expiresOn: { type: Date },
  transactionId: { type: String, required: true },
}, { timestamps: true });

// Index for quick lookup
unlockCodeSchema.index({ courseId: 1, isUsed: 1 });

// Clear any existing UnlockCode model
if (mongoose.models.UnlockCode) {
  delete mongoose.models.UnlockCode;
}

const UnlockCode = mongoose.model<IUnlockCode>('UnlockCode', unlockCodeSchema);

export default UnlockCode;