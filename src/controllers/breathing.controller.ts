import { Response, NextFunction, Request } from 'express';
import * as breathingService from '../services/breathing.service';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';

class BreathingController {
  static startSession = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { technique, shape, durationSeconds, startedBy } = req.body;
      const session = await breathingService.startSession({
        user: req.user._id,
        org: req.user.org?._id,
        technique: technique || null,
        shape: shape || null,
        durationSeconds,
        startedBy: startedBy || 'manual'
      });
      res.status(201).json(new ApiResponse(201, { session }));
    }
  );

  static completeSession = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { sessionId } = req.params;
      const { cyclesCompleted } = req.body;
      const result = await breathingService.completeSession(sessionId, req.user._id, cyclesCompleted);
      res.status(200).json(new ApiResponse(200, result));
    }
  );

  static getHistory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await breathingService.getSessionHistory(req.user._id, limit);
      res.status(200).json(new ApiResponse(200, { history }));
    }
  );
}

export default BreathingController;
