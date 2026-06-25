import { Response, Request } from 'express';
import { Affirmation, AuditLog, User } from '../models';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import fs from 'fs';
import path from 'path';

class AffirmationController {
  static uploadAffirmation = asyncHandler(
    async (req: Request, res: Response) => {
      const { title, artist, category, language, isActive } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || !files.audio) {
        throw { status: 400, message: 'Audio file is required' };
      }

      if (!language) {
        throw { status: 400, message: 'Language is required' };
      }

      const audioUrl = `/uploads/affirmation/${files.audio[0].filename}`;
      const thumbnailUrl = files.thumbnail ? `/uploads/affirmation/${files.thumbnail[0].filename}` : undefined;

      const affirmation = await Affirmation.create({
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
        action: 'affirmation_uploaded',
        targetModel: 'Affirmation',
        targetId: affirmation._id,
        meta: { title: affirmation.title }
      });

      res.status(201).json(new ApiResponse(201, { affirmation }, 'Affirmation uploaded successfully'));
    }
  );

  static getAllAffirmations = asyncHandler(
    async (req: Request, res: Response) => {
      const { language } = req.query;
      const filter: any = { isActive: true };
      
      if (language) {
        filter.language = language;
      }
      
      const affirmations = await Affirmation.find(filter).sort({ createdAt: -1 });
      res.status(200).json(new ApiResponse(200, { affirmations }));
    }
  );

  static toggleFavorite = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const user = await User.findById(req.user._id);
      if (!user) throw { status: 404, message: 'User not found' };

      const affirmation = await Affirmation.findById(id);
      if (!affirmation) throw { status: 404, message: 'Affirmation not found' };

      const index = user.favoriteAffirmations.indexOf(affirmation._id as any);
      let isFavorited = false;
      if (index === -1) {
        user.favoriteAffirmations.push(affirmation._id as any);
        isFavorited = true;
      } else {
        user.favoriteAffirmations.splice(index, 1);
      }

      await user.save();
      res.status(200).json(new ApiResponse(200, { isFavorited, favoriteAffirmations: user.favoriteAffirmations }, 'Favorite status updated'));
    }
  );

  static getFavorites = asyncHandler(
    async (req: Request, res: Response) => {
      const user = await User.findById(req.user._id).populate({
        path: 'favoriteAffirmations',
        match: { isActive: true }
      });
      if (!user) throw { status: 404, message: 'User not found' };

      res.status(200).json(new ApiResponse(200, { affirmations: user.favoriteAffirmations }));
    }
  );

  static deleteAffirmation = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const affirmation = await Affirmation.findById(id);
      if (!affirmation) {
        throw { status: 404, message: 'Affirmation not found' };
      }

      const audioPath = path.join(process.cwd(), affirmation.audioUrl);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      if (affirmation.thumbnailUrl) {
        const thumbPath = path.join(process.cwd(), affirmation.thumbnailUrl);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }

      await Affirmation.findByIdAndDelete(id);

      await AuditLog.create({
        actor: req.user._id,
        action: 'affirmation_deleted',
        targetModel: 'Affirmation',
        targetId: affirmation._id,
        meta: { title: affirmation.title }
      });

      res.status(200).json(new ApiResponse(200, null, 'Affirmation deleted successfully'));
    }
  );
}

export default AffirmationController;
