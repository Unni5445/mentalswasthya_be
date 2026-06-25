import { Router } from 'express';
import MeditationController from '../controllers/meditation.controller';
import { protect } from '../middlewares/protect.middleware';
import { meditationUpload } from '../middlewares/meditationUpload.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Meditation
 *   description: Meditation audio management
 */

router.use(protect);

/**
 * @swagger
 * /api/meditation/upload:
 *   post:
 *     summary: Upload new meditation (audio and thumbnail)
 *     tags: [Meditation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               artist: { type: string }
 *               language: { type: string }
 *               category: { type: string }
 *               isActive: { type: string, enum: [true, false] }
 *               audio: { type: string, format: binary }
 *               thumbnail: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Meditation uploaded successfully
 */
router.post(
  '/upload',
  meditationUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  MeditationController.uploadMeditation
);

/**
 * @swagger
 * /api/meditation:
 *   get:
 *     summary: Get all active meditations
 *     tags: [Meditation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter meditations by language
 *     responses:
 *       200:
 *         description: List of meditations
 */
router.get('/', MeditationController.getAllMeditations);

/**
 * @swagger
 * /api/meditation/favorites:
 *   get:
 *     summary: Get user's favorite meditations
 *     tags: [Meditation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite meditations
 */
router.get('/favorites', MeditationController.getFavorites);

/**
 * @swagger
 * /api/meditation/{id}/favorite:
 *   post:
 *     summary: Toggle favorite status for a meditation
 *     tags: [Meditation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite status updated
 */
router.post('/:id/favorite', MeditationController.toggleFavorite);

/**
 * @swagger
 * /api/meditation/{id}:
 *   delete:
 *     summary: Delete meditation track
 *     tags: [Meditation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meditation deleted successfully
 */
router.delete('/:id', MeditationController.deleteMeditation);

export default router;
