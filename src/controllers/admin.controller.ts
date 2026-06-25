import { Response, NextFunction, Request } from 'express';
import { User, Org, Subscription, BreathingSession, AuditLog, Plan } from '../models';
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

  // ─── User Management ──────────────────────────────────────────────────────

  static getAllUsers = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { role, isActive, search } = req.query;
      const query: any = {};

      if (role) query.role = role;
      if (isActive) query.isActive = isActive === 'true';
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const users = await User.find(query)
        .populate('org', 'name')
        .sort({ createdAt: -1 });

      // Attach subscription status to each user
      const usersWithSub = await Promise.all(users.map(async (user) => {
        const sub = await Subscription.findOne({ 
          $or: [{ user: user._id }, { org: user.org }] 
        }).populate('plan');
        
        return {
          ...user.toObject(),
          subscription: sub ? {
            plan: (sub.plan as any)?.name,
            status: sub.status,
            isValid: sub.isValid
          } : null
        };
      }));

      res.status(200).json(new ApiResponse(200, { count: users.length, users: usersWithSub }));
    }
  );

  static getUserDetails = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.params;

      const user = await User.findById(userId).populate('org');
      if (!user) return next(new ErrorResponse('User not found', 404));

      // Fetch individual or org subscription
      const subscription = await Subscription.findOne({ 
        $or: [{ user: userId }, { org: user.org?._id }] 
      }).populate('plan');

      // Fetch wellness insights (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const insights = await BreathingSession.aggregate([
        { $match: { user: user._id, isCompleted: true, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: '$technique',
            totalSessions: { $sum: 1 },
            totalDuration: { $sum: '$durationSeconds' },
            avgCycles: { $avg: '$cyclesCompleted' }
          }
        },
        {
          $project: {
            technique: '$_id',
            totalSessions: 1,
            totalDuration: 1,
            avgCycles: 1
          }
        }
      ]);

      // Fetch last 20 sessions
      const recentSessions = await BreathingSession.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20);

      res.status(200).json(new ApiResponse(200, {
        user,
        subscription,
        insights,
        recentSessions
      }));
    }
  );

  static toggleUserStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true });
      if (!user) return next(new ErrorResponse('User not found', 404));

      res.status(200).json(new ApiResponse(200, { user }, `User ${isActive ? 'activated' : 'deactivated'} successfully`));
    }
  );

  // ─── Plan Management ──────────────────────────────────────────────────────

  static getAllPlans = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const plans = await Plan.find().sort({ type: 1, price: 1 });
      res.status(200).json(new ApiResponse(200, { plans }));
    }
  );

  static createPlan = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const plan = await Plan.create(req.body);
      res.status(201).json(new ApiResponse(201, { plan }, 'Plan created successfully'));
    }
  );

  static updatePlan = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { planId } = req.params;
      const plan = await Plan.findByIdAndUpdate(planId, req.body, { new: true, runValidators: true });
      if (!plan) return next(new ErrorResponse('Plan not found', 404));
      res.status(200).json(new ApiResponse(200, { plan }, 'Plan updated successfully'));
    }
  );

  static deletePlan = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { planId } = req.params;
      const plan = await Plan.findById(planId);
      if (!plan) return next(new ErrorResponse('Plan not found', 404));
      
      await plan.softDelete();
      res.status(200).json(new ApiResponse(200, {}, 'Plan deleted successfully'));
    }
  );
}

export default AdminController;
