import { Request, Response, NextFunction } from 'express';
import { Subscription } from '../models';


export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Individual users (no org) are not subject to org subscription checks
    if (!req.user || !req.user.org) return next();

    const sub = await Subscription.findOne({ org: req.user.org._id || req.user.org });

    if (!sub || !sub.isValid) {
      res.status(402).json({
        success: false,
        message: 'Subscription inactive. Please renew to continue.',
        code: 'SUBSCRIPTION_INACTIVE',
      });
      return;
    }

    // Seat limit check (only relevant for corporate users)
    if (sub.seatsUsed > sub.seats) {
      res.status(402).json({
        success: false,
        message: 'Seat limit exceeded. Contact your administrator.',
        code: 'SEAT_LIMIT_EXCEEDED',
      });
      return;
    }

    req.subscription = sub;
    next();
  } catch (err) {
    next(err);
  }
};
