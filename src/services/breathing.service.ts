import { BreathingSession, AuditLog } from '../models';
import * as streakService from './streak.service';

export const startSession = async (data: {
  user: any;
  org?: any;
  technique?: string | null;
  shape?: string | null;
  durationSeconds: number;
  startedBy: string;
}) => {
  const session = await BreathingSession.create({
    ...data,
    isCompleted: false,
  });

  return session;
};

export const completeSession = async (sessionId: string, userId: any, cyclesCompleted: number) => {
  const session = await BreathingSession.findOne({ _id: sessionId, user: userId });
  if (!session) throw { status: 404, message: 'Session not found' };

  session.isCompleted = true;
  session.completedAt = new Date();
  session.cyclesCompleted = cyclesCompleted;
  await session.save();

  // Record in audit log
  await AuditLog.create({
    actor: userId,
    org: session.org || null,
    action: 'breathing_session_completed',
    targetModel: 'BreathingSession',
    targetId: session._id,
    meta: { technique: session.technique, shape: session.shape, duration: session.durationSeconds }
  });

  // Update streak
  const streak = await streakService.recordSession(userId, session.completedAt);

  return { session, streak };
};

export const getSessionHistory = async (userId: any, limit: number = 10) => {
  return BreathingSession.find({ user: userId, isCompleted: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};
