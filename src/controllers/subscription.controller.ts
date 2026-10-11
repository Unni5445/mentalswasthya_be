import { Response, NextFunction, Request } from 'express';
import * as subscriptionService from '../services/subscription.service';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';

class SubscriptionController {
  static getMySubscription = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const subscription = await subscriptionService.getMySubscription(req.user._id);
      res.status(200).json(new ApiResponse(200, { subscription }, 'Subscription loaded'));
    }
  );

  static updateSubscription = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { tier, billingCycle } = req.body;
      const subscription = await subscriptionService.updateSubscription(req.user._id, { tier, billingCycle });
      res.status(200).json(new ApiResponse(200, { subscription }, 'Subscription updated'));
    }
  );

  static stopAutoDebit = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await subscriptionService.stopAutoDebit(req.user._id);
      res.status(200).json(new ApiResponse(200, result, result.message));
    }
  );

  static resumeAutoDebit = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await subscriptionService.resumeAutoDebit(req.user._id);
      res.status(200).json(new ApiResponse(200, result, result.message));
    }
  );

  static cancelSubscription = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await subscriptionService.cancelSubscription(req.user._id);
      res.status(200).json(new ApiResponse(200, result, result.message));
    }
  );

  static reactivateSubscription = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await subscriptionService.reactivateSubscription(req.user._id);
      res.status(200).json(new ApiResponse(200, result, result.message));
    }
  );
}

export default SubscriptionController;
