import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, ISoftDelete } from '../utils/softDelete.plugin';
import { BREATHING_TECHNIQUES, BREATHING_SHAPES, SESSION_START_OPTIONS, BreathingTechnique, BreathingShape, SessionStartOption } from '../utils/constants';

export interface IBreathingSession extends Document, ISoftDelete {
  user: mongoose.Types.ObjectId;
  org: mongoose.Types.ObjectId | null;
  technique: BreathingTechnique | null;
  shape: BreathingShape | null;
  durationSeconds: number;
  cyclesCompleted: number;
  soundEnabled: boolean;
  startedBy: SessionStartOption;
  completedAt: Date | null;
  isCompleted: boolean;
}

const breathingSessionSchema = new Schema<IBreathingSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    org: { type: Schema.Types.ObjectId, ref: 'Org', default: null },

    technique: {
      type: String,
      enum: [...BREATHING_TECHNIQUES, null],
      default: null,
    },
    shape: {
      type: String,
      enum: [...BREATHING_SHAPES, null],
      default: null,
    },

    durationSeconds: { type: Number, required: true },
    cyclesCompleted: { type: Number, default: 0 },
    soundEnabled: { type: Boolean, default: true },

    startedBy: {
      type: String,
      enum: SESSION_START_OPTIONS,
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

breathingSessionSchema.plugin(softDeletePlugin);

const BreathingSession = mongoose.model<IBreathingSession>('BreathingSession', breathingSessionSchema);
export default BreathingSession;
