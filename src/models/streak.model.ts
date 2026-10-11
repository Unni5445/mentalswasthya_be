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
  recordSession(sessionDate: Date, weeklyOff?: string[]): void;
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
streakSchema.methods.recordSession = function (sessionDate: Date, weeklyOff: string[] = ['SUN']) {
  const today = new Date(sessionDate);
  today.setHours(0, 0, 0, 0);

  const last = this.lastSessionDate ? new Date(this.lastSessionDate) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
  }

  const DAY_MS = 86400000;
  const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  if (!last) {
    this.currentStreak = 1; // first session
  } else {
    const diffDays = Math.round((today.getTime() - last.getTime()) / DAY_MS);

    if (diffDays === 0) {
      // Same day, no streak count change
    } else if (diffDays === 1) {
      // Direct consecutive day
      this.currentStreak += 1;
    } else if (diffDays > 1) {
      // Check if all skipped days in between were excused weekly off days
      let allIntermediateWereOff = true;
      for (let i = 1; i < diffDays; i++) {
        const intermediateDate = new Date(last.getTime() + i * DAY_MS);
        const dayCode = DAY_CODES[intermediateDate.getDay()];
        if (!weeklyOff.includes(dayCode)) {
          allIntermediateWereOff = false;
          break;
        }
      }

      if (allIntermediateWereOff) {
        // Continued across weekly off
        this.currentStreak += 1;
      } else {
        // Missed an active day, reset
        this.currentStreak = 1;
      }
    }
  }

  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }

  this.totalSessionsCompleted += 1;
  this.lastSessionDate = sessionDate;
};

const Streak = mongoose.model<IStreak>('Streak', streakSchema);
export default Streak;
