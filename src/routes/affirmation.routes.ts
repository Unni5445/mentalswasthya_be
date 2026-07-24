import { Router } from 'express';
import AffirmationController from '../controllers/affirmation.controller';
import { protect } from '../middlewares/protect.middleware';
import { affirmationUpload } from '../middlewares/affirmationUpload.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Affirmation
 *   description: Affirmation audio management
 */

router.use(protect);

/**
 * @swagger
 * /api/affirmation/upload:
 *   post:
 *     summary: Upload new affirmation (audio and thumbnail)
 *     tags: [Affirmation]
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
 *         description: Affirmation uploaded successfully
 */
router.post(
  '/upload',
  affirmationUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  AffirmationController.uploadAffirmation
);

router.post(
  '/',
  affirmationUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  AffirmationController.uploadAffirmation
);

/**
 * @swagger
 * /api/affirmation:
 *   get:
 *     summary: Get all active affirmations
 *     tags: [Affirmation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter affirmations by language
 *     responses:
 *       200:
 *         description: List of affirmations
 */
router.get('/', AffirmationController.getAllAffirmations);

/**
 * @swagger
 * /api/affirmation/favorites:
 *   get:
 *     summary: Get user's favorite affirmations
 *     tags: [Affirmation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite affirmations
 */
router.get('/favorites', AffirmationController.getFavorites);

/**
 * @swagger
 * /api/affirmation/{id}/favorite:
 *   post:
 *     summary: Toggle favorite status for an affirmation
 *     tags: [Affirmation]
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
router.post('/:id/favorite', AffirmationController.toggleFavorite);

/**
 * @swagger
 * /api/affirmation/{id}:
 *   delete:
 *     summary: Delete affirmation track
 *     tags: [Affirmation]
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
 *         description: Affirmation deleted successfully
 */
router.delete('/:id', AffirmationController.deleteAffirmation);

export default router;
