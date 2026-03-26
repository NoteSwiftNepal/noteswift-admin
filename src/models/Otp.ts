import mongoose, { Schema, models } from 'mongoose';

const otpSchema = new Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expires: { type: Date, required: true },
});

const Otp = models.Otp || mongoose.model('Otp', otpSchema);

export default Otp;
