import { Response, Request } from 'express';
import { Meditation, AuditLog, User } from '../models';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import fs from 'fs';
import path from 'path';

class MeditationController {
  static uploadMeditation = asyncHandler(
    async (req: Request, res: Response) => {
      const { title, artist, category, language, isActive } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || !files.audio) {
        throw { status: 400, message: 'Audio file is required' };
      }

      if (!language) {
        throw { status: 400, message: 'Language is required' };
      }

      const audioUrl = `/uploads/meditation/${files.audio[0].filename}`;
      const thumbnailUrl = files.thumbnail ? `/uploads/meditation/${files.thumbnail[0].filename}` : undefined;

      const meditation = await Meditation.create({
        title,
        artist,
        category,
        language,
        isActive: isActive !== 'false' && isActive !== false,
        audioUrl,
        thumbnailUrl
      });

      await AuditLog.create({
        actor: req.user._id,
        action: 'meditation_uploaded',
        targetModel: 'Meditation',
        targetId: meditation._id,
        meta: { title: meditation.title }
      });

      res.status(201).json(new ApiResponse(201, { meditation }, 'Meditation uploaded successfully'));
    }
  );

  static getAllMeditations = asyncHandler(
    async (req: Request, res: Response) => {
      const { language } = req.query;
      const filter: any = { isActive: true };
      
      if (language) {
        filter.language = language;
      }
      
      const meditations = await Meditation.find(filter).sort({ createdAt: -1 });
      res.status(200).json(new ApiResponse(200, { meditations }));
    }
  );

  static toggleFavorite = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const user = await User.findById(req.user._id);
      if (!user) throw { status: 404, message: 'User not found' };

      const meditation = await Meditation.findById(id);
      if (!meditation) throw { status: 404, message: 'Meditation not found' };

      const index = user.favoriteMeditations.indexOf(meditation._id as any);
      let isFavorited = false;
      if (index === -1) {
        user.favoriteMeditations.push(meditation._id as any);
        isFavorited = true;
      } else {
        user.favoriteMeditations.splice(index, 1);
      }

      await user.save();
      res.status(200).json(new ApiResponse(200, { isFavorited, favoriteMeditations: user.favoriteMeditations }, 'Favorite status updated'));
    }
  );

  static getFavorites = asyncHandler(
    async (req: Request, res: Response) => {
      const user = await User.findById(req.user._id).populate({
        path: 'favoriteMeditations',
        match: { isActive: true }
      });
      if (!user) throw { status: 404, message: 'User not found' };

      res.status(200).json(new ApiResponse(200, { meditations: user.favoriteMeditations }));
    }
  );

  static deleteMeditation = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const meditation = await Meditation.findById(id);
      if (!meditation) {
        throw { status: 404, message: 'Meditation not found' };
      }

      const audioPath = path.join(process.cwd(), meditation.audioUrl);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      if (meditation.thumbnailUrl) {
        const thumbPath = path.join(process.cwd(), meditation.thumbnailUrl);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }

      await Meditation.findByIdAndDelete(id);

      await AuditLog.create({
        actor: req.user._id,
        action: 'meditation_deleted',
        targetModel: 'Meditation',
        targetId: meditation._id,
        meta: { title: meditation.title }
      });

      res.status(200).json(new ApiResponse(200, null, 'Meditation deleted successfully'));
    }
  );
}

export default MeditationController;
