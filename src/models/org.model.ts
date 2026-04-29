import mongoose, { Document, Schema } from 'mongoose';

export interface IOrg extends Document {
  name: string;
  domain?: string;
  adminEmail: string;
  subscription: mongoose.Types.ObjectId | null;
  settings: {
    sessionTimeoutMinutes: number;
    streakReminderEnabled: boolean;
    streakReminderTime: string;
    appStartOption: 'first_login_of_day' | 'every_login' | 'manual';
  };
  isActive: boolean;
  totalSeats: number;
}

const orgSchema = new Schema<IOrg>(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, trim: true, lowercase: true },
    adminEmail: { type: String, required: true, lowercase: true },

    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },

    settings: {
      sessionTimeoutMinutes: { type: Number, default: 30 },
      streakReminderEnabled: { type: Boolean, default: true },
      streakReminderTime: { type: String, default: '09:00' },
      appStartOption: {
        type: String,
        enum: ['first_login_of_day', 'every_login', 'manual'],
        default: 'first_login_of_day',
      },
    },

    isActive: { type: Boolean, default: true },
    totalSeats: { type: Number, default: 0 },
  },
  { timestamps: true }
);

orgSchema.index({ domain: 1 });

const Org = mongoose.model<IOrg>('Org', orgSchema);
export default Org;
