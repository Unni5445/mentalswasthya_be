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

  static getCustomPresets = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const presets = await breathingService.getCustomPresets(req.user._id);
      res.status(200).json(new ApiResponse(200, presets, 'Custom breathing presets retrieved'));
    }
  );

  static saveCustomPreset = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { shape, name, timingLabel, inhale, hold1, exhale, hold2 } = req.body;
      if (!shape || !['triangle', 'box', 'circle'].includes(shape)) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, 'Valid shape (triangle, box, or circle) is required'));
      }
      const result = await breathingService.saveCustomPreset(req.user._id, {
        shape,
        name,
        timingLabel,
        inhale,
        hold1,
        exhale,
        hold2,
      });
      res.status(201).json(new ApiResponse(201, result, 'Custom breathing preset saved in database'));
    }
  );

  static deleteCustomPreset = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const result = await breathingService.deleteCustomPreset(id, req.user._id);
      if (!result) {
        return res.status(404).json(new ApiResponse(404, null, 'Custom preset not found'));
      }
      res.status(200).json(new ApiResponse(200, result, 'Custom breathing preset deleted'));
    }
  );
}

export default BreathingController;
