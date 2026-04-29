import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  org: mongoose.Types.ObjectId | null;
  type:
    | 'streak_reminder'
    | 'streak_milestone'
    | 'subscription_expiring'
    | 'subscription_expired'
    | 'report_ready'
    | 'system';
  channel: 'email' | 'in_app' | 'both';
  title: string;
  body: string;
  isRead: boolean;
  readAt: Date | null;
  emailSentAt: Date | null;
  emailStatus: 'pending' | 'sent' | 'failed' | 'skipped';
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    org: { type: Schema.Types.ObjectId, ref: 'Org', default: null },

    type: {
      type: String,
      enum: [
        'streak_reminder',
        'streak_milestone',
        'subscription_expiring',
        'subscription_expired',
        'report_ready',
        'system',
      ],
      required: true,
    },

    channel: {
      type: String,
      enum: ['email', 'in_app', 'both'],
      default: 'both',
    },

    title: { type: String, required: true },
    body: { type: String, required: true },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    emailSentAt: { type: Date, default: null },
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ org: 1, type: 1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
