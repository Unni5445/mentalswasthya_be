import mongoose, { Document, Schema } from 'mongoose';

export interface IBreathingSession extends Document {
  user: mongoose.Types.ObjectId;
  org: mongoose.Types.ObjectId | null;
  technique: '4-7-8' | '4-4-4-4' | '4-4' | null;
  shape: 'box' | 'triangle' | 'circle' | null;
  durationSeconds: number;
  cyclesCompleted: number;
  soundEnabled: boolean;
  startedBy: 'first_login_of_day' | 'every_login' | 'manual';
  completedAt: Date | null;
  isCompleted: boolean;
}

const breathingSessionSchema = new Schema<IBreathingSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    org: { type: Schema.Types.ObjectId, ref: 'Org', default: null },

    technique: {
      type: String,
      enum: ['4-7-8', '4-4-4-4', '4-4', null],
      default: null,
    },
    shape: {
      type: String,
      enum: ['box', 'triangle', 'circle', null],
      default: null,
    },

    durationSeconds: { type: Number, required: true },
    cyclesCompleted: { type: Number, default: 0 },
    soundEnabled: { type: Boolean, default: true },

    startedBy: {
      type: String,
      enum: ['first_login_of_day', 'every_login', 'manual'],
      required: true,
    },

    completedAt: { type: Date, default: null },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

breathingSessionSchema.index({ user: 1, createdAt: -1 });
breathingSessionSchema.index({ org: 1, createdAt: -1 });
breathingSessionSchema.index({ user: 1, isCompleted: 1 });

const BreathingSession = mongoose.model<IBreathingSession>('BreathingSession', breathingSessionSchema);
export default BreathingSession;
