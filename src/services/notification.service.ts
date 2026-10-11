import { Notification } from '../models';

export const createNotification = async (data: {
  user: any;
  org?: any;
  type: string;
  title: string;
  body: string;
  channel?: 'email' | 'in_app' | 'both';
}) => {
  return await Notification.create(data);
};

export const getMyNotifications = async (userId: any, limit: number = 20) => {
  return await Notification.find({
    user: userId,
    channel: { $in: ['in_app', 'both'] },
    type: { $ne: 'streak_reminder' },
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const markAsRead = async (notificationId: string, userId: any) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

export const markAllAsRead = async (userId: any) => {
  return await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};
