import mongoose from 'mongoose';
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

export const completeSession = async (
  sessionId: string,
  userId: any,
  cyclesCompleted: number,
  completedSeconds?: number
) => {
  let session = null;
  if (mongoose.Types.ObjectId.isValid(sessionId)) {
    session = await BreathingSession.findOne({ _id: sessionId, user: userId });
  }

  const finalCompletedSeconds =
    completedSeconds !== undefined && completedSeconds !== null
      ? Number(completedSeconds)
      : session
      ? session.durationSeconds
      : 180;

  if (!session) {
    session = await BreathingSession.create({
      user: userId,
      durationSeconds: finalCompletedSeconds || 180,
      completedSeconds: finalCompletedSeconds || 180,
      startedBy: 'manual',
      isCompleted: true,
      completedAt: new Date(),
      cyclesCompleted: cyclesCompleted || 1,
    });
  } else {
    session.isCompleted = true;
    session.completedAt = new Date();
    session.cyclesCompleted = cyclesCompleted;
    session.completedSeconds = finalCompletedSeconds;
    await session.save();
  }

  // Record in audit log
  await AuditLog.create({
    actor: userId,
    org: session.org || null,
    action: 'breathing_session_completed',
    targetModel: 'BreathingSession',
    targetId: session._id,
    meta: {
      technique: session.technique,
      shape: session.shape,
      duration: session.durationSeconds,
      completedSeconds: session.completedSeconds,
      cyclesCompleted: session.cyclesCompleted,
    },
  });

  // Update streak
  const streak = await streakService.recordSession(userId, session.completedAt || undefined);

  return { session, streak };
};

export const getSessionHistory = async (userId: any, limit: number = 20) => {
  return BreathingSession.find({ user: userId, isCompleted: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};
