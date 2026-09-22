import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportMessage extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_review' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const supportMessageSchema = new Schema<ISupportMessage>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      default: 'General Inquiry',
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'resolved'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export const SupportMessage = mongoose.model<ISupportMessage>(
  'SupportMessage',
  supportMessageSchema
);
export default SupportMessage;
