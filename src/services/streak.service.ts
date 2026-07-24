import { Streak } from '../models';

export const recordSession = async (userId: any, sessionDate?: Date | null) => {
  const date = sessionDate || new Date();
  let streak = await Streak.findOne({ user: userId });

  if (!streak) {
    streak = new Streak({ user: userId });
  }

  // Use the method defined in the model
  streak.recordSession(date);
  
  // Check for milestones (e.g., 7 days, 30 days)
  const milestoneValues = [7, 30, 90, 365];
  if (milestoneValues.includes(streak.currentStreak)) {
    const alreadyAchieved = streak.milestones.some(m => m.streak === streak!.currentStreak);
    if (!alreadyAchieved) {
      streak.milestones.push({
        streak: streak.currentStreak,
        achievedAt: date
      });
    }
  }

  await streak.save();
  return streak;
};

export const getStreak = async (userId: any) => {
  let streak = await Streak.findOne({ user: userId });
  if (!streak) {
    streak = await Streak.create({ user: userId });
  }
  return streak;
};
