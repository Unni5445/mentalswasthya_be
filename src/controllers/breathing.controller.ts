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
        durationSeconds: Number(durationSeconds) || 180,
        startedBy: startedBy || 'manual'
      });
      res.status(201).json(new ApiResponse(201, { sessionId: session._id, session }, 'Session started'));
    }
  );

  static completeSession = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { sessionId } = req.params;
      const { cyclesCompleted, completedSeconds } = req.body;
      const result = await breathingService.completeSession(
        sessionId,
        req.user._id,
        Number(cyclesCompleted) || 0,
        completedSeconds !== undefined && completedSeconds !== null ? Number(completedSeconds) : undefined
      );
      res.status(200).json(new ApiResponse(200, result, 'Session completed'));
    }
  );

  static getHistory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await breathingService.getSessionHistory(req.user._id, limit);
      res.status(200).json(new ApiResponse(200, { history, sessions: history }, 'Breathing history retrieved'));
    }
  );
}

export default BreathingController;
