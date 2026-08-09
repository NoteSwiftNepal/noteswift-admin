import mongoose, { Schema, models } from 'mongoose';

export interface ITransaction {
  _id: string;
  buyerName: string;
  contact: string;
  paymentReferenceType?: 'transaction-id' | 'screenshot';
  paymentReference?: string;
  paymentMethod: 'esewa-personal' | 'bank-transfer' | 'cash' | 'other' | 'esewa-gateway';
  courseId: string;
  amount: number;
  notes?: string;
  status: 'pending-code-redemption' | 'completed' | 'cancelled' | 'pending-gateway' | 'failed';
  unlockCodeId?: string;
  issuedByAdminId?: string; // Admin ID who issued this — absent on automated esewa-gateway transactions
  issuedByRole?: 'system_admin' | 'super_admin' | 'admin'; // Admin role — absent on automated esewa-gateway transactions
  createdAt: Date;
  updatedAt: Date;

  // eSewa automated-gateway fields (only set when paymentMethod === 'esewa-gateway')
  studentId?: string;
  transactionUuid?: string;
  esewaRefId?: string;
  productCode?: string;
  gatewayStatus?: 'PENDING' | 'COMPLETE' | 'FULL_REFUND' | 'PARTIAL_REFUND' | 'AMBIGUOUS' | 'NOT_FOUND' | 'CANCELED';
  gatewayInitiatedAt?: Date;
  gatewayVerifiedAt?: Date;
  gatewayRawStatusResponse?: Record<string, any>;
  gatewayVerifyAttempts?: { at: Date; result: string }[];
}

// This model reads from the same MongoDB collection the backend's canonical
// shared/models/Transaction.model.ts writes to (see src/app/actions.ts for
// the read-only usage) — only the fields this repo actually queries/reads
// need to be declared here; all esewa-gateway writes happen backend-side.
const transactionSchema = new Schema<ITransaction>({
  buyerName: { type: String, required: true },
  contact: { type: String, required: true },
  paymentReferenceType: { type: String, enum: ['transaction-id', 'screenshot'] },
  paymentReference: { type: String },
  paymentMethod: { type: String, required: true, enum: ['esewa-personal', 'bank-transfer', 'cash', 'other', 'esewa-gateway'] },
  courseId: { type: String, required: true },
  amount: { type: Number, required: true },
  notes: { type: String },
  status: { type: String, required: true, enum: ['pending-code-redemption', 'completed', 'cancelled', 'pending-gateway', 'failed'], default: 'pending-code-redemption' },
  unlockCodeId: { type: String },
  issuedByAdminId: { type: String },
  issuedByRole: { type: String, enum: ['system_admin', 'super_admin', 'admin'] },

  studentId: { type: String },
  transactionUuid: { type: String },
  esewaRefId: { type: String },
  productCode: { type: String },
  gatewayStatus: { type: String, enum: ['PENDING', 'COMPLETE', 'FULL_REFUND', 'PARTIAL_REFUND', 'AMBIGUOUS', 'NOT_FOUND', 'CANCELED'] },
  gatewayInitiatedAt: { type: Date },
  gatewayVerifiedAt: { type: Date },
  gatewayRawStatusResponse: { type: Schema.Types.Mixed },
  gatewayVerifyAttempts: [{ at: { type: Date }, result: { type: String } }],
}, { timestamps: true, strict: false });

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