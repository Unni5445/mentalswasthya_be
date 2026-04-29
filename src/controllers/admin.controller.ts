import { Response, NextFunction, Request } from 'express';
import { User, Org, Subscription, BreathingSession, AuditLog } from '../models';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ErrorResponse from '../utils/errorResponse';

class AdminController {
  // ─── Organization Management ──────────────────────────────────────────────

  static getAllOrgs = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const orgs = await Org.find().populate('subscription');
      res.status(200).json(new ApiResponse(200, { orgs }));
    }
  );

  static toggleOrgStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { orgId } = req.params;
      const { isActive } = req.body;

      const org = await Org.findByIdAndUpdate(orgId, { isActive }, { new: true });
      if (!org) return next(new ErrorResponse('Organization not found', 404));

      res.status(200).json(new ApiResponse(200, { org }, `Organization ${isActive ? 'activated' : 'deactivated'} successfully`));
    }
  );

  // ─── Global Analytics ─────────────────────────────────────────────────────

  static getGlobalStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const totalUsers = await User.countDocuments();
      const totalOrgs = await Org.countDocuments();
      const totalSessions = await BreathingSession.countDocuments({ isCompleted: true });
      
      const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });

      res.status(200).json(new ApiResponse(200, {
        totalUsers,
        totalOrgs,
        totalSessions,
        activeSubscriptions
      }));
    }
  );

  // ─── Manual Overrides ─────────────────────────────────────────────────────

  static updateOrgSubscription = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { orgId } = req.params;
      const { seats, status, plan } = req.body;

      const subscription = await Subscription.findOneAndUpdate(
        { org: orgId },
        { seats, status, plan },
        { new: true }
      );

      if (!subscription) return next(new ErrorResponse('Subscription not found for this organization', 404));

      // Sync totalSeats in Org model
      if (seats) {
        await Org.findByIdAndUpdate(orgId, { totalSeats: seats });
      }

      res.status(200).json(new ApiResponse(200, { subscription }, 'Subscription updated successfully'));
    }
  );

  // ─── Audit Logs ──────────────────────────────────────────────────────────

  static getGlobalAuditLogs = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      const logs = await AuditLog.find()
        .populate('actor', 'name email role')
        .populate('org', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      res.status(200).json(new ApiResponse(200, { logs }));
    }
  );
}

export default AdminController;
