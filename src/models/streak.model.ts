import mongoose, { Document, Schema } from 'mongoose';

export interface IStreak extends Document {
  user: mongoose.Types.ObjectId;
  currentStreak: number;
  longestStreak: number;
  totalSessionsCompleted: number;
  lastSessionDate: Date | null;
  milestones: Array<{
    streak: number;
    achievedAt: Date;
  }>;
  recordSession(sessionDate: Date): void;
}

const streakSchema = new Schema<IStreak>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalSessionsCompleted: { type: Number, default: 0 },

    lastSessionDate: { type: Date, default: null },

    milestones: [
      {
        streak: { type: Number },
        achievedAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

// Call after every completed BreathingSession
streakSchema.methods.recordSession = function (sessionDate: Date) {
  const today = new Date(sessionDate).setHours(0, 0, 0, 0);
  const last = this.lastSessionDate
    ? new Date(this.lastSessionDate).setHours(0, 0, 0, 0)
    : null;

  const diffDays = last ? (today - last) / 86400000 : null;

  if (diffDays === null || diffDays > 1) {
    this.currentStreak = 1; // reset or first session
  } else if (diffDays === 1) {
    this.currentStreak += 1;
  }
  // diffDays === 0 → same day, no streak change

  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }

  this.totalSessionsCompleted += 1;
  this.lastSessionDate = sessionDate;
};

const Streak = mongoose.model<IStreak>('Streak', streakSchema);
export default Streak;
