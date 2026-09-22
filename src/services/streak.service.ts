import { Streak, User, BreathingSession, Notification } from '../models';
import sendEmail from '../utils/sendEmail';

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

export const sendStreakReminders = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Find active users with verified emails
  const users = await User.find({ isActive: true, isEmailVerified: true }).select('name email');
  let sentCount = 0;

  for (const user of users) {
    try {
      // Check if user completed any breathing session today
      const sessionToday = await BreathingSession.findOne({
        user: user._id,
        isCompleted: true,
        completedAt: { $gte: startOfDay },
      });

      if (sessionToday) continue; // Already completed today!

      // Avoid duplicate reminder on the same day
      const alreadyNotified = await Notification.findOne({
        user: user._id,
        type: 'streak_reminder',
        createdAt: { $gte: startOfDay },
      });

      if (alreadyNotified) continue;

      const streak = await Streak.findOne({ user: user._id });
      const currentStreak = streak?.currentStreak || 0;

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const appUrl = `${frontendUrl}/app/meditation`;

      const subject = currentStreak > 0
        ? `Keep your ${currentStreak}-day mindfulness streak alive! 🔥`
        : `Take 3 mindful minutes for yourself today 🌿`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #7d9667; font-weight: 800; display: block; margin-bottom: 6px;">Daily Mindfulness Reminder</span>
            <h2 style="color: #0a331c; font-size: 24px; margin: 0;">${subject}</h2>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello ${user.name || 'there'},</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            ${currentStreak > 0
              ? `You have an active <strong>${currentStreak}-day mindfulness streak</strong>! Complete your daily breathing session before midnight to keep your momentum going and stay grounded.`
              : `A brief 3-minute mindful breathing exercise today can help reset your stress levels, improve sleep quality, and cultivate inner calm.`}
          </p>

          <div style="margin: 28px 0; padding: 20px; background: #f5faf2; border-radius: 14px; text-align: center; border: 1px solid #dbe6d6;">
            <span style="font-size: 12px; color: #526649; font-weight: 600; display: block; margin-bottom: 4px;">Active Daily Streak</span>
            <span style="font-size: 34px; font-weight: 900; color: #1e3019;">${currentStreak} ${currentStreak === 1 ? 'Day' : 'Days'} 🔥</span>
          </div>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${appUrl}" style="background-color: #0a331c; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 14px; display: inline-block;">
              Start Today's Session
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-bottom: 0;">
            Sent with care by Mental Swasthya &bull; team@mentalswasthya.com
          </p>
        </div>
      `;

      await sendEmail(user.email, subject, html);

      await Notification.create({
        user: user._id,
        type: 'streak_reminder',
        channel: 'both',
        title: subject,
        body: currentStreak > 0
          ? `Don't break your ${currentStreak}-day streak! Practice a session today.`
          : 'Take 3 mindful minutes today to support your mental wellbeing.',
        isRead: false,
        emailStatus: 'sent',
        emailSentAt: new Date(),
      });

      sentCount++;
    } catch (err) {
      console.error(`[Streak Reminder Error] User: ${user.email}:`, err);
    }
  }

  console.log(`[Streak Reminders] Dispatched ${sentCount} reminders.`);
  return { count: sentCount, message: `Dispatched ${sentCount} streak reminder emails.` };
};

