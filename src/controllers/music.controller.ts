import { Response, Request } from 'express';
import { Music, AuditLog } from '../models';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import fs from 'fs';
import path from 'path';

class MusicController {
  static uploadMusic = asyncHandler(
    async (req: Request, res: Response) => {
      const { title, artist, category, shape, isPublic } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || !files.audio) {
        throw { status: 400, message: 'Audio file is required' };
      }

      const audioUrl = `/uploads/music/${files.audio[0].filename}`;
      const thumbnailUrl = files.thumbnail ? `/uploads/music/${files.thumbnail[0].filename}` : undefined;

      const music = await Music.create({
        user: req.user._id,
        title,
        artist,
        category,
        shape,
        isPublic: isPublic === 'true' || isPublic === true,
        audioUrl,
        thumbnailUrl
      });

      await AuditLog.create({
        actor: req.user._id,
        action: 'music_uploaded',
        targetModel: 'Music',
        targetId: music._id,
        meta: { title: music.title }
      });

      res.status(201).json(new ApiResponse(201, { music }, 'Music uploaded successfully'));
    }
  );

  static getMyMusic = asyncHandler(
    async (req: Request, res: Response) => {
      const music = await Music.find({ user: req.user._id }).sort({ createdAt: -1 });
      res.status(200).json(new ApiResponse(200, { music }));
    }
  );

  static deleteMusic = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const music = await Music.findOne({ _id: id, user: req.user._id });
      if (!music) {
        throw { status: 404, message: 'Music not found or unauthorized' };
      }

      // Delete files
      const audioPath = path.join(process.cwd(), music.audioUrl);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      if (music.thumbnailUrl) {
        const thumbPath = path.join(process.cwd(), music.thumbnailUrl);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }

      await Music.findByIdAndDelete(id);

      await AuditLog.create({
        actor: req.user._id,
        action: 'music_deleted',
        targetModel: 'Music',
        targetId: music._id,
        meta: { title: music.title }
      });

      res.status(200).json(new ApiResponse(200, null, 'Music deleted successfully'));
    }
  );

  static getPublicMusic = asyncHandler(
    async (req: Request, res: Response) => {
      const music = await Music.find({ isPublic: true }).sort({ createdAt: -1 });
      res.status(200).json(new ApiResponse(200, { music }));
    }
  );

  static getMusicByShape = asyncHandler(
    async (req: Request, res: Response) => {
      const { shape } = req.params;
      const music = await Music.find({ shape, isPublic: true }).sort({ createdAt: -1 });
      res.status(200).json(new ApiResponse(200, { music }));
    }
  );
}

export default MusicController;
