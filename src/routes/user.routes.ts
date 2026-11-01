import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { protect } from '../middlewares/protect.middleware';
import { profilePhotoUpload } from '../middlewares/profilePhotoUpload.middleware';

const router = Router();

router.get('/profile', protect, UserController.getProfile);
router.put('/profile', protect, UserController.updateProfile);
router.post('/profile/photo', protect, profilePhotoUpload.single('photo'), UserController.uploadPhoto);
router.get('/streak', protect, UserController.getStreak);
router.delete('/account', protect, UserController.deleteAccount);

export default router;
