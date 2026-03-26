import mongoose, { Schema, models } from 'mongoose';

export interface ITransaction {
  _id: string;
  buyerName: string;
  contact: string;
  paymentReferenceType?: 'transaction-id' | 'screenshot';
  paymentReference?: string;
  paymentMethod: 'esewa-personal' | 'bank-transfer' | 'cash' | 'other';
  courseId: string;
  amount: number;
  notes?: string;
  status: 'pending-code-redemption' | 'completed' | 'cancelled';
  unlockCodeId?: string;
  issuedByAdminId: string; // Admin ID who issued this
  issuedByRole: 'system_admin' | 'super_admin' | 'admin'; // Admin role
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  buyerName: { type: String, required: true },
  contact: { type: String, required: true },
  paymentReferenceType: { type: String, enum: ['transaction-id', 'screenshot'] },
  paymentReference: { type: String },
  paymentMethod: { type: String, required: true, enum: ['esewa-personal', 'bank-transfer', 'cash', 'other'] },
  courseId: { type: String, required: true },
  amount: { type: Number, required: true },
  notes: { type: String },
  status: { type: String, required: true, enum: ['pending-code-redemption', 'completed', 'cancelled'], default: 'pending-code-redemption' },
  unlockCodeId: { type: String },
  issuedByAdminId: { type: String, required: true },
  issuedByRole: { type: String, required: true, enum: ['system_admin', 'super_admin', 'admin'] },
}, { timestamps: true });

// Add indexes for performance
transactionSchema.index({ status: 1 });
transactionSchema.index({ courseId: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ issuedByAdminId: 1 });

// Clear any existing Transaction model
if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;