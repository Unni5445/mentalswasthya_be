import { Router } from 'express';
import MusicController from '../controllers/music.controller';
import { protect } from '../middlewares/protect.middleware';
import { musicUpload } from '../middlewares/musicUpload.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Music
 *   description: Music and audio management
 */

router.use(protect);

/**
 * @swagger
 * /api/music/upload:
 *   post:
 *     summary: Upload new music (audio and thumbnail)
 *     tags: [Music]
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
 *               category: { type: string }
 *               shape: { type: string, enum: [box, triangle, circle] }
 *               isPublic: { type: string }
 *               audio: { type: string, format: binary }
 *               thumbnail: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Music uploaded
 */
router.post(
  '/upload',
  musicUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  MusicController.uploadMusic
);

/**
 * @swagger
 * /api/music/my:
 *   get:
 *     summary: Get user's uploaded music
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's music
 */
router.get('/my', MusicController.getMyMusic);

/**
 * @swagger
 * /api/music/public:
 *   get:
 *     summary: Get all public music
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of public music
 */
router.get('/public', MusicController.getPublicMusic);

/**
 * @swagger
 * /api/music/shape/{shape}:
 *   get:
 *     summary: Get public music by shape
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shape
 *         required: true
 *         schema:
 *           type: string
 *           enum: [box, triangle, circle]
 *     responses:
 *       200:
 *         description: List of music by shape
 */
router.get('/shape/:shape', MusicController.getMusicByShape);

/**
 * @swagger
 * /api/music/{id}:
 *   delete:
 *     summary: Delete music track
 *     tags: [Music]
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
 *         description: Music deleted
 */
router.delete('/:id', MusicController.deleteMusic);

export default router;
