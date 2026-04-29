import { Response, NextFunction, Request } from 'express';
import { User, Org, Subscription, BreathingSession } from '../models';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ErrorResponse from '../utils/errorResponse';

class OrgController {
  static getEmployees = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const orgId = req.user.org;
      if (!orgId) {
        return next(new ErrorResponse('Not associated with an organization', 403));
      }

      const employees = await User.find({ org: orgId, role: 'employee' }).select('-refreshToken');
      res.status(200).json(new ApiResponse(200, { count: employees.length, employees }));
    }
  );

  static getOrgStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const orgId = req.user.org;
      const org = await Org.findById(orgId).populate('subscription');
      if (!org) {
        return next(new ErrorResponse('Org not found', 404));
      }

      const employeeCount = await User.countDocuments({ org: orgId, role: 'employee' });

      res.status(200).json(new ApiResponse(200, {
        name: org.name,
        totalSeats: org.totalSeats,
        seatsUsed: (org.subscription as any)?.seatsUsed || 0,
        employeeCount,
        isActive: org.isActive
      }));
    }
  );

  static removeEmployee = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const orgId = req.user.org;

      const employee = await User.findOne({ _id: id, org: orgId, role: 'employee' });
      if (!employee) {
        return next(new ErrorResponse('Employee not found', 404));
      }

      employee.isActive = false;
      employee.org = null;
      await employee.save();

      await Subscription.findOneAndUpdate({ org: orgId }, { $inc: { seatsUsed: -1 } });

      res.status(200).json(new ApiResponse(200, {}, 'Employee removed successfully'));
    }
  );

  static getWellnessInsights = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const orgId = req.user.org;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = await BreathingSession.aggregate([
        { $match: { org: orgId, isCompleted: true, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: '$technique',
            totalSessions: { $sum: 1 },
            avgCycles: { $avg: '$cyclesCompleted' },
            uniqueUsers: { $addToSet: '$user' }
          }
        },
        {
          $project: {
            technique: '$_id',
            totalSessions: 1,
            avgCycles: 1,
            participantCount: { $size: '$uniqueUsers' }
          }
        }
      ]);

      res.status(200).json(new ApiResponse(200, { insights: stats }));
    }
  );
}

export default OrgController;
