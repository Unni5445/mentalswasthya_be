import mongoose from 'mongoose';
import { BreathingSession, AuditLog, CustomBreathingPreset, Notification } from '../models';
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

  // In-app notification for completed breathing session
  try {
    const totalSecs = session.completedSeconds || session.durationSeconds || 0;
    const durationMin = Math.round(totalSecs / 60) || (totalSecs > 0 ? 1 : 0);
    const techName = session.technique ? `${session.technique} Breathing` : 'Breathing Session';
    const streakText = streak?.currentStreak ? ` • Streak: ${streak.currentStreak} day${streak.currentStreak > 1 ? 's' : ''} 🔥` : '';

    await Notification.create({
      user: userId,
      org: session.org || null,
      type: 'session_completed',
      channel: 'in_app',
      title: `${techName} Completed 🌿`,
      body: `Great practice! You finished ${session.cyclesCompleted || 1} cycle${(session.cyclesCompleted || 1) > 1 ? 's' : ''} (${durationMin} min).${streakText}`,
      isRead: false,
    });
  } catch (notifErr) {
    console.warn('[Breathing Service] Could not create session_completed notification:', notifErr);
  }

  return { session, streak };
};

export const getSessionHistory = async (userId: any, limit: number = 20) => {
  return BreathingSession.find({ user: userId, isCompleted: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getCustomPresets = async (userId: any) => {
  const presets = await CustomBreathingPreset.find({ user: userId })
    .sort({ createdAt: 1 });

  return {
    triangle: presets.filter((p) => p.shape === 'triangle'),
    box: presets.filter((p) => p.shape === 'box'),
    circle: presets.filter((p) => p.shape === 'circle'),
  };
};

export const saveCustomPreset = async (
  userId: any,
  data: {
    shape: 'triangle' | 'box' | 'circle';
    name?: string;
    timingLabel?: string;
    inhale: number;
    hold1?: number;
    exhale: number;
    hold2?: number;
  }
) => {
  const shape = data.shape;
  const inh = Math.max(1, Number(data.inhale) || 1);
  const exh = Math.max(1, Number(data.exhale) || 1);
  const hld1 = Math.max(0, Number(data.hold1) || 0);
  const hld2 = Math.max(0, Number(data.hold2) || 0);

  let defaultLabel = '';
  if (shape === 'box') {
    defaultLabel = `${inh}-${hld1}-${exh}-${hld2}`;
  } else if (shape === 'circle') {
    defaultLabel = `${inh}-${exh}`;
  } else {
    defaultLabel = `${inh}-${hld1}-${exh}`;
  }

  const timingLabel = data.timingLabel || defaultLabel;
  const name = data.name?.trim() || defaultLabel;

  // Retrieve existing presets for this user & shape, sorted oldest first (createdAt: 1)
  const existing = await CustomBreathingPreset.find({ user: userId, shape })
    .sort({ createdAt: 1 });

  let overwrittenItem: any = null;

  // If user tries more than 3, the oldest one shall overwrite (FIFO)
  if (existing.length >= 3) {
    const excessCount = existing.length - 3 + 1;
    const toDelete = existing.slice(0, excessCount);
    for (const item of toDelete) {
      await CustomBreathingPreset.findByIdAndDelete(item._id);
    }
    overwrittenItem = toDelete[0];
  }

  const newPreset = await CustomBreathingPreset.create({
    user: userId,
    shape,
    name,
    timingLabel,
    inhale: inh,
    hold1: hld1,
    exhale: exh,
    hold2: hld2,
  });

  const updatedShapeList = await CustomBreathingPreset.find({ user: userId, shape })
    .sort({ createdAt: 1 });

  return {
    preset: newPreset,
    overwritten: !!overwrittenItem,
    overwrittenPreset: overwrittenItem,
    presets: updatedShapeList,
  };
};

export const deleteCustomPreset = async (presetId: string, userId: any) => {
  const deleted = await CustomBreathingPreset.findOneAndDelete({
    _id: presetId,
    user: userId,
  });
  return deleted;
};

