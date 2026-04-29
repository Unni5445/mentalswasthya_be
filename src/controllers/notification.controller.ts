import { Response, NextFunction, Request } from 'express';
import * as notificationService from '../services/notification.service';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';

class NotificationController {
  static getMyNotifications = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await notificationService.getMyNotifications(req.user._id, limit);
      res.status(200).json(new ApiResponse(200, { notifications }));
    }
  );

  static markRead = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, req.user._id);
      res.status(200).json(new ApiResponse(200, { notification }, 'Notification marked as read'));
    }
  );

  static markAllRead = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      await notificationService.markAllAsRead(req.user._id);
      res.status(200).json(new ApiResponse(200, {}, 'All notifications marked as read'));
    }
  );
}

export default NotificationController;
