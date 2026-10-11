import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { protect } from '../middlewares/protect.middleware';

const router = Router();

router.get('/profile', protect, UserController.getProfile);
router.put('/profile', protect, UserController.updateProfile);
router.get('/streak', protect, UserController.getStreak);

export default router;
