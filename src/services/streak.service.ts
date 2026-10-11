import { Streak, User, BreathingSession, Notification } from '../models';
import sendEmail from '../utils/sendEmail';

export const getEffectiveCurrentStreak = (streak: any, weeklyOff: string[] = ['SUN']): number => {
  if (!streak || !streak.lastSessionDate || streak.currentStreak <= 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = new Date(streak.lastSessionDate);
  last.setHours(0, 0, 0, 0);

  const DAY_MS = 86400000;
  const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const diffDays = Math.round((today.getTime() - last.getTime()) / DAY_MS);

  if (diffDays <= 0) {
    return streak.currentStreak;
  }

  if (diffDays === 1) {
    return streak.currentStreak;
  }

  for (let i = 1; i < diffDays; i++) {
    const intermediateDate = new Date(last.getTime() + i * DAY_MS);
    const dayCode = DAY_CODES[intermediateDate.getDay()];
    if (!weeklyOff.includes(dayCode)) {
      return 0;
    }
  }

  return streak.currentStreak;
};

export const recordSession = async (userId: any, sessionDate?: Date | null) => {
  const date = sessionDate || new Date();
  let streak = await Streak.findOne({ user: userId });

  if (!streak) {
    streak = new Streak({ user: userId });
  }

  const user = await User.findById(userId).select('weeklyOff');
  const weeklyOff = user?.weeklyOff?.length ? user.weeklyOff : ['SUN'];

  // Use the method defined in the model with user's weeklyOff settings
  streak.recordSession(date, weeklyOff);
  
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

  const user = await User.findById(userId).select('weeklyOff');
  const weeklyOff = user?.weeklyOff?.length ? user.weeklyOff : ['SUN'];

  const effectiveStreak = getEffectiveCurrentStreak(streak, weeklyOff);

  return {
    ...streak.toObject(),
    currentStreak: effectiveStreak,
  };
};

export const sendStreakReminders = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayDayCode = DAY_CODES[new Date().getDay()];

  // Find active users with verified emails
  const users = await User.find({ isActive: true, isEmailVerified: true }).select('name email weeklyOff');
  let sentCount = 0;
  let skippedOffCount = 0;

  for (const user of users) {
    try {
      const weeklyOff = user.weeklyOff?.length ? user.weeklyOff : ['SUN'];

      // Skip sending streak reminder if today is user's weekly off day
      if (weeklyOff.includes(todayDayCode)) {
        skippedOffCount++;
        continue;
      }

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
      const displayStreak = currentStreak > 0 ? currentStreak : 1;

      const frontendUrl = process.env.FRONTEND_URL || 'https://mentalswasthya.com';
      const appUrl = `${frontendUrl}/app/meditation`;

      const subject = `Keep your ${displayStreak}-Day mindfulness streak alive! 🌿`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #7d9667; font-weight: 800; display: block; margin-bottom: 6px;">Mental Swasthya</span>
            <h2 style="color: #0a331c; font-size: 24px; margin: 0;">A quick check-in 🌿</h2>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hi ${user.name || 'there'},</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">We noticed you haven't checked in today!</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Life can get busy, and that’s okay. Remember, your progress isn't defined by a number—it’s about how you feel.</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Taking a break is part of the process, and your mental health comes first.</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Whenever you're ready, we're a click away to help you find a moment of peace today.</p>

          <div style="margin: 28px 0; padding: 22px; background: #f5faf2; border-radius: 16px; text-align: center; border: 1px solid #dbe6d6;">
            <div style="font-size: 13px; color: #526649; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; line-height: 1.4;">Keep your</div>
            <div style="font-size: 36px; font-weight: 900; color: #0a331c; margin: 4px 0; letter-spacing: -0.5px; line-height: 1.2;">${displayStreak}-Day</div>
            <div style="font-size: 16px; color: #2e4a28; font-weight: 700; text-transform: lowercase; letter-spacing: 0.04em; line-height: 1.4;">mindfulness</div>
            <div style="font-size: 14px; color: #526649; font-weight: 700; margin-top: 2px; line-height: 1.4;">streak alive! 🔥</div>
          </div>

          <div style="margin: 32px 0 16px 0; text-align: center;">
            <a href="${appUrl}" style="background-color: #0a331c; color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(10,51,28,0.22); letter-spacing: 0.01em;">
              Start Today's Session
            </a>
          </div>

          <p style="text-align: center; margin: 0 0 24px 0; font-size: 13px; color: #6b7280;">
            Or open directly in browser: <a href="${appUrl}" style="color: #0a331c; font-weight: 600; text-decoration: underline; word-break: break-all;">${appUrl}</a>
          </p>

          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 4px;">Take care,</p>
          <p style="color: #0a331c; font-size: 15px; font-weight: 700; margin-top: 0;">The Mental Swasthya Team</p>

          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
          <div style="text-align: center; line-height: 1.6;">
            <p style="margin: 0; color: #8a9985; font-size: 12px; font-weight: 500;">Sent with care by</p>
            <p style="margin: 2px 0 0 0; color: #0a331c; font-size: 14px; font-weight: 800; letter-spacing: 0.02em;">Mental Swasthya</p>
          </div>
        </div>
      `;

      await sendEmail(user.email, subject, html);

      await Notification.create({
        user: user._id,
        type: 'streak_reminder',
        channel: 'email',
        title: subject,
        body: "We noticed you haven't checked in today! Life can get busy, and that's okay. Keep your mindfulness streak alive whenever you're ready.",
        isRead: false,
        emailStatus: 'sent',
        emailSentAt: new Date(),
      });

      sentCount++;
    } catch (err) {
      console.error(`[Streak Reminder Error] User: ${user.email}:`, err);
    }
  }

  console.log(`[Streak Reminders] Dispatched ${sentCount} reminders (skipped ${skippedOffCount} on weekly off).`);
  return { count: sentCount, skippedOffCount, message: `Dispatched ${sentCount} streak reminder emails (${skippedOffCount} skipped on weekly off).` };
};

